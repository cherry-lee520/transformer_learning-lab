import hashlib
import json
import numpy as np
import torch
from .schemas import DatasetConfig

VOCABULARY = ["[PAD]", "[UNK]", "[BOS]", "[EOS]", *list("ABCDEFGH")]
PAD, UNK, BOS, EOS = 0, 1, 2, 3


def make_dataset(config: DatasetConfig, seed: int):
    """Stratified coverage, unique ranks, disjoint inputs; no model dependency."""
    rng = np.random.default_rng(seed)
    lengths = list(range(config.min_length, config.max_length + 1))
    offsets, capacity = {}, 0
    for length in lengths:
        offsets[length] = capacity
        capacity += 8**length
    train_ranks, val_ranks, reserved = [], [], set()
    for length in lengths:
        a, b = (rng.choice(8**length, size=2, replace=False) + offsets[length]).tolist()
        train_ranks.append(a)
        val_ranks.append(b)
        reserved.update((a, b))
    needed = config.train_samples + config.validation_samples - len(reserved)
    if capacity <= 100000:
        pool = np.array([rank for rank in range(capacity) if rank not in reserved], dtype=np.int64)
        extra = rng.choice(pool, size=needed, replace=False).tolist()
    else:
        extra = []
        while len(extra) < needed:
            rank = int(rng.integers(capacity))
            if rank not in reserved:
                reserved.add(rank)
                extra.append(rank)
    split = config.train_samples - len(train_ranks)
    train_ranks.extend(extra[:split])
    val_ranks.extend(extra[split:])
    rng.shuffle(train_ranks)
    rng.shuffle(val_ranks)

    def sample(rank):
        length = next(n for n in reversed(lengths) if rank >= offsets[n])
        value = rank - offsets[length]
        content = [4] * length
        for index in range(length - 1, -1, -1):
            content[index] = value % 8 + 4
            value //= 8
        target = content[:] if config.task == "copy" else content[::-1]
        return {"source": content, "target": target}

    return [sample(rank) for rank in train_ranks], [sample(rank) for rank in val_ranks]


def dataset_fingerprint(train, validation):
    return hashlib.sha256(json.dumps([train, validation], separators=(",", ":")).encode()).hexdigest()


def collate(samples, device="cpu"):
    if not samples:
        raise ValueError("empty batch")
    sources = [row["source"] + [EOS] for row in samples]
    # Full target = BOS + content + EOS. Shift exactly once.
    targets = [[BOS] + row["target"] + [EOS] for row in samples]
    src = torch.full((len(samples), max(map(len, sources))), PAD, dtype=torch.long, device=device)
    full = torch.full((len(samples), max(map(len, targets))), PAD, dtype=torch.long, device=device)
    for i, (source, target) in enumerate(zip(sources, targets)):
        src[i, :len(source)] = torch.tensor(source, device=device)
        full[i, :len(target)] = torch.tensor(target, device=device)
    return src, full[:, :-1], full[:, 1:]


def encode_text(text, max_length):
    tokens = text.split()
    if not 1 <= len(tokens) <= max_length:
        raise ValueError(f"请输入 1–{max_length} 个空格分隔的 A–H 符号。")
    if any(token not in VOCABULARY[4:] for token in tokens):
        raise ValueError("推理输入只接受 A–H，不能包含特殊 Token 或未知符号。")
    return [VOCABULARY.index(token) for token in tokens]


def preview(samples, limit=12):
    return [{"source": " ".join(VOCABULARY[i] for i in row["source"]), "target": " ".join(VOCABULARY[i] for i in row["target"])} for row in samples[:limit]]
