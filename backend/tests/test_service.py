import time
import pytest
import torch
from fastapi.testclient import TestClient
from app.schemas import TrainingConfig, GenerateRequest, LoadRequest
from app.service import ServiceError
from app.main import create_app
from app import checkpoints

SMALL={"model":{"d_model":8,"num_heads":2,"d_ff":16,"dropout":0.1},"dataset":{"train_samples":32,"validation_samples":16,"max_length":3},"batch_size":4,"epochs":10}


def wait(service,predicate,timeout=10):
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        status=service.status()
        if predicate(status):return status
        time.sleep(.005)
    raise AssertionError(service.status())


def joined(service):
    if service.worker:service.worker.join(5)


def test_pause_resume_stop_and_no_updates_after_ack(service):
    service.start(TrainingConfig.model_validate(SMALL))
    wait(service,lambda s:s["step"]>=2)
    paused=service.pause();before=service._weights();time.sleep(.03)
    assert service.status()["step"]==paused["step"]
    assert all(torch.equal(before[k],v) for k,v in service._weights().items())
    service.resume();wait(service,lambda s:s["step"]>paused["step"])
    stopped=service.stop();joined(service);time.sleep(.03)
    assert service.status()["step"]==stopped["step"]
    assert service.status()["state"]=="stopped"


def test_concurrent_training_protection(service):
    service.start(TrainingConfig.model_validate(SMALL))
    with pytest.raises(ServiceError):service.start(TrainingConfig())
    service.pause()
    with pytest.raises(ServiceError):service.start(TrainingConfig())
    with pytest.raises(ServiceError):service.reset()


def test_reset_after_stop(service):
    service.start(TrainingConfig.model_validate(SMALL));wait(service,lambda s:s["step"]>=1)
    service.stop();joined(service);service.reset()
    assert service.status()["step"]==0 and service.status()["state"]=="idle"


def test_checkpoint_exact_optimizer_cursor_rng_resume(service):
    service.start(TrainingConfig.model_validate(SMALL))
    wait(service,lambda s:s["step"]>=2);service.pause()
    saved=checkpoints.save(service,"resume")
    # One deterministic update from the checkpoint as independent reference.
    with service.lock:
        service._batch()
        expected=service._weights()
        expected_step=service.step
    service.stop();joined(service)
    restored=checkpoints.load(service,LoadRequest(checkpoint_id=saved["id"]))
    assert restored["state"]=="paused"
    with service.lock:service._batch()
    assert service.step==expected_step
    assert all(torch.equal(expected[k],v) for k,v in service._weights().items())
    assert len(service.optimizer.state)>0
    service.resume();wait(service,lambda s:s["step"]>expected_step)
    service.stop();joined(service)


def test_checkpoint_atomic_safe_paths_and_incompatible(service):
    saved=checkpoints.save(service,"safe")
    assert len(checkpoints.list_checkpoints(service))==1
    assert not list(service.checkpoint_dir.glob("*.tmp"))
    before=service._weights()
    data=torch.load(service.checkpoint_dir/saved["id"],weights_only=True)
    data["schema_version"]=999;torch.save(data,service.checkpoint_dir/"bad.pt")
    with pytest.raises(ServiceError):checkpoints.load(service,LoadRequest(checkpoint_id="bad.pt"))
    assert all(torch.equal(before[k],v) for k,v in service._weights().items())
    with pytest.raises(ServiceError):checkpoints.path_for(service,"../app/main.py")
    with pytest.raises(ServiceError):checkpoints.save(service,"../../main")
    with pytest.raises(ServiceError):checkpoints.load(service,LoadRequest(checkpoint_id=saved["id"],expected_model={"d_model":8}))


def test_checkpoint_running_rejected(service):
    service.start(TrainingConfig.model_validate(SMALL))
    with pytest.raises(ServiceError):checkpoints.save(service,"busy")


def test_training_failure_is_sanitized_and_worker_exits(service):
    def fail():raise RuntimeError("sensitive internal detail")
    service._batch=fail
    service.start(TrainingConfig.model_validate(SMALL))
    status=wait(service,lambda s:s["state"]=="failed")
    assert "sensitive" not in status["error"]
    joined(service);assert not service.worker.is_alive()


def test_metrics_bounded_and_datasets_real(service):
    assert service.status()["history_limit"]==300
    for i in range(350):service.history.append({"epoch":i})
    assert len(service.metrics()["history"])==300
    data=service.datasets()
    assert data["train_count"]==1024 and data["validation_count"]==128
    assert data["train"][0]["source"]==data["train"][0]["target"]


def test_untrained_inference_real_probabilities_attention_and_initial(service):
    result=service.generate(GenerateRequest(text="A B",max_tokens=3))
    assert result["trained"] is False and result["model_step"]==0
    assert result["current"]==result["initial"]
    for step in result["current"]["steps"]:
        assert sum(step["probabilities"])==pytest.approx(1,abs=1e-6)
        assert step["chosen_id"]==max(range(12),key=lambda i:step["logits"][i])
    assert len(result["current"]["encoder_self"][0])==4
    with pytest.raises(ValueError):service.generate(GenerateRequest(text="UNKNOWN"))


def test_api_health_and_validation(service):
    with TestClient(create_app(service)) as client:
        assert client.get("/api/v1/health").json()["default_device"]=="cpu"
        assert client.get("/api/v1/model/config").status_code==200
        assert client.get("/api/v1/datasets").json()["train_count"]==1024
        for payload in ({"epochs":10000},{"model":{"d_model":1024}},{"learning_rate":float("inf")},{"dataset":{"max_length":11}}):
            # JSON cannot encode Infinity; test string validation rather than JSON encoder.
            if payload.get("learning_rate")==float("inf"):payload={"learning_rate":"Infinity"}
            response=client.post("/api/v1/training/start",json=payload)
            assert response.status_code==422 and response.json()["error"]["code"]=="validation_error"
        assert client.post("/api/v1/inference/generate",json={"text":"bad"}).status_code==422
        assert client.post("/api/v1/checkpoints/load",json={"checkpoint_id":"../evil.pt"}).status_code==422
        assert client.post("/api/v1/training/start",json=SMALL,headers={"Origin":"https://evil.example"}).status_code==403


def test_api_start_pause_resume_stop_refresh_checkpoint(service):
    with TestClient(create_app(service)) as client:
        assert client.post("/api/v1/training/start",json=SMALL).status_code==200
        wait(service,lambda s:s["step"]>=1)
        assert client.post("/api/v1/training/start",json=SMALL).status_code==409
        assert client.post("/api/v1/training/pause").json()["state"]=="paused"
        saved=client.post("/api/v1/checkpoints/save",json={"name":"api"}).json()
        assert client.get("/api/v1/checkpoints").json()["checkpoints"][0]["id"]==saved["id"]
        assert client.post("/api/v1/training/resume").json()["state"]=="running"
        assert client.post("/api/v1/training/stop").json()["state"]=="stopped"
        joined(service)
        loaded=client.post("/api/v1/checkpoints/load",json={"checkpoint_id":saved["id"]})
        assert loaded.status_code==200 and loaded.json()["state"]=="paused"
        # A fresh client/page queries the actual same backend state.
        assert client.get("/api/v1/training/status").json()["step"]==loaded.json()["step"]
        response=client.post("/api/v1/inference/generate",json={"text":"A B","max_tokens":2})
        assert response.status_code==200 and len(response.json()["current"]["steps"])<=2
        client.post("/api/v1/training/stop");joined(service)
        assert client.post("/api/v1/training/reset",json=SMALL).json()["state"]=="idle"


def test_api_exception_never_exposes_traceback(service):
    def broken():raise RuntimeError("private traceback details")
    service.datasets=broken
    with TestClient(create_app(service),raise_server_exceptions=False) as client:
        response=client.get("/api/v1/datasets")
        assert response.status_code==500
        assert response.json()["error"]["code"]=="internal_error"
        assert "private" not in response.text and "Traceback" not in response.text
