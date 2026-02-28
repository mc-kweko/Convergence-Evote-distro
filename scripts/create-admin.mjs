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

async function createAdmin() {
  try {
    const email = 'admin@jinjacollege.edu';
    const password = 'admin123';
    const role = 'chairperson_electoral_commission';

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ email, password_hash: password, role })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    console.log('✓ Admin user created successfully:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('  Role:', role);
  } catch (error) {
    console.error('Error creating admin:', error.message);
  }
}

createAdmin();
