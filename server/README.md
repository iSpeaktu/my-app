# Server (Express) — scaffold

This is a minimal Express server scaffold with placeholder routes.

Quick start

1. cd server
2. npm install
3. copy .env.example to .env and fill values
4. npm run dev   # requires nodemon

Available endpoints (placeholders)
- GET /api/health
- POST /api/auth/student/login
- POST /api/auth/student/signup
- POST /api/auth/reset-password
- GET /api/materials
- GET /api/materials/:materialId/lesson?level=&lessonNumber=
- POST /api/students/:studentId/history

Next steps
- Add your Supabase service role key to `.env` and implement DB calls in `controllers/*` using `@supabase/supabase-js` or your preferred DB client.
- Implement authentication and token verification middleware.
- Replace placeholder controllers with real logic and tests.
