-- 002_lesson_history_index.sql
-- Create an index to speed lookups by lesson_track_id.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_lesson_history_lesson_track_id ON public.lesson_history (lesson_track_id);

COMMIT;
