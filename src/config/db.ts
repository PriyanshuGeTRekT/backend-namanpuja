import mongoose from 'mongoose';
import { env } from './env.js';
import { seedAdminUsers, seedInitialData } from './seed.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';

let cachedConnection: typeof mongoose | null = null;

async function syncDatabaseIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // 1. Drop legacy global unique slug_1 index on pujas if it exists
    try {
      const pujaIndexes = await db.collection('pujas').indexes();
      const legacySlug = pujaIndexes.find((idx: any) => idx.name === 'slug_1' && idx.unique);
      if (legacySlug) {
        await db.collection('pujas').dropIndex('slug_1');
        // eslint-disable-next-line no-console
        console.log('✅ Dropped legacy global unique slug_1 index on pujas');
      }
    } catch {
      // Ignored if index doesn't exist
    }

    // 2. Drop legacy global unique slug_1 index on pujalocations if it exists
    try {
      const locIndexes = await db.collection('pujalocations').indexes();
      const legacyLocSlug = locIndexes.find((idx: any) => idx.name === 'slug_1' && idx.unique);
      if (legacyLocSlug) {
        await db.collection('pujalocations').dropIndex('slug_1');
        // eslint-disable-next-line no-console
        console.log('✅ Dropped legacy global unique slug_1 index on pujalocations');
      }
    } catch {
      // Ignored if index doesn't exist
    }

    // 3. Sync indexes with updated schemas
    await Puja.syncIndexes();
    await PujaLocation.syncIndexes();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Index sync warning:', err);
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    cachedConnection = await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');

    // Drop legacy indexes and sync compound indexes
    await syncDatabaseIndexes();

    // Always ensure admin accounts exist (safe upsert, runs in prod too).
    await seedAdminUsers();

    // Full demo-data seed only in development.
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
