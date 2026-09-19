-- Migration: 20260919_performance_indexes.sql
-- Description: Production database indexes for Flexnote (flexnote.oliverseidl.dev)
-- Optimizes note fetching, subject filtering, and leaderboard rankings.

-- 1. Index on notes for user's notes ordered by created_at DESC (used on every app boot & notes list)
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON public.notes (user_id, created_at DESC);

-- 2. Index on notes subject for filtering by class/subject
CREATE INDEX IF NOT EXISTS idx_notes_subject ON public.notes (subject);

-- 3. Indexes on profiles for leaderboard sorting and filtering
CREATE INDEX IF NOT EXISTS idx_profiles_study_time ON public.profiles (study_time_seconds DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_study ON public.profiles (weekly_study_seconds DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_diamonds ON public.profiles (diamonds DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_diamonds ON public.profiles (weekly_diamonds DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON public.profiles (streak_days DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles (school);

-- 4. Index on custom schools for moderation status and school search
CREATE INDEX IF NOT EXISTS idx_custom_schools_status_name ON public.custom_schools (status, name);
