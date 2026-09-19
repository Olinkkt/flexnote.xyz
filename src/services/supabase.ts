import { createClient, User } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { NoteItem, SubjectType, LeaderboardEntry, LeaderboardMetric, LeaderboardTimeframe } from '../types/notes';

export type { User };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xqfayanykuaijqemwlfk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZmF5YW55a3VhaWpxZW13bGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODAzODUsImV4cCI6MjEwNTI1NjM4NX0.pTB1DT1FW5TsCWSXjvUqBwWOfbq2KGTmtjqvCDDfCRE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Fetch notes from Supabase
 */
export async function fetchNotesFromCloud(
  userId?: string,
  limit?: number,
  offset?: number
): Promise<NoteItem[]> {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (typeof limit === 'number' && limit > 0) {
    const from = offset || 0;
    const to = from + limit - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch notes from Supabase:', error.message);
    throw error;
  }

  return (data || []).map(mapRowToNoteItem);
}

/**
 * Maps a Supabase notes row to the frontend NoteItem format
 */
export function mapRowToNoteItem(row: any): NoteItem {
  let parsedFlashcards = [];
  if (Array.isArray(row.flashcards)) {
    parsedFlashcards = row.flashcards;
  } else if (typeof row.flashcards === 'string') {
    try {
      parsedFlashcards = JSON.parse(row.flashcards);
    } catch {
      parsedFlashcards = [];
    }
  }

  let parsedQuiz = undefined;
  if (row.quiz_data) {
    if (typeof row.quiz_data === 'object') {
      parsedQuiz = row.quiz_data;
    } else if (typeof row.quiz_data === 'string') {
      try {
        parsedQuiz = JSON.parse(row.quiz_data);
      } catch {
        parsedQuiz = undefined;
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    topic: row.topic || undefined,
    subject: (row.subject as SubjectType) || 'czech',
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString('cs-CZ', {
          day: 'numeric',
          month: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Právě teď',
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    thumbnailUrl:
      row.thumbnail_url ||
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=80',
    readingTime: row.reading_time || '2 min',
    accuracy: 98,
    status: 'new',
    summary: row.summary || '',
    tags: row.tags || [row.subject || 'Zápisky'],
    markdown: row.markdown,
    flashcards: parsedFlashcards,
    quiz: parsedQuiz,
  };
}

/**
 * Save a new note to Supabase
 */
export async function saveNoteToCloud(note: NoteItem, userId?: string): Promise<NoteItem> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: note.title,
      topic: note.topic || null,
      subject: note.subject,
      markdown: note.markdown,
      summary: note.summary,
      thumbnail_url: note.thumbnailUrl,
      reading_time: note.readingTime,
      tags: note.tags,
      flashcards: (note.flashcards || []) as any,
      quiz_data: (note.quiz || null) as any,
      user_id: userId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save note to Supabase:', error.message);
    throw error;
  }

  return mapRowToNoteItem(data);
}

/**
 * Update an existing note in Supabase
 */
export async function updateNoteInCloud(
  noteId: string,
  updates: Partial<Pick<NoteItem, 'title' | 'markdown' | 'summary' | 'subject' | 'flashcards' | 'quiz' | 'topic'>>
): Promise<NoteItem> {
  const dbUpdates: Database['public']['Tables']['notes']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.topic !== undefined) dbUpdates.topic = updates.topic || null;
  if (updates.markdown !== undefined) dbUpdates.markdown = updates.markdown;
  if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
  if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
  if (updates.flashcards !== undefined) dbUpdates.flashcards = updates.flashcards as any;
  if (updates.quiz !== undefined) dbUpdates.quiz_data = updates.quiz as any;

  const { data, error } = await supabase
    .from('notes')
    .update(dbUpdates)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update note in Supabase:', error.message);
    throw error;
  }

  return mapRowToNoteItem(data);
}

/**
 * Delete a note from Supabase
 */
export async function deleteNoteFromCloud(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) {
    console.error('Failed to delete note from Supabase:', error.message);
    throw error;
  }
}

export interface RealtimeNotesCallbacks {
  onInsert?: (newNote: NoteItem) => void;
  onUpdate?: (updatedNote: NoteItem) => void;
  onDelete?: (deletedNoteId: string) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

/**
 * Subscribes to Realtime Postgres changes for a user's notes
 */
export function subscribeToUserNotes(
  userId: string,
  callbacks: RealtimeNotesCallbacks
) {
  const channel = supabase
    .channel(`realtime-notes-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
      },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (payload.eventType === 'INSERT') {
          if (newRow && (!newRow.user_id || newRow.user_id === userId)) {
            const note = mapRowToNoteItem(newRow);
            callbacks.onInsert?.(note);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (newRow && (!newRow.user_id || newRow.user_id === userId)) {
            const note = mapRowToNoteItem(newRow);
            callbacks.onUpdate?.(note);
          }
        } else if (payload.eventType === 'DELETE') {
          if (oldRow && oldRow.id) {
            if (!oldRow.user_id || oldRow.user_id === userId) {
              callbacks.onDelete?.(oldRow.id);
            }
          }
        }
      }
    )
    .subscribe((status) => {
      callbacks.onStatusChange?.(status as any);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to Realtime changes for a user's profile
 */
export function subscribeToUserProfile(
  userId: string,
  onProfileUpdate: (profile: UserProfile) => void
) {
  const channel = supabase
    .channel(`realtime-profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onProfileUpdate(payload.new as UserProfile);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
  avatar_url: string | null;
  streak_days: number | null;
  best_streak: number | null;
  streak_freezes: number | null;
  diamonds: number | null;
  weekly_diamonds: number | null;
  study_time_seconds: number | null;
  weekly_study_seconds: number | null;
  last_study_date: string | null;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetch profile for a user ID
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Could not fetch user profile:', error.message);
    return null;
  }
  return data as UserProfile;
}

/**
 * Update user profile in Supabase
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'username' | 'school' | 'grade'>>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update user profile:', error.message);
    throw error;
  }

  return data as UserProfile;
}

// In-memory cache for username availability to avoid duplicate database requests
const usernameAvailabilityCache = new Map<string, boolean>();

/**
 * Check if a username is available (not taken by another user).
 * Uses in-memory caching and abort signal to eliminate database spam.
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
  signal?: AbortSignal
): Promise<boolean> {
  const clean = username.trim().toLowerCase();

  // 1. Check in-memory cache first (0ms, 0 network requests)
  if (usernameAvailabilityCache.has(clean)) {
    return usernameAvailabilityCache.get(clean)!;
  }

  // 2. Query database with limit(1) using the unique B-Tree index
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('username', clean)
    .limit(1);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error) throw error;

  const isAvailable = !data || data.length === 0;

  // 3. Cache the verified result in memory
  usernameAvailabilityCache.set(clean, isAvailable);

  return isAvailable;
}

/**
 * Resend email verification link
 */
export async function resendVerificationEmail(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  if (error) throw error;
  return data;
}

/**
 * Check current authenticated user and refreshed verification status
 */
export async function checkCurrentUserVerification(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Upload note image to Supabase Storage bucket 'notes-media'
 * Returns the public CDN URL of the uploaded image.
 */
export async function uploadNoteImage(
  file: File | Blob,
  userId?: string,
  fileName?: string
): Promise<string> {
  const ext =
    file instanceof File && file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';

  const userFolder = userId || 'shared';
  const uniqueName = fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const filePath = `${userFolder}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from('notes-media')
    .upload(filePath, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Failed to upload note image to Supabase Storage:', error.message);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('notes-media')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Call the send-notes-export Edge Function to email notes to the student
 */
export async function sendNotesExportEmail(params: {
  userEmail: string;
  userName: string;
  notesCount: number;
  markdown: string;
}): Promise<{ success: boolean; needsConfig?: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notes-export', {
      body: params,
    });

    if (error) {
      console.warn('Edge function invoke error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return data || { success: false, error: 'Prázdná odpověď od e-mailové služby.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Update gamification metrics for a user (streak, diamonds, study time)
 */
export async function updateUserGamification(
  userId: string,
  updates: Partial<Pick<UserProfile, 'streak_days' | 'best_streak' | 'streak_freezes' | 'diamonds' | 'weekly_diamonds' | 'study_time_seconds' | 'weekly_study_seconds' | 'last_study_date'>>
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update gamification in cloud:', error.message);
      return null;
    }
    return data as UserProfile;
  } catch (err) {
    console.warn('Network error updating gamification in cloud:', err);
    return null;
  }
}

/**
 * Buy a streak freeze with 50 diamonds
 */
export async function purchaseStreakFreeze(
  userId: string,
  currentDiamonds: number,
  currentFreezes: number
): Promise<{ success: boolean; newDiamonds?: number; newFreezes?: number; error?: string }> {
  if (currentDiamonds < 50) {
    return { success: false, error: 'Nemáš dostatek drahokamů (potřebuješ 50 💎).' };
  }

  try {
    const newDiamonds = currentDiamonds - 50;
    const newFreezes = (currentFreezes || 0) + 1;

    const { error } = await supabase
      .from('profiles')
      .update({
        diamonds: newDiamonds,
        streak_freezes: newFreezes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    return {
      success: true,
      newDiamonds,
      newFreezes,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Fetch leaderboard entries according to metric, timeframe, and optional school filter
 */
export async function fetchLeaderboard(
  metric: LeaderboardMetric,
  timeframe: LeaderboardTimeframe,
  schoolFilter?: string | null,
  currentUserId?: string
): Promise<LeaderboardEntry[]> {
  try {
    let query = supabase.from('profiles').select('*');

    if (schoolFilter && schoolFilter.trim()) {
      query = query.eq('school', schoolFilter.trim());
    }

    const sortColumn =
      metric === 'study_time'
        ? timeframe === 'weekly' ? 'weekly_study_seconds' : 'study_time_seconds'
        : metric === 'diamonds'
        ? timeframe === 'weekly' ? 'weekly_diamonds' : 'diamonds'
        : 'streak_days';

    query = query.order(sortColumn, { ascending: false }).limit(50);

    const { data, error } = await query;

    let entries: LeaderboardEntry[] = [];

    if (!error && data && data.length > 0) {
      entries = data.map((row) => ({
        id: row.id,
        username: row.username || row.full_name?.split(' ')[0]?.toLowerCase() || 'student',
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        school: row.school,
        grade: row.grade,
        studyTimeSeconds: row.study_time_seconds || 0,
        weeklyStudySeconds: row.weekly_study_seconds || 0,
        diamonds: row.diamonds || 0,
        weeklyDiamonds: row.weekly_diamonds || 0,
        streakDays: row.streak_days || 0,
        rank: 0,
        isCurrentUser: currentUserId ? row.id === currentUserId : false,
      }));
    }

    // Sort entries according to metric & timeframe
    entries.sort((a, b) => {
      if (metric === 'study_time') {
        const valA = timeframe === 'weekly' ? a.weeklyStudySeconds : a.studyTimeSeconds;
        const valB = timeframe === 'weekly' ? b.weeklyStudySeconds : b.studyTimeSeconds;
        return valB - valA;
      }
      if (metric === 'diamonds') {
        const valA = timeframe === 'weekly' ? a.weeklyDiamonds : a.diamonds;
        const valB = timeframe === 'weekly' ? b.weeklyDiamonds : b.diamonds;
        return valB - valA;
      }
      return b.streakDays - a.streakDays;
    });

    // Assign 1-indexed ranks
    return entries.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}



