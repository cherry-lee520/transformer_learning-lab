import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import type { LearningStatus } from '../lessons/types';
const labels = { not_started: '未开始', in_progress: '学习中', completed: '已完成' };
export function LessonStatus({ status }: { status: LearningStatus }) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'in_progress' ? CircleDot : Circle;
  return <span className={`lesson-status status-${status}`}><Icon size={14} />{labels[status]}</span>;
}
