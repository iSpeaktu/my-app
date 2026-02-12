-- 003_backfill_lesson_history_track.sql
/*
Backfill `lesson_history.lesson_track_id` values where NULL.
Customize the mapping logic below for your dataset before running.

Common approaches:
- Use a mapping table `lesson_to_track(lesson_id, track_id)` and join to set values.
- Infer track from lesson_id naming conventions.
- Use student's `current_lesson_track_id` for older rows as a heuristic.

Run this script on a test database first and verify the updated rows.
*/

BEGIN;

-- Preview rows lacking lesson_track_id
SELECT count(*) AS missing_count FROM public.lesson_history WHERE lesson_track_id IS NULL;

-- Example heuristic: copy student's current_lesson_track_id into lesson_history when available.
-- This is a best-effort approach; replace with stronger mapping if available.
UPDATE public.lesson_history lh
SET lesson_track_id = s.current_lesson_track_id
FROM public.students s
WHERE lh.student_id = s.id
  AND lh.lesson_track_id IS NULL
  AND s.current_lesson_track_id IS NOT NULL;

-- Add custom mapping updates below if you have a lesson->track mapping table or rules.
-- Example (uncomment and adapt):
-- UPDATE public.lesson_history lh
-- SET lesson_track_id = m.track_id
-- FROM lesson_to_track m
-- WHERE lh.lesson_id = m.lesson_id AND lh.lesson_track_id IS NULL;

COMMIT;
