from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ModelConfig(StrictModel):
    encoder_layers: int = Field(1, ge=1, le=2, strict=True)
    decoder_layers: int = Field(1, ge=1, le=2, strict=True)
    d_model: Literal[8, 16, 32, 64] = 32
    num_heads: Literal[1, 2, 4, 8] = 4
    d_ff: Literal[16, 32, 64, 128] = 64
    dropout: float = Field(0.1, ge=0, le=0.3)
    max_sequence_length: int = Field(12, ge=4, le=12, strict=True)
    epsilon: float = Field(1e-5, ge=1e-8, le=0.01)

    @model_validator(mode="after")
    def dimensions(self):
        if self.d_model % self.num_heads:
            raise ValueError("d_model must be divisible by num_heads")
        return self


class DatasetConfig(StrictModel):
    task: Literal["copy", "reverse"] = "copy"
    train_samples: int = Field(1024, ge=4, le=2048, strict=True)
    validation_samples: int = Field(128, ge=2, le=256, strict=True)
    min_length: int = Field(1, ge=1, le=10, strict=True)
    max_length: int = Field(5, ge=1, le=10, strict=True)

    @model_validator(mode="after")
    def capacity(self):
        if self.min_length > self.max_length:
            raise ValueError("min_length cannot exceed max_length")
        lengths = self.max_length - self.min_length + 1
        if min(self.train_samples, self.validation_samples) < lengths:
            raise ValueError("each split needs at least one sample of each length")
        if self.train_samples + self.validation_samples > sum(8**n for n in range(self.min_length, self.max_length + 1)):
            raise ValueError("not enough unique input sequences for disjoint splits")
        return self


class TrainingConfig(StrictModel):
    model: ModelConfig = Field(default_factory=ModelConfig)
    dataset: DatasetConfig = Field(default_factory=DatasetConfig)
    learning_rate: float = Field(0.001, ge=0.00001, le=0.02)
    batch_size: int = Field(32, ge=4, le=128, strict=True)
    epochs: int = Field(100, ge=1, le=300, strict=True)
    seed: int = Field(42, ge=0, le=2**31-1, strict=True)
    gradient_clip: float = Field(1.0, ge=0.1, le=5)
    device: Literal["cpu", "cuda"] = "cpu"

    @model_validator(mode="after")
    def lengths(self):
        if self.dataset.max_length + 2 > self.model.max_sequence_length:
            raise ValueError("reserve positions for BOS and EOS: max_length+2 <= max_sequence_length")
        return self


class GenerateRequest(StrictModel):
    text: str = Field(min_length=1, max_length=128)
    max_tokens: int = Field(12, ge=1, le=12, strict=True)
    top_k: int = Field(5, ge=1, le=12, strict=True)
    compare_initial: bool = True


class SaveRequest(StrictModel):
    name: str = Field("mini", pattern=r"^[a-z0-9][a-z0-9_-]{0,31}$")


class LoadRequest(StrictModel):
    checkpoint_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{0,79}\.pt$")
    expected_model: ModelConfig | None = None
