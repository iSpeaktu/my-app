-- 004_add_lesson_history_fk.sql
-- Add foreign key constraint from lesson_history.lesson_track_id -> lesson_tracks.id
-- This will NULL-out any orphaned values first to avoid constraint failures.

BEGIN;

-- NULL out orphaned lesson_track_id values (safety step)
UPDATE public.lesson_history lh
SET lesson_track_id = NULL
WHERE lesson_track_id IS NOT NULL
  AND lesson_track_id NOT IN (SELECT id FROM public.lesson_tracks);

-- Add FK constraint (ON DELETE SET NULL to avoid cascade deletions)
ALTER TABLE public.lesson_history
  ADD CONSTRAINT fk_lesson_history_track FOREIGN KEY (lesson_track_id)
  REFERENCES public.lesson_tracks (id) ON DELETE SET NULL;

COMMIT;
