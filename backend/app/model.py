import math
import torch
from torch import nn
from torch.nn import functional as F
from .schemas import ModelConfig
from .data import PAD, BOS, EOS


def positional_encoding(length, dimension, *, dtype=torch.float32, device="cpu"):
    positions = torch.arange(length, dtype=dtype, device=device).unsqueeze(1)
    columns = torch.arange(dimension, dtype=dtype, device=device)
    angles = positions / torch.pow(torch.tensor(10000.0, dtype=dtype, device=device), 2 * torch.floor(columns / 2) / dimension)
    return torch.where((columns.long() % 2) == 0, torch.sin(angles), torch.cos(angles))


class Attention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.heads, self.width = config.num_heads, config.d_model // config.num_heads
        self.wq = nn.Linear(config.d_model, config.d_model, bias=False)
        self.wk = nn.Linear(config.d_model, config.d_model, bias=False)
        self.wv = nn.Linear(config.d_model, config.d_model, bias=False)
        self.wo = nn.Linear(config.d_model, config.d_model, bias=False)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, query, memory, query_valid, key_valid, causal=False):
        batch, queries, dim = query.shape
        keys = memory.shape[1]
        project = lambda matrix, layer: layer(matrix).reshape(batch, matrix.shape[1], self.heads, self.width).transpose(1, 2)
        q, k, v = project(query, self.wq), project(memory, self.wk), project(memory, self.wv)
        scores = q @ k.transpose(-2, -1) / math.sqrt(self.width)
        visible = key_valid[:, None, None, :].expand(batch, 1, queries, keys)
        if causal:
            visible = visible & (torch.arange(keys, device=query.device)[None, :] <= torch.arange(queries, device=query.device)[:, None])[None, None]
        visible = visible & query_valid[:, None, :, None]
        has_keys = visible.any(-1, keepdim=True)
        if (query_valid[:, None, :, None] & ~has_keys).any():
            raise ValueError("valid query has no visible keys")
        masked = scores.masked_fill(~visible, -torch.inf)
        # PAD query rows have no probability distribution: explicitly return zero,
        # never softmax an all-minus-infinity row. Valid queries remain normalized.
        safe = torch.where(has_keys, masked, torch.zeros_like(masked))
        weights = torch.softmax(safe, dim=-1) * visible.to(scores.dtype)
        mixed = self.dropout(weights) @ v
        concat = mixed.transpose(1, 2).contiguous().reshape(batch, queries, dim)
        return self.wo(concat), weights


class FFN(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.w1 = nn.Linear(config.d_model, config.d_ff)
        self.w2 = nn.Linear(config.d_ff, config.d_model)

    def forward(self, x):
        return self.w2(F.relu(self.w1(x)))


class Encoder(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.self_attention, self.ffn = Attention(config), FFN(config)
        self.norm1 = nn.LayerNorm(config.d_model, eps=config.epsilon)
        self.norm2 = nn.LayerNorm(config.d_model, eps=config.epsilon)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x, valid):
        attention, weights = self.self_attention(x, x, valid, valid)
        u = self.norm1(x + self.dropout(attention))
        hidden = self.ffn(u)
        output = self.norm2(u + self.dropout(hidden))
        return output, {"input": x, "self": attention, "weights": weights, "norm1": u, "ffn": hidden, "output": output}


class Decoder(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.self_attention, self.cross_attention, self.ffn = Attention(config), Attention(config), FFN(config)
        self.norm1 = nn.LayerNorm(config.d_model, eps=config.epsilon)
        self.norm2 = nn.LayerNorm(config.d_model, eps=config.epsilon)
        self.norm3 = nn.LayerNorm(config.d_model, eps=config.epsilon)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x, memory, valid, source_valid):
        attention, self_weights = self.self_attention(x, x, valid, valid, causal=True)
        u = self.norm1(x + self.dropout(attention))
        cross, cross_weights = self.cross_attention(u, memory, valid, source_valid)
        c = self.norm2(u + self.dropout(cross))
        hidden = self.ffn(c)
        output = self.norm3(c + self.dropout(hidden))
        return output, {"input": x, "self": attention, "self_weights": self_weights, "norm1": u, "cross": cross, "cross_weights": cross_weights, "norm2": c, "ffn": hidden, "output": output}


class MiniTransformer(nn.Module):
    def __init__(self, config: ModelConfig, vocabulary_size=12):
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(vocabulary_size, config.d_model, padding_idx=PAD)
        self.encoders = nn.ModuleList([Encoder(config) for _ in range(config.encoder_layers)])
        self.decoders = nn.ModuleList([Decoder(config) for _ in range(config.decoder_layers)])
        self.dropout = nn.Dropout(config.dropout)
        # Shared source/target E and output E^T; no duplicate output parameter.
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
        with torch.no_grad():
            self.embedding.weight[PAD].zero_()

    def embed(self, ids):
        if ids.ndim != 2 or not 1 <= ids.shape[1] <= self.config.max_sequence_length:
            raise ValueError("sequence shape exceeds teaching limits")
        if ids.dtype != torch.long or (ids < 0).any() or (ids >= self.embedding.num_embeddings).any():
            raise ValueError("invalid token IDs")
        vectors = self.embedding(ids) * math.sqrt(self.config.d_model)
        return self.dropout(vectors + positional_encoding(ids.shape[1], self.config.d_model, dtype=vectors.dtype, device=ids.device))

    def encode(self, source):
        valid = source != PAD
        if (~valid.any(-1)).any():
            raise ValueError("source cannot be all PAD")
        x, trace = self.embed(source), []
        embedded = x
        for encoder in self.encoders:
            x, layer = encoder(x, valid)
            trace.append(layer)
        return x, {"embedding": embedded, "layers": trace}

    def decode(self, target, memory, source_valid):
        valid = target != PAD
        x, trace = self.embed(target), []
        embedded = x
        for decoder in self.decoders:
            x, layer = decoder(x, memory, valid, source_valid)
            trace.append(layer)
        logits = F.linear(x, self.embedding.weight)
        return logits, {"embedding": embedded, "layers": trace, "output": x}

    def forward(self, source, target):
        memory, encoder = self.encode(source)
        logits, decoder = self.decode(target, memory, source != PAD)
        return logits, {"encoder": encoder, "memory": memory, "decoder": decoder}


@torch.no_grad()
def greedy_batch(model, source, max_tokens):
    """One Encoder call, raw argmax (no task-based answer/constrained token trick)."""
    memory, _ = model.encode(source)
    prefix = torch.full((source.shape[0], 1), BOS, dtype=torch.long, device=source.device)
    finished = torch.zeros(source.shape[0], dtype=torch.bool, device=source.device)
    generated = []
    for _ in range(min(max_tokens, model.config.max_sequence_length)):
        logits, _ = model.decode(prefix, memory, source != PAD)
        next_ids = logits[:, -1].argmax(-1)
        next_ids = torch.where(finished, torch.full_like(next_ids, PAD), next_ids)
        generated.append(next_ids)
        finished |= next_ids == EOS
        prefix = torch.cat([prefix, next_ids[:, None]], dim=1)
        if finished.all():
            break
    return torch.stack(generated, dim=1)
