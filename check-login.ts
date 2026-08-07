import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from './src/config/env.js';
import { AdminUser } from './src/models/AdminUser.js';

async function checkLogin() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('🔄 Checking admin login credentials against DB...');
    
    const email = 'namanpuja@admin.com';
    const password = 'AdminUser@321';
    
    const admin = await AdminUser.findOne({ email });
    if (!admin) {
      console.log(`❌ Admin with email "${email}" not found in DB!`);
      return;
    }
    
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (isMatch) {
      console.log(`✅ Success! Login verified for:`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Name: ${admin.name}`);
      console.log(`   - Role: ${admin.role}`);
    } else {
      console.log(`❌ Password does not match for admin "${email}"!`);
    }
  } catch (err) {
    console.error('⚠️ Connection error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkLogin();
