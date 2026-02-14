-- Add display_name column to students and backfill from profiles
BEGIN;

ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill existing students from profiles where available
UPDATE students
SET display_name = p.display_name
FROM profiles p
WHERE students.id = p.id
  AND (students.display_name IS NULL OR students.display_name = '');

COMMIT;
