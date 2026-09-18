export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      notes: {
        Row: {
          created_at: string | null
          flashcards: Json | null
          id: string
          markdown: string
          quiz_data: Json | null
          reading_time: string | null
          subject: string
          summary: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          flashcards?: Json | null
          id?: string
          markdown: string
          quiz_data?: Json | null
          reading_time?: string | null
          subject: string
          summary?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          flashcards?: Json | null
          id?: string
          markdown?: string
          quiz_data?: Json | null
          reading_time?: string | null
          subject?: string
          summary?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          diamonds: number | null
          email: string | null
          full_name: string | null
          grade: string | null
          id: string
          school: string | null
          streak_days: number | null
          study_time_seconds: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          diamonds?: number | null
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id: string
          school?: string | null
          streak_days?: number | null
          study_time_seconds?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          diamonds?: number | null
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id?: string
          school?: string | null
          streak_days?: number | null
          study_time_seconds?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
