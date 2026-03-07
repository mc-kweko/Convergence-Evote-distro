import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hlqhdgiujtjxppwvxhvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWhkZ2l1anRqeHBwd3Z4aHZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5OTI2NiwiZXhwIjoyMDg3Nzc1MjY2fQ.bFQBY-03W_0oGwvmkfOP3iMVkT9azF_1qE5CkLRqc8k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function hashAdminPassword() {
  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('No users found. Creating default admin...');
      
      // Create default admin with hashed password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email: 'admin@jinjacollege.edu',
          password_hash: hashedPassword,
          role: 'chairperson_electoral_commission'
        });

      if (insertError) throw insertError;
      
      console.log('✅ Default admin created successfully!');
      console.log('Email: admin@jinjacollege.edu');
      console.log('Password: admin123');
      console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN!');
      return;
    }

    // Hash existing passwords if they're not already hashed
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2)
      if (user.password_hash.startsWith('$2')) {
        console.log(`✅ Password for ${user.email} is already hashed`);
        continue;
      }

      console.log(`🔄 Hashing password for ${user.email}...`);
      const hashedPassword = await bcrypt.hash(user.password_hash, 10);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Failed to update ${user.email}:`, updateError);
      } else {
        console.log(`✅ Password hashed for ${user.email}`);
      }
    }

    console.log('\n✅ All passwords have been secured!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

hashAdminPassword();
