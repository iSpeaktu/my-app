-- 001_add_profiles_settings.sql
-- Add a JSONB `settings` column to `profiles` for storing user preferences.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.settings IS
  'Application-level settings/preferences stored as JSONB (e.g., {"theme":"dark","notifications":{"email":true}})';

COMMIT;
