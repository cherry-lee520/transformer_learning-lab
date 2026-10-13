"""Run real CPU acceptance independently of browser mocks."""
import argparse
import json
from pathlib import Path
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import torch
from app.service import TrainingService
from app.schemas import TrainingConfig, GenerateRequest, LoadRequest
from app import checkpoints


def run(mode, output):
    torch.set_num_threads(1)
    config = TrainingConfig() if mode == "convergence" else TrainingConfig.model_validate({"epochs": 2, "dataset": {"train_samples": 32, "validation_samples": 16, "max_length": 3}})
    service = TrainingService()
    start = time.perf_counter()
    before = service._weights()
    service.start(config)
    last_epoch = -1
    try:
        while True:
            status = service.status()
            if status["epoch"] // 10 != last_epoch:
                last_epoch = status["epoch"] // 10
                print(json.dumps({"epoch": status["epoch"], "step": status["step"], "latest": status["latest"]}), flush=True)
            if status["state"] in ("completed", "failed", "stopped"):
                break
            if time.perf_counter()-start > 600:
                raise RuntimeError("CPU acceptance exceeded 600 seconds")
            time.sleep(0.05)
        service.close()
        status = service.status()
        if status["state"] != "completed":
            raise RuntimeError("training did not complete")
        inference = service.generate(GenerateRequest(text="A B C D" if mode == "convergence" else "A B", compare_initial=False))
        saved = checkpoints.save(service, "acceptance-"+mode)
        predictions = inference["current"]["generated_tokens"]
        original_weights = service._weights()
        checkpoints.load(service, LoadRequest(checkpoint_id=saved["id"]))
        restored = service.generate(GenerateRequest(text="A B C D" if mode == "convergence" else "A B", compare_initial=False))
        result = {"mode": mode, "python": sys.version, "torch": str(torch.__version__), "config": config.model_dump(),
                  "status": status, "wall_seconds": time.perf_counter()-start, "metrics": service.metrics()["history"],
                  "parameters_changed": any(not torch.equal(before[k],v) for k,v in original_weights.items()),
                  "inference": inference, "checkpoint": saved, "checkpoint_weights_equal": all(torch.equal(original_weights[k],v) for k,v in service._weights().items()),
                  "checkpoint_prediction_equal": predictions == restored["current"]["generated_tokens"]}
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"mode":mode,"epoch":status["epoch"],"step":status["step"],"seconds":result["wall_seconds"],"latest":status["latest"],"generated":predictions,"checkpoint":saved["id"]}), flush=True)
        assert result["parameters_changed"] and result["checkpoint_weights_equal"] and result["checkpoint_prediction_equal"]
        if mode == "convergence":
            assert status["latest"]["validation_sequence_accuracy"] >= 0.9, "actual validation accuracy below acceptance threshold"
    finally:
        service.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["smoke","convergence"], default="smoke")
    parser.add_argument("--output", type=Path, default=Path("../docs/validation/t10/smoke.json"))
    args = parser.parse_args()
    run(args.mode, args.output)
