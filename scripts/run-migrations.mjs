import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const { Client } = pg;

// Use the direct PostgreSQL connection URL
const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable');
  process.exit(1);
}

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✓ Connected to database');

    // Read migration files
    const schemaPath = path.join(__dirname, '01-create-schema.sql');
    const rlsPath = path.join(__dirname, '02-rls-policies.sql');
    const multiTenantPath = path.join(__dirname, '03-multi-tenant-upgrade.sql');

    console.log('\nRunning schema migration...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('✓ Schema migration completed');

    console.log('\nRunning RLS policies migration...');
    const rlsSql = fs.readFileSync(rlsPath, 'utf-8');
    await client.query(rlsSql);
    console.log('✓ RLS policies applied');

    console.log('\nRunning multi-tenant upgrade migration...');
    const multiTenantSql = fs.readFileSync(multiTenantPath, 'utf-8');
    await client.query(multiTenantSql);
    console.log('✓ Multi-tenant upgrade completed');

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
