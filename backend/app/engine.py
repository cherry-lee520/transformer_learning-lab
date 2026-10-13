import torch
from torch.nn import functional as F
from .data import PAD, BOS, EOS, VOCABULARY, collate
from .model import greedy_batch


def loss_and_counts(logits, expected):
    mask = expected != PAD
    count = int(mask.sum())
    if not count:
        raise ValueError("batch has no supervised tokens")
    loss_sum = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), expected.reshape(-1), ignore_index=PAD, reduction="sum")
    correct = (logits.argmax(-1) == expected) | ~mask
    return loss_sum, count, int((correct & mask).sum()), int(correct.all(-1).sum())


def generated_counts(generated, expected):
    tokens, total, sequences = 0, 0, 0
    for prediction, target in zip(generated.tolist(), expected.tolist()):
        target = [value for value in target if value != PAD]
        if EOS in prediction:
            prediction = prediction[:prediction.index(EOS)+1]
        total += len(target)
        tokens += sum(i < len(prediction) and prediction[i] == value for i, value in enumerate(target))
        sequences += prediction == target
    return tokens, total, sequences


@torch.no_grad()
def evaluate(model, samples, batch_size, device, *, autoregressive=True):
    model.eval()
    loss, count, correct, sequences = 0.0, 0, 0, 0
    for offset in range(0, len(samples), batch_size):
        batch = samples[offset:offset+batch_size]
        source, target, expected = collate(batch, device)
        logits, _ = model(source, target)
        loss_sum, n, tf_correct, tf_sequences = loss_and_counts(logits, expected)
        loss += float(loss_sum)
        count += n
        if autoregressive:
            generated = greedy_batch(model, source, model.config.max_sequence_length)
            correct_tokens, _, correct_sequences = generated_counts(generated, expected)
            correct += correct_tokens
            sequences += correct_sequences
        else:
            correct += tf_correct
            sequences += tf_sequences
    return {"loss": loss/count, "token_accuracy": correct/count, "sequence_accuracy": sequences/len(samples)}


@torch.no_grad()
def inspect_generation(model, content, max_tokens, top_k, device):
    model.eval()
    source = torch.tensor([content + [EOS]], dtype=torch.long, device=device)
    memory, encoder = model.encode(source)  # Exactly once per generation.
    prefix = torch.tensor([[BOS]], dtype=torch.long, device=device)
    source_tokens = [VOCABULARY[i] for i in content+[EOS]]
    tensor = lambda value: value.detach().cpu().tolist()
    steps, stopped = [], "max_length"
    for index in range(min(max_tokens, model.config.max_sequence_length)):
        logits, trace = model.decode(prefix, memory, source != PAD)
        row = logits[0, -1]
        probabilities = torch.softmax(row, -1)
        chosen = int(row.argmax())
        ranked = sorted(range(len(VOCABULARY)), key=lambda i: (-float(probabilities[i]), i))[:top_k]
        steps.append({
            "index": index, "prefix": [VOCABULARY[i] for i in prefix[0].tolist()],
            "logits": tensor(row), "probabilities": tensor(probabilities),
            "top_k": [{"token": VOCABULARY[i], "id": i, "probability": float(probabilities[i])} for i in ranked],
            "chosen_id": chosen, "chosen_token": VOCABULARY[chosen],
            "decoder_self": [tensor(layer["self_weights"][0]) for layer in trace["layers"]],
            "cross": [tensor(layer["cross_weights"][0]) for layer in trace["layers"]],
        })
        prefix = torch.cat((prefix, torch.tensor([[chosen]], dtype=torch.long, device=device)), dim=1)
        if chosen == EOS:
            stopped = "eos"
            break
    return {
        "source_tokens": source_tokens, "generated_tokens": [step["chosen_token"] for step in steps],
        "steps": steps, "stop_reason": stopped,
        "encoder_self": [tensor(layer["weights"][0]) for layer in encoder["layers"]],
        "shapes": {"source_embedding": list(encoder["embedding"].shape), "memory": list(memory.shape), "last_logits": list(logits.shape)},
    }
