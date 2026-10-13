import math
import os
import re
import time
import uuid
from pathlib import Path
import torch
from pydantic import BaseModel, ConfigDict, Field
from .schemas import TrainingConfig
from .service import ServiceError, HISTORY_LIMIT
from .data import VOCABULARY, make_dataset, dataset_fingerprint
from .model import MiniTransformer

ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,79}\.pt$")


class Metric(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    epoch: int = Field(ge=0, le=300)
    step: int = Field(ge=0, le=153600)
    train_loss: float = Field(ge=0)
    validation_loss: float = Field(ge=0)
    train_token_accuracy: float = Field(ge=0, le=1)
    train_sequence_accuracy: float = Field(ge=0, le=1)
    validation_token_accuracy: float = Field(ge=0, le=1)
    validation_sequence_accuracy: float = Field(ge=0, le=1)
    learning_rate: float = Field(ge=0.00001, le=0.02)
    elapsed_seconds: float = Field(ge=0)


def root(service):
    service.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    return service.checkpoint_dir.resolve()


def path_for(service, checkpoint_id):
    if not ID.fullmatch(checkpoint_id):
        raise ServiceError("invalid_checkpoint", "Checkpoint ID 不合法。", 422)
    base = root(service)
    path = base / checkpoint_id
    if path.is_symlink() or path.resolve().parent != base:
        raise ServiceError("invalid_checkpoint", "Checkpoint 路径不合法。", 422)
    return path


def list_checkpoints(service):
    with service.lock:
        base = root(service)
        files = [p for p in base.glob("*.pt") if ID.fullmatch(p.name) and not p.is_symlink()]
        return [{"id": p.name, "bytes": p.stat().st_size, "modified_at": p.stat().st_mtime} for p in sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)[:50]]


def save(service, name):
    with service.lock:
        service._ensure_quiet()
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,31}", name):
            raise ServiceError("invalid_checkpoint", "名称只允许小写字母、数字、下划线和连字符。", 422)
        if len(list_checkpoints(service)) >= 50:
            raise ServiceError("checkpoint_limit", "最多保存 50 份，请先自行整理 checkpoints 目录。")
        checkpoint_id = f"{name}-{time.strftime('%Y%m%d-%H%M%S', time.gmtime())}-{uuid.uuid4().hex[:8]}.pt"
        destination = path_for(service, checkpoint_id)
        temporary = root(service) / (uuid.uuid4().hex + ".tmp")
        payload = {
            "schema_version": 1, "torch_version": str(torch.__version__), "vocabulary": VOCABULARY,
            "config": service.config.model_dump(), "model": service._weights(), "initial_model": service.initial_weights,
            "optimizer": service.optimizer.state_dict(), "epoch": service.epoch, "step": service.step, "cursor": service.cursor,
            "accumulator": service.accumulator, "history": list(service.history), "elapsed_seconds": service.elapsed_seconds,
            "rng": service.rng, "cuda_rng": service.cuda_rng, "dataset_fingerprint": service.fingerprint,
            "batch_order_seed": service.config.seed + service.epoch,
        }
        try:
            with temporary.open("xb") as output:
                torch.save(payload, output)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)
        return {"id": checkpoint_id, "step": service.step, "epoch": service.epoch}


def _finite_tensors(value):
    if isinstance(value, torch.Tensor):
        if value.layout != torch.strided or value.numel() > 2000000 or not torch.isfinite(value).all():
            raise ValueError("invalid checkpoint tensor")
    elif isinstance(value, dict):
        for item in value.values():
            _finite_tensors(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            _finite_tensors(item)
    elif isinstance(value, float) and not math.isfinite(value):
        raise ValueError("non-finite checkpoint scalar")


def load(service, request):
    with service.condition:
        service._ensure_quiet()
        if service.state == "paused":
            raise ServiceError("training_paused", "请先停止当前任务，再加载 Checkpoint。")
        service._ensure_worker_finished()
        path = path_for(service, request.checkpoint_id)
        if not path.is_file():
            raise ServiceError("checkpoint_missing", "找不到该 Checkpoint。", 404)
        if path.stat().st_size > 64 * 1024 * 1024:
            raise ServiceError("checkpoint_limit", "Checkpoint 超过 64MB 教学上限。", 422)
        try:
            # No arbitrary pickle globals or user-selected filesystem paths.
            data = torch.load(path, map_location="cpu", weights_only=True)
            if not isinstance(data, dict) or data["schema_version"] != 1 or data["vocabulary"] != VOCABULARY:
                raise ValueError("unsupported schema or vocabulary")
            config = TrainingConfig.model_validate(data["config"])
            if request.expected_model is not None and config.model != request.expected_model:
                raise ValueError("model config does not match expected_model")
            if config.device == "cuda" and not torch.cuda.is_available():
                raise ValueError("CUDA checkpoint requires compatible GPU; use CPU training on this installation")
            _finite_tensors(data)
            with torch.random.fork_rng(devices=[]):
                model = MiniTransformer(config.model).to(config.device)
            model.load_state_dict(data["model"], strict=True)
            baseline = MiniTransformer(config.model)
            baseline.load_state_dict(data["initial_model"], strict=True)
            optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
            optimizer.load_state_dict(data["optimizer"])
            if any(group["lr"] != config.learning_rate or tuple(group["betas"]) != (0.9, 0.999) for group in optimizer.param_groups):
                raise ValueError("optimizer configuration mismatch")
            train, validation = make_dataset(config.dataset, config.seed)
            if dataset_fingerprint(train, validation) != data["dataset_fingerprint"]:
                raise ValueError("dataset mismatch")
            epoch, step, cursor = data["epoch"], data["step"], data["cursor"]
            if any(type(n) is not int for n in (epoch, step, cursor)) or not 0 <= epoch <= config.epochs or not 0 <= cursor < len(train) or cursor % config.batch_size:
                raise ValueError("invalid training cursor")
            if step != epoch * math.ceil(len(train)/config.batch_size) + cursor//config.batch_size:
                raise ValueError("step/cursor mismatch")
            if data["batch_order_seed"] != config.seed + epoch:
                raise ValueError("batch RNG configuration mismatch")
            accumulator = data["accumulator"]
            if not isinstance(accumulator, list) or len(accumulator) != 5 or accumulator[4] != cursor or any(not isinstance(n, (float, int)) or not math.isfinite(n) or n < 0 for n in accumulator):
                raise ValueError("invalid partial epoch")
            if not isinstance(data["rng"], torch.Tensor) or data["rng"].dtype != torch.uint8:
                raise ValueError("invalid RNG state")
            generator = torch.Generator()
            generator.set_state(data["rng"])
            if len(data["history"]) > HISTORY_LIMIT:
                raise ValueError("history limit exceeded")
            history = [Metric.model_validate(record).model_dump() for record in data["history"]]
            if any(record["epoch"] > epoch or record["step"] > step for record in history):
                raise ValueError("future metrics")
            elapsed = data["elapsed_seconds"]
            if not isinstance(elapsed, (float, int)) or not math.isfinite(elapsed) or elapsed < 0:
                raise ValueError("invalid elapsed time")
        except Exception as error:
            raise ServiceError("checkpoint_incompatible", "Checkpoint 格式、模型配置或训练状态不兼容；当前模型未替换。", 422) from error
        # Commit only after every check, leaving the previous model intact on failure.
        from collections import deque
        service.config, service.device = config, torch.device(config.device)
        service.model, service.optimizer = model, optimizer
        service.train, service.validation = train, validation
        service.fingerprint, service.initial_weights = data["dataset_fingerprint"], data["initial_model"]
        service.epoch, service.step, service.cursor = epoch, step, cursor
        service.accumulator, service.history = accumulator, deque(history, maxlen=HISTORY_LIMIT)
        service.rng, service.cuda_rng = data["rng"], data["cuda_rng"]
        service.elapsed_seconds, service.current_loss, service.error = elapsed, history[-1]["train_loss"] if history else None, None
        service.worker = None
        service.session_id = str(time.time_ns())
        service.state = "completed" if epoch == config.epochs else "paused"
        return service.status()
