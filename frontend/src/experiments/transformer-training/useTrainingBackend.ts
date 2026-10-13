import { useEffect, useRef, useState } from 'react';
import { trainingApi } from '../../services/transformerTraining';
import type { TrainingStatus,MetricsResponse,DatasetPreview,Checkpoint,Health } from '../../services/transformerTraining';
export function useTrainingBackend() {
  const [status,setStatus]=useState<TrainingStatus|null>(null),[history,setHistory]=useState<MetricsResponse['history']>([]);
  const [dataset,setDataset]=useState<DatasetPreview|null>(null),[checkpoints,setCheckpoints]=useState<Checkpoint[]>([]),[health,setHealth]=useState<Health|null>(null);
  const [connected,setConnected]=useState(false),[connectionError,setConnectionError]=useState('正在连接本地训练服务…');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  const mounted=useRef(false),commands=useRef(new Set<AbortController>());
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;commands.current.forEach(c=>c.abort());commands.current.clear();};},[]);
  useEffect(()=>{
    let active=true,timer:ReturnType<typeof setTimeout>|null=null,controller:AbortController|null=null,session='';
    const poll=async()=>{
      controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
      try{
        const [next,metrics]=await Promise.all([trainingApi<TrainingStatus>('training/status',undefined,controller.signal),trainingApi<MetricsResponse>('training/metrics',undefined,controller.signal)]);
        if(!next||typeof next.session_id!=='string'||!metrics||!Array.isArray(metrics.history))throw new Error('后端返回的数据格式不可用。');
        if(next.session_id!==metrics.session_id)throw new Error('训练任务已切换，正在重新读取。');
        if(!active)return;
        setStatus(next);setHistory(metrics.history);setConnected(true);setConnectionError('');
        if(session!==next.session_id){
          const [samples,saved,info]=await Promise.all([trainingApi<DatasetPreview>('datasets',undefined,controller.signal),trainingApi<{checkpoints:Checkpoint[]}>('checkpoints',undefined,controller.signal),trainingApi<Health>('health',undefined,controller.signal)]);
          if(active){setDataset(samples);setCheckpoints(saved.checkpoints);setHealth(info);session=next.session_id;}
        }
      }catch(reason){
        if(active){setConnected(false);setConnectionError(reason instanceof Error?reason.message:'本地后端连接失败。');}
      }finally{
        clearTimeout(timeout);if(active)timer=setTimeout(poll,1000);
      }
    };
    void poll();
    return()=>{active=false;if(timer)clearTimeout(timer);controller?.abort();};
  },[revision]);
  async function command<T>(path:string,body:unknown={}):Promise<T|null>{
    if(busy)return null;
    const controller=new AbortController();commands.current.add(controller);
    const timeout=setTimeout(()=>controller.abort(),30000);
    setBusy(true);setError('');
    try{const result=await trainingApi<T>(path,body,controller.signal);if(mounted.current)setRevision(n=>n+1);return result;}
    catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'操作失败。');return null;}
    finally{clearTimeout(timeout);commands.current.delete(controller);if(mounted.current)setBusy(false);}
  }
  return {status,history,dataset,checkpoints,health,connected,connectionError,error,busy,command,reconnect:()=>setRevision(n=>n+1)};
}
