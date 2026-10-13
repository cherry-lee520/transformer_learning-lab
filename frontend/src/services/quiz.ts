import type { QuizAnswer, QuizQuestion } from '../lessons/contentTypes.ts';
import { withinTolerance } from './numbers.ts';
export function judgeAnswer(question: QuizQuestion, answer: QuizAnswer): { valid: boolean; correct: boolean } {
  if (question.kind === 'numeric') {
    if (typeof answer !== 'string' || !answer.trim()) return { valid: false, correct: false };
    const number = Number(answer);
    if (!Number.isFinite(number)) return { valid: false, correct: false };
    return { valid: true, correct: withinTolerance(number, question.answer, question.tolerance) };
  }
  const ids = new Set(question.options.map(option => option.id));
  if (question.kind === 'single') return { valid: typeof answer === 'string' && ids.has(answer), correct: answer === question.correctOptionId };
  if (!Array.isArray(answer) || !answer.length || answer.some(id => !ids.has(id))) return { valid: false, correct: false };
  const selected = new Set(answer);
  return { valid: true, correct: selected.size === question.correctOptionIds.length && question.correctOptionIds.every(id => selected.has(id)) };
}
