const { execSync } = require('child_process');

// Simple runner for migrations using SUPABASE_DB_URL environment variable.
// Usage: SUPABASE_DB_URL="postgres://..." node scripts/run-migrations-psql.js

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('Error: SUPABASE_DB_URL environment variable is required.');
  console.error('Example: export SUPABASE_DB_URL="postgres://..."');
  process.exit(1);
}

try {
  console.log('Running supabase_migration.sql...');
  execSync(`psql "${dbUrl}" -f db/supabase_migration.sql`, { stdio: 'inherit' });
  console.log('Running supabase_triggers.sql...');
  execSync(`psql "${dbUrl}" -f db/supabase_triggers.sql`, { stdio: 'inherit' });
  console.log('Migrations applied successfully.');
} catch (err) {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
}
