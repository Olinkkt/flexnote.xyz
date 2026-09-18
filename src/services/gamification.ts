import { useState, useEffect, useCallback } from 'react';
import { GamificationState } from '../types/notes';
import { UserProfile, updateUserGamification, purchaseStreakFreeze } from './supabase';

const GAMIFICATION_STORAGE_KEY = 'flexnote_gamification_v2';
const GAMIFICATION_EVENT = 'flexnote_gamification_updated';

// Helper to get local date string YYYY-MM-DD
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get yesterday date string
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

// Get Monday of current ISO week (YYYY-MM-DD)
export function getMondayOfCurrentWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return getLocalDateString(date);
}

const DEFAULT_STATE: GamificationState = {
  diamonds: 0,
  weeklyDiamonds: 0,
  streakDays: 0,
  bestStreak: 0,
  streakFreezes: 0,
  studyTimeSeconds: 0,
  weeklyStudySeconds: 0,
  lastStudyDate: null,
};

/**
 * Load gamification state from localStorage or initialize with profile
 */
export function loadGamificationState(profile?: UserProfile | null): GamificationState {
  // Clear legacy mock baseline from v1 if present in browser
  try {
    localStorage.removeItem('flexnote_gamification_v1');
  } catch {}

  let state = { ...DEFAULT_STATE };

  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch {}

  if (profile) {
    // Database profile is the authoritative source of truth for logged-in user
    state.diamonds = profile.diamonds ?? 0;
    state.weeklyDiamonds = profile.weekly_diamonds ?? 0;
    state.streakDays = profile.streak_days ?? 0;
    state.bestStreak = profile.best_streak ?? 0;
    state.streakFreezes = profile.streak_freezes ?? 0;
    state.studyTimeSeconds = profile.study_time_seconds ?? 0;
    state.weeklyStudySeconds = profile.weekly_study_seconds ?? 0;
    state.lastStudyDate = profile.last_study_date ?? null;
  }

  // Check weekly reset (compare stored Monday with current Monday)
  const currentMonday = getMondayOfCurrentWeek();
  const storedMonday = localStorage.getItem('flexnote_current_week_monday');
  if (storedMonday !== currentMonday) {
    state.weeklyDiamonds = 0;
    state.weeklyStudySeconds = 0;
    localStorage.setItem('flexnote_current_week_monday', currentMonday);
    saveGamificationState(state);
  }

  return state;
}

/**
 * Save gamification state to localStorage and optionally sync with cloud
 */
export function saveGamificationState(state: GamificationState, userId?: string) {
  try {
    localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(GAMIFICATION_EVENT, { detail: state }));
  } catch {}

  if (userId && userId !== 'guest') {
    updateUserGamification(userId, {
      diamonds: state.diamonds,
      weekly_diamonds: state.weeklyDiamonds,
      streak_days: state.streakDays,
      best_streak: state.bestStreak,
      streak_freezes: state.streakFreezes,
      study_time_seconds: state.studyTimeSeconds,
      weekly_study_seconds: state.weeklyStudySeconds,
      last_study_date: state.lastStudyDate,
    }).catch((err) => console.warn('Gamification sync background error:', err));
  }
}

export interface StudyRecordResult {
  state: GamificationState;
  streakMaintained: boolean;
  streakIncremented: boolean;
  streakRescued: boolean;
  diamondsAdded: number;
}

/**
 * Record active study time, maintain streak, award diamonds, and trigger saves
 */
export function recordStudyActivity(
  params: {
    studySeconds?: number;
    diamondsToAdd?: number;
    userId?: string;
  }
): StudyRecordResult {
  const currentState = loadGamificationState();
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  let streakIncremented = false;
  let streakMaintained = false;
  let streakRescued = false;

  const lastDate = currentState.lastStudyDate;

  if (lastDate === today) {
    // Already studied today
    streakMaintained = true;
  } else if (lastDate === yesterday) {
    // Studied yesterday, increment streak!
    currentState.streakDays = (currentState.streakDays || 0) + 1;
    currentState.bestStreak = Math.max(currentState.bestStreak, currentState.streakDays);
    currentState.lastStudyDate = today;
    streakIncremented = true;
  } else if (!lastDate) {
    // Brand new user
    currentState.streakDays = 1;
    currentState.bestStreak = 1;
    currentState.lastStudyDate = today;
    streakIncremented = true;
  } else {
    // Missed a day or more!
    if (currentState.streakFreezes > 0) {
      // Rescue with Streak Freeze!
      currentState.streakFreezes -= 1;
      currentState.lastStudyDate = today;
      streakRescued = true;
      streakMaintained = true;
    } else {
      // Reset streak
      currentState.streakDays = 1;
      currentState.lastStudyDate = today;
      streakIncremented = true;
    }
  }

  const seconds = Math.max(params.studySeconds || 0, 0);
  const diamonds = Math.max(params.diamondsToAdd || 0, 0);

  currentState.studyTimeSeconds += seconds;
  currentState.weeklyStudySeconds += seconds;
  currentState.diamonds += diamonds;
  currentState.weeklyDiamonds += diamonds;

  saveGamificationState(currentState, params.userId);

  return {
    state: currentState,
    streakMaintained,
    streakIncremented,
    streakRescued,
    diamondsAdded: diamonds,
  };
}

export interface AutoStreakRescueData {
  type: 'rescued' | 'lost';
  streakDays: number;
  remainingFreezes?: number;
}

/**
 * React Hook for consuming and modifying gamification state
 */
export function useGamification(profile?: UserProfile | null, userId?: string) {
  const [gamification, setGamification] = useState<GamificationState>(() =>
    loadGamificationState(profile)
  );
  const [autoRescueData, setAutoRescueData] = useState<AutoStreakRescueData | null>(null);

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      const merged = loadGamificationState(profile);
      setGamification(merged);
      try {
        localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
    }
  }, [profile]);

  // Listen to cross-component gamification updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GamificationState>;
      if (customEvent.detail) {
        setGamification(customEvent.detail);
      }
    };

    window.addEventListener(GAMIFICATION_EVENT, handleUpdate);
    return () => window.removeEventListener(GAMIFICATION_EVENT, handleUpdate);
  }, []);

  // Automatic check on app launch: did the student miss a day?
  useEffect(() => {
    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();
    const lastDate = gamification.lastStudyDate;

    // If student had an active streak and missed at least 1 day
    if (lastDate && lastDate !== today && lastDate !== yesterday && gamification.streakDays > 0) {
      const alreadyHandledToday = localStorage.getItem('flexnote_streak_loss_handled_date') === today;
      if (!alreadyHandledToday) {
        try {
          localStorage.setItem('flexnote_streak_loss_handled_date', today);
        } catch {}

        if (gamification.streakFreezes > 0) {
          // Automatic rescue with streak freeze!
          const newFreezes = gamification.streakFreezes - 1;
          const updated: GamificationState = {
            ...gamification,
            streakFreezes: newFreezes,
            lastStudyDate: yesterday, // protected so studying today maintains the streak!
          };
          saveGamificationState(updated, userId);
          setGamification(updated);
          setAutoRescueData({
            type: 'rescued',
            streakDays: gamification.streakDays,
            remainingFreezes: newFreezes,
          });
        } else {
          // Streak lost! Give student option to recover with diamonds or start fresh
          setAutoRescueData({
            type: 'lost',
            streakDays: gamification.streakDays,
          });
        }
      }
    }
  }, []);

  const addDiamonds = useCallback(
    (amount: number) => {
      return recordStudyActivity({ diamondsToAdd: amount, userId });
    },
    [userId]
  );

  const addStudyTime = useCallback(
    (seconds: number, diamondsBonus: number = 0) => {
      return recordStudyActivity({ studySeconds: seconds, diamondsToAdd: diamondsBonus, userId });
    },
    [userId]
  );

  const buyStreakFreeze = useCallback(async () => {
    if (gamification.diamonds < 50) {
      return { success: false, error: 'Nemáš dostatek drahokamů (potřebuješ 50 💎).' };
    }

    const updatedState: GamificationState = {
      ...gamification,
      diamonds: gamification.diamonds - 50,
      streakFreezes: gamification.streakFreezes + 1,
    };

    saveGamificationState(updatedState, userId);
    setGamification(updatedState);

    if (userId && userId !== 'guest') {
      await purchaseStreakFreeze(userId, gamification.diamonds, gamification.streakFreezes);
    }

    return { success: true };
  }, [gamification, userId]);

  const restoreStreakWithDiamonds = useCallback(async (): Promise<boolean> => {
    if (gamification.diamonds < 50) return false;
    const yesterday = getYesterdayDateString();

    const updated: GamificationState = {
      ...gamification,
      diamonds: gamification.diamonds - 50,
      lastStudyDate: yesterday, // keeps streak alive!
    };

    saveGamificationState(updated, userId);
    setGamification(updated);
    setAutoRescueData(null);
    return true;
  }, [gamification, userId]);

  const confirmStreakReset = useCallback(() => {
    const updated: GamificationState = {
      ...gamification,
      streakDays: 0,
      lastStudyDate: null,
    };
    saveGamificationState(updated, userId);
    setGamification(updated);
    setAutoRescueData(null);
  }, [gamification, userId]);

  const closeAutoRescueModal = useCallback(() => {
    setAutoRescueData(null);
  }, []);

  return {
    gamification,
    addDiamonds,
    addStudyTime,
    buyStreakFreeze,
    autoRescueData,
    restoreStreakWithDiamonds,
    confirmStreakReset,
    closeAutoRescueModal,
  };
}

