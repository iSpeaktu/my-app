-- Supabase DB migration for iSpeaktu
-- Creates students and teachers tables and ensures case-insensitive uniqueness on student names

-- Note: Run this in the Supabase SQL Editor or via psql / supabase CLI against your project.

BEGIN;

-- Enable pgcrypto for gen_random_uuid() (Supabase supports this)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Students table
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text,
  email text,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  metadata jsonb
);

-- Case-insensitive unique index on the normalized name (prevents duplicates like John vs john)
CREATE UNIQUE INDEX IF NOT EXISTS students_unique_lower_name_idx ON public.students (lower(name));

-- Optional unique index on email (lowercased)
CREATE UNIQUE INDEX IF NOT EXISTS students_unique_lower_email_idx ON public.students (lower(email));

-- Teachers table (simple code-based access)
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  code text UNIQUE NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

COMMIT;

-- Usage notes:
-- • Run this file in the Supabase SQL editor (Dashboard → SQL Editor → New Query) and execute.
-- • Or use the Supabase CLI: `supabase db remote set <CONN>` then `psql <CONN> -f supabase_migration.sql`.
-- • After running, your app's `studentAuthSignUp` and DB helpers will be able to upsert and look up by `name`/`display_name` safely.
