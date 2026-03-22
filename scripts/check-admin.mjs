import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

async function checkAdmin() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.admin@school.edu`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });

    const data = await response.json();
    
    if (data.length === 0) {
      console.log('❌ Admin user NOT found in database!');
      console.log('Run: node scripts/create-admin-simple.mjs');
    } else {
      console.log('✅ Admin user found:');
      console.log('   Email:', data[0].email);
      console.log('   Password:', data[0].password_hash);
      console.log('   Role:', data[0].role);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdmin();

