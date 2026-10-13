import copy
import logging
import math
import threading
import time
from collections import deque
from pathlib import Path
import numpy as np
import torch
from .schemas import TrainingConfig
from .data import VOCABULARY, make_dataset, dataset_fingerprint, collate, preview, encode_text
from .model import MiniTransformer
from .engine import evaluate, loss_and_counts, inspect_generation

LOG = logging.getLogger(__name__)
HISTORY_LIMIT = 300


class ServiceError(Exception):
    def __init__(self, code, message, status=409):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


class TrainingService:
    """One local model / one worker. Condition lock is an acknowledged batch boundary."""
    def __init__(self, checkpoint_dir=None):
        self.lock = threading.RLock()
        self.condition = threading.Condition(self.lock)
        self.worker = None
        self.checkpoint_dir = Path(checkpoint_dir or Path(__file__).resolve().parents[1] / "checkpoints")
        self.state = "idle"
        self._initialize(TrainingConfig())

    def _initialize(self, config):
        if config.device == "cuda" and not torch.cuda.is_available():
            raise ServiceError("device_unavailable", "未检测到兼容 CUDA GPU，请选择 CPU。", 422)
        self.config = config
        self.device = torch.device(config.device)
        # Initialization does not change another session's CPU RNG stream.
        with torch.random.fork_rng(devices=[]):
            torch.manual_seed(config.seed)
            self.model = MiniTransformer(config.model).to(self.device)
            self.rng = torch.get_rng_state().clone()
        self.cuda_rng = torch.cuda.get_rng_state_all() if config.device == "cuda" else []
        self.initial_weights = self._weights()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=config.learning_rate)
        self.train, self.validation = make_dataset(config.dataset, config.seed)
        self.fingerprint = dataset_fingerprint(self.train, self.validation)
        self.epoch, self.step, self.cursor = 0, 0, 0
        self.accumulator = [0.0, 0, 0, 0, 0]
        self.history = deque(maxlen=HISTORY_LIMIT)
        self.elapsed_seconds = 0.0
        self.current_loss = None
        self.error = None
        self.state = "idle"
        self.session_id = str(time.time_ns())

    def _weights(self):
        return {key: value.detach().cpu().clone() for key, value in self.model.state_dict().items()}

    def _ensure_quiet(self):
        if self.state == "running":
            raise ServiceError("training_running", "请先暂停或停止训练，再执行此操作。")

    def _ensure_worker_finished(self):
        if self.worker and self.worker.is_alive():
            raise ServiceError("worker_busy", "现有任务尚未结束；暂停任务请用恢复，停止后请稍后重试。")

    def start(self, config):
        with self.condition:
            self._ensure_worker_finished()
            self._initialize(config)
            self.state = "running"
            self.worker = threading.Thread(target=self._run, name="mini-transformer-training", daemon=False)
            self.worker.start()
            return self.status()

    def pause(self):
        with self.condition:
            if self.state != "running":
                raise ServiceError("invalid_state", "只有运行中的训练可以暂停。")
            self.state = "paused"
            # Acquiring this lock waits for the active batch; no update after reply.
            return self.status()

    def resume(self):
        with self.condition:
            if self.state not in ("paused", "stopped"):
                raise ServiceError("invalid_state", "只有暂停/停止且未完成的任务可以恢复。")
            if self.epoch >= self.config.epochs:
                raise ServiceError("already_completed", "已完成设定 Epoch，请开始新任务。")
            if self.worker and self.worker.is_alive() and self.state == "stopped":
                raise ServiceError("worker_busy", "停止中的线程尚未结束，请稍后恢复。")
            self.state = "running"
            if not self.worker or not self.worker.is_alive():
                self.worker = threading.Thread(target=self._run, name="mini-transformer-training", daemon=False)
                self.worker.start()
            self.condition.notify_all()
            return self.status()

    def stop(self):
        with self.condition:
            if self.state in ("running", "paused"):
                self.state = "stopped"
            self.condition.notify_all()
            return self.status()

    def reset(self, config=None):
        with self.condition:
            self._ensure_quiet()
            if self.state == "paused":
                raise ServiceError("training_paused", "请先停止暂停任务，再重置。")
            self._ensure_worker_finished()
            self._initialize(config or self.config)
            return self.status()

    def close(self):
        self.stop()
        worker = self.worker
        if worker:
            worker.join(timeout=10)
            if worker.is_alive():
                LOG.error("training worker failed to terminate within timeout")

    def status(self):
        with self.lock:
            return {
                "session_id": self.session_id, "state": self.state, "epoch": self.epoch, "step": self.step,
                "total_steps": math.ceil(len(self.train)/self.config.batch_size)*self.config.epochs,
                "current_loss": self.current_loss, "latest": copy.deepcopy(self.history[-1]) if self.history else None,
                "elapsed_seconds": self.elapsed_seconds, "error": self.error,
                "config": self.config.model_dump(), "vocabulary": VOCABULARY,
                "dataset_fingerprint": self.fingerprint, "history_limit": HISTORY_LIMIT,
                "parameter_count": sum(p.numel() for p in self.model.parameters()),
            }

    def metrics(self):
        with self.lock:
            return {"session_id": self.session_id, "history": list(self.history)}

    def datasets(self):
        with self.lock:
            return {"config": self.config.dataset.model_dump(), "seed": self.config.seed, "fingerprint": self.fingerprint,
                    "train_count": len(self.train), "validation_count": len(self.validation), "train": preview(self.train), "validation": preview(self.validation)}

    def _metric(self, train_metrics, validation_metrics):
        return {"epoch": self.epoch, "step": self.step, "train_loss": train_metrics["loss"], "validation_loss": validation_metrics["loss"],
                "train_token_accuracy": train_metrics["token_accuracy"], "train_sequence_accuracy": train_metrics["sequence_accuracy"],
                "validation_token_accuracy": validation_metrics["token_accuracy"], "validation_sequence_accuracy": validation_metrics["sequence_accuracy"],
                "learning_rate": self.config.learning_rate, "elapsed_seconds": self.elapsed_seconds}

    def _run(self):
        try:
            while True:
                with self.condition:
                    while self.state == "paused":
                        self.condition.wait()
                    if self.state != "running":
                        break
                    began = time.perf_counter()
                    if not self.history:
                        initial_train = evaluate(self.model, self.train, self.config.batch_size, self.device, autoregressive=False)
                        initial_val = evaluate(self.model, self.validation, self.config.batch_size, self.device)
                        self.elapsed_seconds += time.perf_counter()-began
                        self.history.append(self._metric(initial_train, initial_val))
                        began = time.perf_counter()
                    if self.epoch >= self.config.epochs:
                        self.state = "completed"
                        break
                    self._batch()
                    self.elapsed_seconds += time.perf_counter()-began
                # Yield to pause/status requests even on very fast CPU batches.
                time.sleep(0.001)
        except Exception:
            LOG.exception("training failed")
            with self.condition:
                self.state, self.error = "failed", "训练计算失败，已停止。请检查本地后端日志或重置模型。"
                self.condition.notify_all()

    def _batch(self):
        order = np.random.default_rng(self.config.seed + self.epoch).permutation(len(self.train))
        indices = order[self.cursor:self.cursor+self.config.batch_size]
        batch = [self.train[int(i)] for i in indices]
        source, target, expected = collate(batch, self.device)
        self.model.train()
        torch.set_rng_state(self.rng)
        if self.cuda_rng:
            torch.cuda.set_rng_state_all(self.cuda_rng)
        self.optimizer.zero_grad(set_to_none=True)
        logits, _ = self.model(source, target)
        loss_sum, count, correct, sequences = loss_and_counts(logits, expected)
        loss = loss_sum/count
        if not torch.isfinite(loss):
            raise ValueError("non-finite loss")
        loss.backward()
        norm = torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config.gradient_clip, error_if_nonfinite=True)
        self.optimizer.step()
        self.rng = torch.get_rng_state().clone()
        if self.cuda_rng:
            self.cuda_rng = torch.cuda.get_rng_state_all()
        self.current_loss = float(loss.detach())
        self.gradient_norm = float(norm)
        self.step += 1
        self.cursor += len(batch)
        self.accumulator = [self.accumulator[0] + float(loss_sum.detach()), self.accumulator[1] + count, self.accumulator[2] + correct, self.accumulator[3] + sequences, self.accumulator[4] + len(batch)]
        if self.cursor == len(self.train):
            total, n, hits, seq, samples = self.accumulator
            training = {"loss": total/n, "token_accuracy": hits/n, "sequence_accuracy": seq/samples}
            validation = evaluate(self.model, self.validation, self.config.batch_size, self.device)
            self.epoch += 1
            self.cursor = 0
            self.accumulator = [0.0, 0, 0, 0, 0]
            self.history.append(self._metric(training, validation))
            if self.epoch >= self.config.epochs:
                self.state = "completed"

    def generate(self, request):
        with self.lock:
            content = encode_text(request.text, self.config.model.max_sequence_length-2)
            current = inspect_generation(self.model, content, request.max_tokens, request.top_k, self.device)
            initial = None
            if request.compare_initial:
                with torch.random.fork_rng(devices=[]):
                    baseline = MiniTransformer(self.config.model).to(self.device)
                baseline.load_state_dict(self.initial_weights)
                initial = inspect_generation(baseline, content, request.max_tokens, request.top_k, self.device)
            return {"model_step": self.step, "trained": self.step > 0, "task": self.config.dataset.task, "vocabulary": VOCABULARY, "current": current, "initial": initial}
