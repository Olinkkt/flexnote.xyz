import { useState, useEffect, useCallback } from 'react';
import { GamificationState } from '../types/notes';
import { UserProfile, updateUserGamification, purchaseStreakFreeze } from './supabase';

const GAMIFICATION_STORAGE_KEY = 'flexnote_gamification_v1';
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
  diamonds: 50, // Welcome gift
  weeklyDiamonds: 25,
  streakDays: 1,
  bestStreak: 1,
  streakFreezes: 1,
  studyTimeSeconds: 600, // 10 mins baseline
  weeklyStudySeconds: 600,
  lastStudyDate: getLocalDateString(),
};

/**
 * Load gamification state from localStorage or initialize with profile
 */
export function loadGamificationState(profile?: UserProfile | null): GamificationState {
  let state = { ...DEFAULT_STATE };

  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch {}

  if (profile) {
    state.diamonds = Math.max(state.diamonds, profile.diamonds ?? 0);
    state.weeklyDiamonds = Math.max(state.weeklyDiamonds, profile.weekly_diamonds ?? 0);
    state.streakDays = Math.max(state.streakDays, profile.streak_days ?? 0);
    state.bestStreak = Math.max(state.bestStreak, profile.best_streak ?? state.streakDays);
    state.streakFreezes = profile.streak_freezes ?? state.streakFreezes;
    state.studyTimeSeconds = Math.max(state.studyTimeSeconds, profile.study_time_seconds ?? 0);
    state.weeklyStudySeconds = Math.max(state.weeklyStudySeconds, profile.weekly_study_seconds ?? 0);
    if (profile.last_study_date) {
      state.lastStudyDate = profile.last_study_date;
    }
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

/**
 * React Hook for consuming and modifying gamification state
 */
export function useGamification(profile?: UserProfile | null, userId?: string) {
  const [gamification, setGamification] = useState<GamificationState>(() =>
    loadGamificationState(profile)
  );

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      const merged = loadGamificationState(profile);
      setGamification(merged);
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

  return {
    gamification,
    addDiamonds,
    addStudyTime,
    buyStreakFreeze,
  };
}
