from pathlib import Path
import pytest
import torch
from app.schemas import ModelConfig, DatasetConfig
from app.model import MiniTransformer, positional_encoding, greedy_batch
from app.data import make_dataset, collate, PAD, BOS, EOS
from app.engine import loss_and_counts, generated_counts, evaluate
from app.parity import compare_t09


def model(seed=42, **config):
    torch.manual_seed(seed)
    value = MiniTransformer(ModelConfig(d_model=8, num_heads=2, d_ff=16, dropout=0, **config))
    value.eval()
    return value


def test_fixed_seed_independent_parameters():
    a,b=model(),model()
    assert all(torch.equal(a.state_dict()[k],v) for k,v in b.state_dict().items())
    assert not torch.equal(a.encoders[0].self_attention.wq.weight,a.decoders[0].cross_attention.wq.weight)
    assert a.encoders[0].norm1.weight.data_ptr()!=a.encoders[0].norm2.weight.data_ptr()
    assert any(not torch.equal(a.state_dict()[k],v) for k,v in model(43).state_dict().items())


@pytest.mark.parametrize("enc,dec",[(1,1),(2,2),(1,2)])
def test_shapes_encoder_decoder_cross(enc,dec):
    value=model(encoder_layers=enc,decoder_layers=dec)
    logits,r=value(torch.tensor([[4,5,6,EOS]]),torch.tensor([[BOS,7]]))
    assert logits.shape==(1,2,12)
    assert r["memory"].shape==(1,4,8)
    assert len(r["encoder"]["layers"])==enc and len(r["decoder"]["layers"])==dec
    assert r["decoder"]["layers"][-1]["cross_weights"].shape==(1,2,2,4)
    assert torch.isfinite(logits).all()
    assert torch.allclose(torch.softmax(logits,-1).sum(-1),torch.ones(1,2))


def test_post_ln_and_shared_output():
    value=model()
    logits,r=value(torch.tensor([[4,EOS]]),torch.tensor([[BOS,4]]))
    layer=r["encoder"]["layers"][0]
    assert torch.allclose(layer["norm1"],value.encoders[0].norm1(layer["input"]+layer["self"]))
    assert torch.allclose(logits,r["decoder"]["output"]@value.embedding.weight.T)


def test_causal_future_isolation_all_layers():
    value=model(encoder_layers=2,decoder_layers=2)
    source=torch.tensor([[4,5,EOS]])
    a,ta=value(source,torch.tensor([[BOS,4,5]]))
    b,tb=value(source,torch.tensor([[BOS,4,8]]))
    assert torch.allclose(a[:,:2],b[:,:2],atol=1e-6)
    for x,y in zip(ta["decoder"]["layers"],tb["decoder"]["layers"]):
        assert torch.allclose(x["output"][:,:2],y["output"][:,:2],atol=1e-6)
        assert torch.equal(x["self_weights"].triu(1),torch.zeros_like(x["self_weights"]))
    assert not torch.allclose(a[:,2],b[:,2])


def test_padding_source_and_target_keys_are_zero():
    value=model()
    _,r=value(torch.tensor([[4,EOS,PAD,PAD],[5,6,7,EOS]]),torch.tensor([[BOS,4,PAD],[BOS,5,6]]))
    encoder=r["encoder"]["layers"][0]["weights"]
    cross=r["decoder"]["layers"][0]["cross_weights"]
    self_weights=r["decoder"]["layers"][0]["self_weights"]
    assert torch.count_nonzero(encoder[0,:,:,2:])==0
    assert torch.count_nonzero(cross[0,:,:,2:])==0
    assert torch.count_nonzero(self_weights[0,:,:,2:])==0
    assert torch.count_nonzero(self_weights[0,:,2,:])==0
    assert torch.allclose(cross[1].sum(-1),torch.ones(2,3))


def test_padding_does_not_change_valid_positions():
    value=model()
    a,_=value(torch.tensor([[4,EOS]]),torch.tensor([[BOS,4]]))
    b,_=value(torch.tensor([[4,EOS,PAD,PAD]]),torch.tensor([[BOS,4,PAD]]))
    assert torch.allclose(a,b[:,:2],atol=1e-6)
    with pytest.raises(ValueError):value(torch.tensor([[PAD,PAD]]),torch.tensor([[BOS]]))


def test_position_encoding_and_embedding_scale():
    value=model()
    pe=positional_encoding(2,8,dtype=torch.float64)
    assert torch.equal(pe[0],torch.tensor([0,1,0,1,0,1,0,1],dtype=torch.float64))
    assert pe[1,0].item()==pytest.approx(torch.sin(torch.tensor(1.,dtype=torch.float64)).item())
    ids=torch.tensor([[4,5]])
    assert torch.allclose(value.embed(ids),value.embedding(ids)*(8**.5)+positional_encoding(2,8))


@pytest.mark.parametrize("task",["copy","reverse"])
def test_unique_deterministic_disjoint_datasets(task):
    c=DatasetConfig(task=task,train_samples=48,validation_samples=16,max_length=3)
    train,val=make_dataset(c,42)
    assert (train,val)==make_dataset(c,42)
    assert (train,val)!=make_dataset(c,43)
    a={tuple(row["source"]) for row in train};b={tuple(row["source"]) for row in val}
    assert not a&b and len(a)==48 and len(b)==16
    assert {len(row["source"]) for row in train}=={1,2,3}
    assert {len(row["source"]) for row in val}=={1,2,3}
    for row in train+val:assert row["target"]==(row["source"] if task=="copy" else row["source"][::-1])


def test_teacher_forcing_shift_and_padding():
    source,decoder,expected=collate([{"source":[4,5,6],"target":[4,5,6]},{"source":[7],"target":[7]}])
    assert source.tolist()==[[4,5,6,EOS],[7,EOS,PAD,PAD]]
    assert decoder.tolist()==[[BOS,4,5,6],[BOS,7,EOS,PAD]]
    assert expected.tolist()==[[4,5,6,EOS],[7,EOS,PAD,PAD]]
    assert torch.equal(decoder[:,1:],expected[:,:-1])


def test_cross_entropy_pad_ignore_and_nonzero_gradients_update():
    value=model()
    source,target,expected=collate([{"source":[4,5],"target":[4,5]},{"source":[6],"target":[6]}])
    logits,_=value(source,target)
    loss,n,_,_=loss_and_counts(logits,expected)
    assert n==5
    manual=-torch.log_softmax(logits,-1).gather(-1,expected[:,:,None]).squeeze(-1)[expected!=PAD].sum()
    assert torch.allclose(loss,manual)
    optimizer=torch.optim.Adam(value.parameters(),lr=.001)
    before=value.embedding.weight.clone()
    optimizer.zero_grad();(loss/n).backward()
    assert value.embedding.weight.grad.abs().sum()>0
    optimizer.step()
    assert not torch.equal(before,value.embedding.weight)


def test_token_sequence_accuracy_includes_eos_and_exact_length():
    generated=torch.tensor([[4,5,EOS,PAD],[6,EOS,PAD,PAD],[7,8,4,EOS]])
    expected=torch.tensor([[4,5,EOS,PAD],[6,7,EOS,PAD],[7,8,EOS,PAD]])
    correct,total,sequences=generated_counts(generated,expected)
    assert (correct,total,sequences)==(6,9,1)
    assert generated_counts(torch.tensor([[PAD,4]]),torch.tensor([[4,EOS]]))==(0,2,0)


def test_validation_never_updates_parameters():
    value=model();state={k:v.clone() for k,v in value.state_dict().items()}
    _,val=make_dataset(DatasetConfig(train_samples=8,validation_samples=4,min_length=1,max_length=2),42)
    result=evaluate(value,val,4,"cpu")
    assert result["loss"]>0 and 0<=result["token_accuracy"]<=1
    assert all(torch.equal(state[k],v) for k,v in value.state_dict().items())


def test_greedy_eos_and_maximum_stop():
    value=model()
    class Constant(MiniTransformer):
        def __init__(self,chosen):
            super().__init__(value.config);self.chosen=chosen;self.encoder_calls=0
        def encode(self,source):
            self.encoder_calls+=1;return super().encode(source)
        def decode(self,target,memory,source_valid):
            logits=torch.zeros(target.shape[0],target.shape[1],12);logits[:,:,self.chosen]=10
            return logits,{}
    eos=Constant(EOS)
    assert greedy_batch(eos,torch.tensor([[4,EOS]]),5).tolist()==[[EOS]]
    assert eos.encoder_calls==1
    other=Constant(4)
    assert greedy_batch(other,torch.tensor([[4,EOS]]),3).tolist()==[[4,4,4]]
    assert other.encoder_calls==1


@pytest.mark.parametrize("dtype,tolerance",[(torch.float64,1e-10),(torch.float32,2e-5)])
def test_t09_explicit_parameter_mapping(dtype,tolerance):
    result=compare_t09(Path(__file__).parent/"fixtures/t09-reference.json",dtype)
    assert result["tensor_count"]==26
    assert result["maximum_absolute_error"]<tolerance


def test_invalid_model_and_data_limits():
    for change in ({"d_model":7},{"num_heads":3},{"encoder_layers":0},{"dropout":float("nan")}):
        with pytest.raises(ValueError):ModelConfig(**change)
    with pytest.raises(ValueError):DatasetConfig(train_samples=16,validation_samples=8,min_length=1,max_length=1)
    with pytest.raises(ValueError):model()(torch.tensor([[-1]]),torch.tensor([[BOS]]))
    with pytest.raises(ValueError):model()(torch.tensor([[4]]),torch.ones((1,13),dtype=torch.long))
