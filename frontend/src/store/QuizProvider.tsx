import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { QuizAnswer } from '../lessons/contentTypes';
export interface QuizAttempt { answer: QuizAnswer; correct: boolean; submittedAt: string }
type Attempts = Record<string, Record<string, QuizAttempt>>;
const QuizContext = createContext<{ attempts: Attempts; record: (lessonId: string, blockId: string, attempt: QuizAttempt | null) => void } | null>(null);
export function QuizProvider({ children }: { children: ReactNode }) {
  const [attempts, setAttempts] = useState<Attempts>({});
  const record = useCallback((lessonId: string, blockId: string, attempt: QuizAttempt | null) => {
    setAttempts(current => {
      const lesson = { ...current[lessonId] };
      if (attempt) lesson[blockId] = attempt; else delete lesson[blockId];
      return { ...current, [lessonId]: lesson };
    });
  }, []);
  return <QuizContext.Provider value={{ attempts, record }}>{children}</QuizContext.Provider>;
}
export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) throw new Error('QuizProvider is required');
  return context;
}
