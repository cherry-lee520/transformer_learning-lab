import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
export function useInputSweep(setInput: Dispatch<SetStateAction<number>>) {
  const [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pause = useCallback(() => { if (timer.current !== null) clearInterval(timer.current); timer.current = null; setPlaying(false); }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(media.matches); if (media.matches) pause(); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [pause]);
  useEffect(() => {
    if (playing && !reduced) timer.current = setInterval(() => setInput(current => current >= 6 ? -6 : Math.round((current + 0.1) * 10) / 10), 140);
    return () => { if (timer.current !== null) clearInterval(timer.current); timer.current = null; };
  }, [playing, reduced, setInput]);
  return { playing, reduced, pause, play: () => { if (!reduced) setPlaying(true); } };
}
