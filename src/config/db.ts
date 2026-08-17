import mongoose from 'mongoose';
import { env } from './env.js';
import { seedInitialData } from './seed.js';

let cachedConnection: typeof mongoose | null = null;

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');
    if (!env.isProd) {
      await seedInitialData();
    }
    return cachedConnection;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}
