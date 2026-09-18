import { useState, useEffect, useRef } from 'react';
import { recordStudyActivity } from './gamification';
import { playDiamondSound } from '../utils/audio';
import { vibrateLight } from '../utils/haptics';

export interface UseActiveStudyTrackerOptions {
  userId?: string;
  contextName?: string; // 'note' | 'flashcards' | 'quiz'
  onDiamondBonus?: (amount: number) => void;
}

export function formatStudyDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} h ${remainingMins} min`;
}

/**
 * Hook to track active, focused study time with anti-cheat idle detection.
 */
export function useActiveStudyTracker(
  isActive: boolean,
  options: UseActiveStudyTrackerOptions = {}
) {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const uncommittedSecondsRef = useRef<number>(0);
  const continuousSecondsRef = useRef<number>(0);

  // User activity listeners for idle detection (45 seconds timeout)
  useEffect(() => {
    if (!isActive) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (isIdle) setIsIdle(false);
    };

    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('mousedown', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });
    window.addEventListener('scroll', resetActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('mousedown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('scroll', resetActivity);
    };
  }, [isActive, isIdle]);

  // Main 1-second ticker with active checks
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // 1. Check if browser tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        setIsIdle(true);
        return;
      }

      // 2. Check if user has been inactive for more than 45 seconds
      const elapsedSinceActivity = Date.now() - lastActivityRef.current;
      if (elapsedSinceActivity > 45000) {
        setIsIdle(true);
        return;
      }

      setIsIdle(false);
      setSessionSeconds((prev) => prev + 1);
      uncommittedSecondsRef.current += 1;
      continuousSecondsRef.current += 1;

      // 3. Batch commit every 15 seconds to localStorage/Supabase
      if (uncommittedSecondsRef.current >= 15) {
        recordStudyActivity({
          studySeconds: uncommittedSecondsRef.current,
          userId: options.userId,
        });
        uncommittedSecondsRef.current = 0;
      }

      // 4. Reward +5 Diamonds for every 120 seconds (2 mins) of focused active study
      if (continuousSecondsRef.current >= 120) {
        continuousSecondsRef.current = 0;
        recordStudyActivity({
          diamondsToAdd: 5,
          userId: options.userId,
        });
        playDiamondSound();
        vibrateLight();
        options.onDiamondBonus?.(5);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      // Flush uncommitted seconds on unmount / finish
      if (uncommittedSecondsRef.current > 0) {
        recordStudyActivity({
          studySeconds: uncommittedSecondsRef.current,
          userId: options.userId,
        });
        uncommittedSecondsRef.current = 0;
      }
    };
  }, [isActive, options.userId]);

  return {
    sessionSeconds,
    isIdle,
    formattedDuration: formatStudyDuration(sessionSeconds),
  };
}
