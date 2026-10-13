import { startTransition, useEffect, useRef, useState } from 'react';
import { createSession, advanceTraining, clearLossHistory, DEFAULT_TRAINING, validateSettings } from '../../services/mlp/training';
import { DEFAULT_ARCHITECTURE, DEFAULT_SEED } from '../../services/mlp/network';
import type { NetworkArchitecture, TrainingSettings, TrainingSession } from '../../services/mlp/types';
export type TrainingStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'finished' | 'error';
export function useMLPTraining() {
  const [architecture, setArchitecture] = useState<NetworkArchitecture>(() => ({ ...DEFAULT_ARCHITECTURE, hiddenSizes: [...DEFAULT_ARCHITECTURE.hiddenSizes] }));
  const [seed, setSeed] = useState(DEFAULT_SEED), [settings, setSettings] = useState<TrainingSettings>({ ...DEFAULT_TRAINING });
  const [session, setSession] = useState<TrainingSession>(() => createSession());
  const [status, setStatus] = useState<TrainingStatus>('idle'), [message, setMessage] = useState('已用固定种子初始化。预测、损失和边界全部来自当前随机模型。'), [revision, setRevision] = useState(0);
  const current = useRef(session), options = useRef(settings), timer = useRef<ReturnType<typeof setTimeout> | null>(null), generation = useRef(0), running = useRef(false);
  function invalidate() { generation.current++; running.current = false; if (timer.current !== null) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => () => { generation.current++; running.current = false; if (timer.current !== null) clearTimeout(timer.current); }, []);
  function commit(next: TrainingSession) { current.current = next; setSession(next); }
  function fail(error: unknown) { invalidate(); setSession(current.current); setStatus('error'); setMessage(error instanceof Error ? error.message : '训练遇到问题，已停止并保留最后有效模型。'); }
  function pause() { if (!running.current) return; invalidate(); setSession(current.current); setStatus('paused'); setMessage('已暂停，模型和训练记录保留，可以继续。'); }
  function stop() { invalidate(); setSession(current.current); setStatus('stopped'); setMessage('训练已停止，定时任务已取消；模型与记录保留。'); }
  function start() {
    invalidate();
    if (current.current.step >= options.current.maxSteps) { setStatus('finished'); setMessage('已到更新次数上限；可提高上限或重置模型。'); return; }
    running.current = true; setStatus('running'); setMessage('正在本地分批训练，每个批次后让出页面线程。');
    const token = generation.current;
    const tick = () => {
      if (token !== generation.current || !running.current) return;
      timer.current = null;
      try {
        let next = current.current; const started = performance.now();
        // At most 25 updates or 10ms per turn, followed by a 32ms yield.
        for (let count = 0; count < 25 && next.step < options.current.maxSteps; count++) {
          next = advanceTraining(next, options.current);
          if (performance.now() - started > 10) break;
        }
        current.current = next;
        if (next.step >= options.current.maxSteps) { setSession(next); running.current = false; setStatus('finished'); setMessage('已达到设定的更新次数。请按真实损失和预测判断是否收敛。'); }
        else {
          // Training display must not starve navigation or parameter edits. Control
          // actions synchronously publish the latest valid session above.
          startTransition(() => setSession(next));
          timer.current = setTimeout(tick, 32);
        }
      } catch (error) { fail(error); }
    };
    timer.current = setTimeout(tick, 0);
  }
  function step() {
    invalidate();
    try {
      const next = advanceTraining(current.current, options.current); commit(next);
      setStatus(next.step >= options.current.maxSteps ? 'finished' : 'paused');
      setMessage('已执行一次真实批量梯度计算与 SGD 更新，详细张量见训练快照。');
    } catch (error) { fail(error); }
  }
  function configure(nextArchitecture: NetworkArchitecture, nextSeed: number, nextSettings: TrainingSettings, note: string) {
    invalidate();
    try {
      validateSettings(nextSettings);
      const next = createSession(nextArchitecture, nextSeed, nextSettings.loss);
      setArchitecture(nextArchitecture); setSeed(nextSeed); options.current = nextSettings; setSettings(nextSettings); commit(next);
      setStatus('idle'); setRevision(value => value + 1); setMessage(note);
    } catch (error) { fail(error); }
  }
  function changeSettings(next: TrainingSettings) {
    pause();
    try { validateSettings(next); options.current = next; setSettings(next); setMessage('训练已暂停；新学习率/批量/上限用于后续步骤，模型与历史保留。'); }
    catch (error) { fail(error); }
  }
  function reset() { configure({ ...DEFAULT_ARCHITECTURE, hiddenSizes: [4] }, DEFAULT_SEED, { ...DEFAULT_TRAINING }, '已恢复默认 XOR 网络、种子和训练设置，训练记录从零开始。'); }
  function reinitialize() { configure(architecture, seed, settings, '已按当前结构和种子重新初始化参数；训练记录已清空。同一种子可重复得到相同参数。'); }
  function clearCurve() { pause(); commit(clearLossHistory(current.current)); setMessage('仅清空损失曲线，保留当前模型、更新次数和最近快照。'); }
  return { architecture, seed, settings, session, status, message, revision, configure, changeSettings, pause, stop, start, step, reset, reinitialize, clearCurve };
}
export type MLPEngine = ReturnType<typeof useMLPTraining>;

