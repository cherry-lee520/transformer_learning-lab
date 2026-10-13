import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { lessons, lessonById } from '../lessons';
import { calculateProgress, emptyProgress, getLessonProgress, recentLessons, updateLessonProgress } from '../services/learningProgress';
import { decodeProgress, loadProgress, PROGRESS_STORAGE_KEY, saveProgress } from '../services/progressStorage';
import type { LoadResult } from '../services/progressStorage';
const validIds = new Set(lessonById.keys());
function initialProgress(): LoadResult {
  try { return loadProgress(window.localStorage, validIds); }
  catch { return { state: emptyProgress(), warning: '浏览器存储不可用，本次记录仅保留在当前页面。', writable: false }; }
}
function useLearningState() {
  const [loaded, setLoaded] = useState(initialProgress);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const state = loaded.state;
  useEffect(() => {
    if (!loaded.writable) return;
    try { setSaveWarning(saveProgress(window.localStorage, state)); }
    catch { setSaveWarning('浏览器存储不可用，本次记录仅保留在当前页面。'); }
  }, [state, loaded.writable]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) return;
      setLoaded(decodeProgress(event.key === null ? null : event.newValue, validIds));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const apply = useCallback((id: string, action: 'visit' | 'complete' | 'undo') => {
    setLoaded(current => ({ ...current, state: updateLessonProgress(current.state, id, action, validIds) }));
  }, []);
  const visitLesson = useCallback((id: string) => apply(id, 'visit'), [apply]);
  const completeLesson = useCallback((id: string) => apply(id, 'complete'), [apply]);
  const undoComplete = useCallback((id: string) => apply(id, 'undo'), [apply]);
  const summary = useMemo(() => calculateProgress(lessons, state.records), [state.records]);
  const recent = useMemo(() => recentLessons(state), [state]);
  return {
    state, summary, recent, visitLesson, completeLesson, undoComplete,
    statusOf: (id: string) => getLessonProgress(state, id).status,
    continueId: state.recentLessonId ?? lessons[0].id,
    warning: saveWarning ?? loaded.warning,
  };
}
type LearningState = ReturnType<typeof useLearningState>;
const LearningContext = createContext<LearningState | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const value = useLearningState();
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}
export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error('LearningProvider is required');
  return context;
}
