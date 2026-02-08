Supabase DB setup for iSpeaktu

This folder contains SQL to create the required schema and triggers for syncing Supabase Auth users into `public.students`.

Files
- `supabase_migration.sql` — creates `students` and `teachers` tables and helpful indexes (already added).
- `supabase_triggers.sql` — adds `auth_id` to `students` and creates triggers to insert/upsert rows when `auth.users` are created/updated.

Recommended order
1. Run `supabase_migration.sql` to create tables and indexes.
2. Run `supabase_triggers.sql` to add `auth_id` and the triggers.

How to run (Supabase SQL editor)
- Open your Supabase project → SQL Editor → New Query
- Copy the contents of `supabase_migration.sql` and execute.
- Then copy `supabase_triggers.sql` and execute.

How to run (psql)
1. Get your Supabase DB connection string from Project → Settings → Database → Connection string.
2. Run:

```bash
psql "<YOUR_SUPABASE_DB_URL>" -f db/supabase_migration.sql
psql "<YOUR_SUPABASE_DB_URL>" -f db/supabase_triggers.sql
```

How to run (Supabase CLI)
- If you have the Supabase CLI configured and your remote set:

```bash
supabase db remote set <CONN_NAME>
psql "<CONN_STRING_FROM_SUPABASE>" -f db/supabase_migration.sql
psql "<CONN_STRING_FROM_SUPABASE>" -f db/supabase_triggers.sql
```

Notes & suggestions
- The triggers insert or update `public.students` when a user is created in `auth.users` (signup via Supabase Auth). The `display_name` column is pulled from `user_metadata.username` or `user_metadata.fullName` if present, otherwise from the email local-part.
- We add `auth_id` to `students` so you can safely join `auth.users.id` to `students.auth_id`.
- Consider adding a UNIQUE constraint/index for `lower(name)` to prevent case-insensitive duplicates (the migration includes a unique index on `lower(name)`).
- If you want the reset-password flow to redirect users back to your app, set `redirectTo` in the reset call and configure the site URL in Supabase project settings.

If you'd like, I can:
- Add an npm script to run these migrations (requires `psql` and credentials).
- Apply these steps using the Supabase CLI instructions if you provide the connection name or run them locally and paste results.
