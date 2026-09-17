import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { NoteItem, SubjectType } from '../types/notes';

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
