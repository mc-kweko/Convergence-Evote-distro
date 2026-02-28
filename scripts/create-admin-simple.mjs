import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const email = 'admin@jinjacollege.edu';
  const password = 'admin123';
  const role = 'chairperson_electoral_commission';

  const { data, error } = await supabase
    .from('users')
    .upsert({ email, password_hash: password, role })
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('✓ Admin created:');
    console.log('  Email:', email);
    console.log('  Password:', password);
  }
}

createAdmin();
