import { Brain, Code2, Focus, Languages, Layers3 } from 'lucide-react';
import type { CourseIcon as IconName } from '../lessons/types';
const icons = { brain: Brain, code: Code2, focus: Focus, languages: Languages, layers: Layers3 };
export function CourseIcon({ name }: { name: IconName }) {
  const Icon = icons[name];
  return <Icon size={20} aria-hidden="true" />;
}
