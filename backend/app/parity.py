import json
from pathlib import Path
import torch
from .model import MiniTransformer
from .schemas import ModelConfig


def compare_t09(path: Path, dtype=torch.float64):
    fixture = json.loads(path.read_text(encoding="utf-8"))
    c = fixture["config"]
    config = ModelConfig(d_model=c["dModel"], num_heads=c["heads"], d_ff=c["dFF"], encoder_layers=c["encoderLayers"], decoder_layers=c["decoderLayers"], dropout=0, epsilon=c["epsilon"])
    model = MiniTransformer(config, len(fixture["vocabulary"])).to(dtype=dtype)
    parameters = fixture["parameters"]
    tensor = lambda value: torch.tensor(value, dtype=dtype)
    with torch.no_grad():
        model.embedding.weight.copy_(tensor(parameters["embedding"]))
        def multi(module, values):
            # JS head matrices d_model×d_k concatenate by output columns;
            # nn.Linear stores out_features×in_features.
            for name in ("wq","wk","wv"):
                getattr(module,name).weight.copy_(torch.cat([tensor(head[name]) for head in values["heads"]],dim=1).T)
            module.wo.weight.copy_(tensor(values["wo"]).T)
        def norm(module, values):
            module.weight.copy_(tensor(values["gamma"]))
            module.bias.copy_(tensor(values["beta"]))
        def block(module, values):
            multi(module.self_attention,values["self"])
            module.ffn.w1.weight.copy_(tensor(values["ffn"]["w1"]).T)
            module.ffn.w1.bias.copy_(tensor(values["ffn"]["b1"]))
            module.ffn.w2.weight.copy_(tensor(values["ffn"]["w2"]).T)
            module.ffn.w2.bias.copy_(tensor(values["ffn"]["b2"]))
            norm(module.norm1,values["norm1"]);norm(module.norm2,values["norm2"])
        for module, values in zip(model.encoders,parameters["encoders"]):
            block(module,values)
        for module, values in zip(model.decoders,parameters["decoders"]):
            block(module,values);multi(module.cross_attention,values["cross"]);norm(module.norm3,values["norm3"])
    model.eval()
    with torch.no_grad():
        logits, trace = model(torch.tensor([fixture["source"]]),torch.tensor([fixture["target"]]))
    actual = {"source_input":trace["encoder"]["embedding"][0],"target_input":trace["decoder"]["embedding"][0],"memory":trace["memory"][0],"output":trace["decoder"]["output"][0],"logits":logits[0],"probabilities":torch.softmax(logits[0],-1)}
    for i, layer in enumerate(trace["encoder"]["layers"]):
        for key in ("input","self","norm1","ffn","output"):
            actual[f"encoder.{i}.{key}"]=layer[key][0]
        actual[f"encoder.{i}.norm2"]=layer["output"][0]
        for h, weights in enumerate(layer["weights"][0]):
            actual[f"encoder.{i}.weights.{h}"]=weights
    for i, layer in enumerate(trace["decoder"]["layers"]):
        for key in ("input","self","norm1","cross","norm2","ffn","output"):
            actual[f"decoder.{i}.{key}"]=layer[key][0]
        actual[f"decoder.{i}.norm3"]=layer["output"][0]
        for name, field in (("self","self_weights"),("cross","cross_weights")):
            for h, weights in enumerate(layer[field][0]):
                actual[f"decoder.{i}.{name}.weights.{h}"]=weights
    assert set(actual)==set(fixture["expected"])
    errors = {}
    for name, value in actual.items():
        reference=tensor(fixture["expected"][name])
        assert value.shape==reference.shape
        errors[name]=float((value-reference).abs().max())
    return {"dtype":str(dtype),"tensor_count":len(errors),"maximum_absolute_error":max(errors.values()),"logits_maximum_absolute_error":errors["logits"],"errors":errors,"parameter_mapping":"Explicit head concatenation and Linear transpose; shared E, identical IDs/PE/Post-LN/masks."}
