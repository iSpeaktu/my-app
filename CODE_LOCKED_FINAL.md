CODE LOCKED - FINAL SNAPSHOT
===========================

Date: 2026-02-12

This file records the locked snapshot of the app after finalizing lesson-title persistence
and tutor UI adjustments requested by the project owner. No further structural changes should be
made while this snapshot is considered final.

Key changes included in this snapshot:

- Persist lesson title when recording lesson history
  - File: src/config/supabase.js
  - Behavior: `recordLessonHistory` queries `public.lessons` (by track_id, level, lesson_number)
    and stores the fetched title into the `lesson_title` column on insert/update.

- Tutor dashboard: show Lesson Number and Lesson Title in Quiz History
  - File: src/components/TutorDashboard.js
  - Behavior: Quiz history header displays `Lesson {lessonId}: {lesson_title}` (falls back to
    previously available `lessonTitle` or `material` if `lesson_title` is absent).

- Perfect-score UI enhancement
  - File: src/components/TutorDashboard.js
  - Behavior: A score of `100` is treated as a perfect score. The score text becomes `#BF40FF`.
    The Thumbs Up button for perfect attempts uses background `#BF40FF`, a purple glow
    `shadow-[0_0_15px_rgba(191,64,255,0.6)]`, and border `#DF80FF`.

Files modified in this snapshot:

- src/config/supabase.js
- src/components/TutorDashboard.js
- src/components/Dashboard/StudentDashboard.js (praise message preference for per-lesson title)

Next recommended steps (outside lock):

- Run the dev server and exercise a quiz to verify `lesson_title` is written to `lesson_history`.
- Confirm the tutor Quiz History shows the lesson title and the Thumbs Up button glow for 100%.
- If verification passes, create a release or tag this commit in your VCS to preserve the snapshot.

No other files or structures were changed. This snapshot is intended to be the finalized app state
for the current focus area (lesson-title persistence and Tutor dashboard display / styling).
Code locked as final — 2026-02-12

Summary:
- `src/components/Selection/SelectLessonView.js` final styling and behavior changes:
	- Removed purple/perfect-only glow styling.
	- Default lesson buttons initialize to background `#1f2937` and text `#004e57`.
	- Only `isCurrent` overrides to cyan styling; `isFailed` overrides to red.
	- Mini pop card now matches lesson status: slate `#1f2937` + border `#2D2D3A` for passed lessons; cyan only for `isCurrent`.
	- The card `START` button becomes `REVIEW` for passed lessons and uses dark teal `#004e57` as its background.
- No structural changes were made; logic kept intact.
	- Removed XP/weekly/perfect stat pills from the Tutor Dashboard student directory; these now appear only in the selected-student overview.
	- Restored student `name` display in the Tutor Dashboard student directory (name shows above track info).
	- Restored student `name` display in the Tutor Dashboard student directory (name shows above track info).
	- Renamed Tutor Dashboard stat label: "Total Enrolled" → "Total students".
	- Renamed Tutor Dashboard stat label: "Total Enrolled" → "Total students".
	- Replaced the Tutor Dashboard "Feedback Sent" card with a "Priority Tasks" card.
	  - `Priority Tasks` shows the count of students who need attention.
	  - A student needs attention when their last score is < 70 and no reminder exists for that lesson, or when their last score is 100 and no praise exists for that lesson.
	  - The card uses a purple gradient header (`from #7000FF`) to emphasize priority items.

Verification:
- Run `npm start` and open the Learning Path to confirm visuals and mini card behavior.

Note: If you want this state committed to your VCS, tell me and I can create a commit message next.