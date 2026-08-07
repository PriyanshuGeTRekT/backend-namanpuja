import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { AdminUser } from '../src/models/AdminUser.js';

// Load environment variables
dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

async function createOrUpdateAdmin() {
  const args = process.argv.slice(2);
  const [email, password, name, role] = args;

  if (!email || !password || !name) {
    console.error('❌ Missing arguments.');
    console.log('Usage: npx tsx scripts/create-admin.ts <email> <password> <name> [role]');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri!);
    console.log('✅ Connected to MongoDB.');

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUser = await AdminUser.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.log(`ℹ️ Admin user with email "${normalizedEmail}" already exists. Updating details...`);
      existingUser.name = name.trim();
      existingUser.passwordHash = passwordHash;
      if (role) {
        existingUser.role = role.trim().toUpperCase();
      }
      await existingUser.save();
      console.log('🎉 Admin user updated successfully!');
      console.log(`- ID: ${existingUser._id}`);
      console.log(`- Name: ${existingUser.name}`);
      console.log(`- Email: ${existingUser.email}`);
      console.log(`- Role: ${existingUser.role}`);
    } else {
      const newAdmin = await AdminUser.create({
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        role: (role || 'ADMIN').trim().toUpperCase(),
      });
      console.log('🎉 Admin user created successfully!');
      console.log(`- ID: ${newAdmin._id}`);
      console.log(`- Name: ${newAdmin.name}`);
      console.log(`- Email: ${newAdmin.email}`);
      console.log(`- Role: ${newAdmin.role}`);
    }
  } catch (error) {
    console.error('❌ Error in admin user creation/update:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

createOrUpdateAdmin();
