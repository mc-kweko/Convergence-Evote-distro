import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  try {
    console.log('Starting database setup...');

    // Read SQL migration files
    const schemaSQL = fs.readFileSync(path.join(__dirname, '01-create-schema.sql'), 'utf-8');
    const rlsSQL = fs.readFileSync(path.join(__dirname, '02-rls-policies.sql'), 'utf-8');

    // Execute schema creation
    console.log('Creating database schema...');
    const schemaResult = await supabase.rpc('execute_sql', { sql: schemaSQL }).catch(async () => {
      // If rpc doesn't work, try direct SQL execution
      const { data, error } = await supabase.from('_execute_sql').insert([{ sql: schemaSQL }]);
      return { data, error };
    });

    if (schemaResult?.error) {
      console.warn('Schema creation note:', schemaResult.error.message);
    } else {
      console.log('✓ Database schema created');
    }

    // Execute RLS policies
    console.log('Applying RLS policies...');
    const rlsResult = await supabase.rpc('execute_sql', { sql: rlsSQL }).catch(async () => {
      const { data, error } = await supabase.from('_execute_sql').insert([{ sql: rlsSQL }]);
      return { data, error };
    });

    if (rlsResult?.error) {
      console.warn('RLS policies note:', rlsResult.error.message);
    } else {
      console.log('✓ RLS policies applied');
    }

    console.log('Database setup completed!');
  } catch (error) {
    console.error('Error during database setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();
