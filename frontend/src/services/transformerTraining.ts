export interface TrainingConfig {
  model: { encoder_layers: number; decoder_layers: number; d_model: number; num_heads: number; d_ff: number; dropout: number; max_sequence_length: number; epsilon: number };
  dataset: { task: 'copy'|'reverse'; train_samples: number; validation_samples: number; min_length: number; max_length: number };
  learning_rate: number; batch_size: number; epochs: number; seed: number; gradient_clip: number; device: 'cpu'|'cuda';
}
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  model:{encoder_layers:1,decoder_layers:1,d_model:32,num_heads:4,d_ff:64,dropout:.1,max_sequence_length:12,epsilon:1e-5},
  dataset:{task:'copy',train_samples:1024,validation_samples:128,min_length:1,max_length:5},
  learning_rate:.001,batch_size:32,epochs:100,seed:42,gradient_clip:1,device:'cpu',
};
export interface TrainingMetric {
  epoch:number;step:number;train_loss:number;validation_loss:number;
  train_token_accuracy:number;train_sequence_accuracy:number;validation_token_accuracy:number;validation_sequence_accuracy:number;
  learning_rate:number;elapsed_seconds:number;
}
export type BackendTrainingState='idle'|'running'|'paused'|'completed'|'stopped'|'failed';
export interface TrainingStatus {
  session_id:string;state:BackendTrainingState;epoch:number;step:number;total_steps:number;current_loss:number|null;
  latest:TrainingMetric|null;elapsed_seconds:number;error:string|null;config:TrainingConfig;vocabulary:string[];dataset_fingerprint:string;history_limit:number;parameter_count:number;
}
export interface MetricsResponse {session_id:string;history:TrainingMetric[]}
export interface DatasetPreview {config:TrainingConfig['dataset'];seed:number;fingerprint:string;train_count:number;validation_count:number;train:{source:string;target:string}[];validation:{source:string;target:string}[]}
export interface Checkpoint {id:string;bytes:number;modified_at:number}
export interface Health {status:'ok';torch_version:string;cuda_available:boolean;default_device:'cpu'}
export interface GenerationStep {
  index:number;prefix:string[];logits:number[];probabilities:number[];
  top_k:{token:string;id:number;probability:number}[];chosen_id:number;chosen_token:string;
  decoder_self:number[][][][];cross:number[][][][];
}
export interface Generation {
  source_tokens:string[];generated_tokens:string[];steps:GenerationStep[];stop_reason:'eos'|'max_length';
  encoder_self:number[][][][];shapes:Record<string,number[]>;
}
export interface GenerationResponse {model_step:number;trained:boolean;task:'copy'|'reverse';vocabulary:string[];current:Generation;initial:Generation|null}
export async function trainingApi<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T> {
  const response=await fetch('/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal});
  let data:unknown;
  try{data=await response.json();}catch{throw new Error('本地训练后端未连接。请先启动 backend（127.0.0.1:8000），再检查前端代理。');}
  if(!response.ok){
    const error=data&&typeof data==='object'&&'error'in data?(data as {error?:{message?:unknown}}).error:null;
    throw new Error(typeof error?.message==='string'?error.message:'本地训练服务请求失败，请检查后端连接。');
  }
  return data as T;
}
export const TRAINING_STATE_LABELS:Record<BackendTrainingState,string>={idle:'待开始',running:'训练中',paused:'已暂停',completed:'已完成',stopped:'已停止',failed:'失败'};
