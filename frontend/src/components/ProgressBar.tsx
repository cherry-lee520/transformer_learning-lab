export function ProgressBar({ value, label = '学习进度' }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{ width: `${percent}%` }} /></div>;
}
