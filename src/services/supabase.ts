import { createClient, User } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { NoteItem, SubjectType } from '../types/notes';

export type { User };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xqfayanykuaijqemwlfk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZmF5YW55a3VhaWpxZW13bGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODAzODUsImV4cCI6MjEwNTI1NjM4NX0.pTB1DT1FW5TsCWSXjvUqBwWOfbq2KGTmtjqvCDDfCRE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Fetch notes from Supabase
 */
export async function fetchNotesFromCloud(userId?: string): Promise<NoteItem[]> {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch notes from Supabase:', error.message);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject as SubjectType,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Právě teď',
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    thumbnailUrl: row.thumbnail_url || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=80',
    readingTime: row.reading_time || '2 min',
    accuracy: 98,
    status: 'new',
    summary: row.summary || '',
    tags: row.tags || [row.subject, 'Zápisky'],
    markdown: row.markdown,
  }));
}

/**
 * Save a new note to Supabase
 */
export async function saveNoteToCloud(note: NoteItem, userId?: string): Promise<NoteItem> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: note.title,
      subject: note.subject,
      markdown: note.markdown,
      summary: note.summary,
      thumbnail_url: note.thumbnailUrl,
      reading_time: note.readingTime,
      tags: note.tags,
      user_id: userId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save note to Supabase:', error.message);
    throw error;
  }

  return {
    ...note,
    id: data.id,
    date: data.created_at ? new Date(data.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : note.date,
    timestamp: data.created_at ? new Date(data.created_at).getTime() : note.timestamp,
  };
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

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
  avatar_url: string | null;
  streak_days: number | null;
  diamonds: number | null;
  study_time_seconds: number | null;
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

/**
 * Check if a username is available (not taken by another user)
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string
): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  let query = supabase.from('profiles').select('id').eq('username', clean);
  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return !data || data.length === 0;
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

