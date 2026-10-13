import { useCallback, useEffect, useRef, useState } from 'react';
export function useForwardPlayer(totalSteps = 6) {
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current !== null) clearTimeout(timer.current);
    setPlaying(false);
  }, []);
  const reset = useCallback(() => { stop(); setStep(1); }, [stop]);
  const go = useCallback((next: number) => { stop(); setStep(Math.max(1, Math.min(totalSteps, next))); }, [stop, totalSteps]);
  useEffect(() => {
    if (!playing || step >= totalSteps) return;
    const current = generation.current;
    timer.current = setTimeout(() => {
      if (current !== generation.current) return;
      setStep(step + 1);
      if (step + 1 === totalSteps) setPlaying(false);
    }, 1200 / speed);
    return () => { if (timer.current !== null) clearTimeout(timer.current); };
  }, [playing, speed, step, totalSteps]);
  const play = () => { generation.current++; if (step === totalSteps) setStep(1); setPlaying(true); };
  const changeSpeed = (value: number) => { if ([0.5, 1, 2].includes(value) && value !== speed) { generation.current++; setSpeed(value); } };
  return { step, playing, speed, play, pause: stop, reset, go, changeSpeed };
}
