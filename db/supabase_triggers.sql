-- Supabase triggers to sync auth.users -> public.students
-- Run this after running supabase_migration.sql

BEGIN;

-- Add auth_id column to reference auth.users
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS auth_id uuid;

-- Function: handle new auth user (insert or update students row)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  display text;
  normalized text;
BEGIN
  display := coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'fullName', split_part(new.email, '@', 1));
  normalized := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));

  -- Try to update existing student by normalized name or display_name
  UPDATE public.students
    SET display_name = COALESCE(display, display_name),
        email = COALESCE(new.email, email),
        auth_id = COALESCE(auth_id, new.id)
    WHERE lower(coalesce(name, '')) = normalized
       OR lower(coalesce(display_name, '')) = normalized;

  IF NOT FOUND THEN
    INSERT INTO public.students (auth_id, name, display_name, email, created_at)
    VALUES (new.id, normalized, display, new.email, now());
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: handle updates to auth user (keep students row in sync)
CREATE OR REPLACE FUNCTION public.handle_update_auth_user()
RETURNS trigger AS $$
DECLARE
  display text;
  normalized text;
BEGIN
  display := coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'fullName', split_part(new.email, '@', 1));
  normalized := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));

  UPDATE public.students
    SET display_name = display,
        email = new.email,
        auth_id = COALESCE(auth_id, new.id)
    WHERE lower(coalesce(name, '')) = normalized
       OR lower(coalesce(display_name, '')) = normalized
       OR auth_id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data, email ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_update_auth_user();

COMMIT;

-- Notes:
-- • Run this in the Supabase SQL Editor after creating the students table.
-- • The triggers use auth.users and require appropriate privileges (Supabase projects allow this in SQL editor).
-- • Consider adding an index on auth_id if you plan to join frequently:
--     CREATE INDEX IF NOT EXISTS idx_students_auth_id ON public.students(auth_id);
