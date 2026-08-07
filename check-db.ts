import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { AdminUser } from './src/models/AdminUser.js';

async function listAdmins() {
  try {
    await mongoose.connect(env.mongoUri);
    const admins = await AdminUser.find({});
    console.log('--- ADMIN USERS IN DB ---');
    admins.forEach(a => {
      console.log(`- ID: ${a._id}, Email: ${a.email}, Name: ${a.name}, Role: ${a.role}`);
    });
    console.log('-------------------------');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

listAdmins();
