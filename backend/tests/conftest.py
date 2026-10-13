import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
import torch
from app.service import TrainingService

torch.set_num_threads(1)


@pytest.fixture
def service(tmp_path):
    value = TrainingService(tmp_path/"checkpoints")
    yield value
    value.close()
