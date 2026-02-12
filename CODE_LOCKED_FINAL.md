Code locked as final — 2026-02-12

Summary:
- `src/components/Selection/SelectLessonView.js` final styling and behavior changes:
	- Removed purple/perfect-only glow styling.
	- Default lesson buttons initialize to background `#1f2937` and text `#004e57`.
	- Only `isCurrent` overrides to cyan styling; `isFailed` overrides to red.
	- Mini pop card now matches lesson status: slate `#1f2937` + border `#2D2D3A` for passed lessons; cyan only for `isCurrent`.
	- The card `START` button becomes `REVIEW` for passed lessons and uses dark teal `#004e57` as its background.
- No structural changes were made; logic kept intact.

Verification:
- Run `npm start` and open the Learning Path to confirm visuals and mini card behavior.

Note: If you want this state committed to your VCS, tell me and I can create a commit message next.