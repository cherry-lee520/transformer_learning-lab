import logging
from contextlib import asynccontextmanager
import torch
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .schemas import TrainingConfig, GenerateRequest, SaveRequest, LoadRequest
from .service import TrainingService, ServiceError
from . import checkpoints


def create_app(service=None):
    @asynccontextmanager
    async def lifespan(app):
        torch.set_num_threads(1)
        app.state.trainer = service or TrainingService()
        yield
        app.state.trainer.close()

    app = FastAPI(title="Transformer Learning Lab Local API", version="1.0", lifespan=lifespan)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])
    # No CORS wildcard: browser uses same-origin Vite /api proxy.
    @app.middleware("http")
    async def local_origins(request: Request, call_next):
        origin = request.headers.get("origin")
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost"):
                return JSONResponse({"error": {"code": "origin_denied", "message": "仅允许本地开发来源。"}}, status_code=403)
        return await call_next(request)

    @app.exception_handler(ServiceError)
    async def service_error(request, error):
        return JSONResponse({"error": {"code": error.code, "message": error.message}}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        return JSONResponse({"error": {"code": "validation_error", "message": "请求参数不合法。", "fields": [".".join(str(part) for part in e["loc"]) for e in error.errors()]}}, status_code=422)

    @app.exception_handler(ValueError)
    async def value_error(request, error):
        return JSONResponse({"error": {"code": "invalid_input", "message": str(error)}}, status_code=422)

    @app.exception_handler(Exception)
    async def unexpected(request, error):
        logging.getLogger(__name__).exception("local API failure", exc_info=error)
        return JSONResponse({"error": {"code": "internal_error", "message": "本地服务暂时无法完成操作，请查看后端日志。"}}, status_code=500)

    def trainer(request):
        return request.app.state.trainer

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok", "torch_version": str(torch.__version__), "cuda_available": torch.cuda.is_available(), "default_device": "cpu"}

    @app.get("/api/v1/model/config")
    def config(request: Request):
        return trainer(request).status()["config"]

    @app.get("/api/v1/datasets")
    def datasets(request: Request):
        return trainer(request).datasets()

    @app.post("/api/v1/training/start")
    def start(config: TrainingConfig, request: Request):
        return trainer(request).start(config)

    @app.post("/api/v1/training/pause")
    def pause(request: Request):
        return trainer(request).pause()

    @app.post("/api/v1/training/resume")
    def resume(request: Request):
        return trainer(request).resume()

    @app.post("/api/v1/training/stop")
    def stop(request: Request):
        return trainer(request).stop()

    @app.post("/api/v1/training/reset")
    def reset(config: TrainingConfig, request: Request):
        return trainer(request).reset(config)

    @app.get("/api/v1/training/status")
    def status(request: Request):
        return trainer(request).status()

    @app.get("/api/v1/training/metrics")
    def metrics(request: Request):
        return trainer(request).metrics()

    @app.post("/api/v1/inference/generate")
    def generate(config: GenerateRequest, request: Request):
        return trainer(request).generate(config)

    @app.get("/api/v1/checkpoints")
    def checkpoint_list(request: Request):
        return {"checkpoints": checkpoints.list_checkpoints(trainer(request))}

    @app.post("/api/v1/checkpoints/save")
    def checkpoint_save(config: SaveRequest, request: Request):
        return checkpoints.save(trainer(request), config.name)

    @app.post("/api/v1/checkpoints/load")
    def checkpoint_load(config: LoadRequest, request: Request):
        return checkpoints.load(trainer(request), config)

    return app


app = create_app()
