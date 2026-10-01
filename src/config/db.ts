import mongoose from 'mongoose';
import { env } from './env.js';
import { seedAdminUsers, seedInitialData } from './seed.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';

let cachedConnection: typeof mongoose | null = null;
let indexesSynced = false;

export async function dropLegacySingleSlugIndexes(db: any) {
  const collections = ['pujas', 'pujalocations'];
  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      const indexes = await col.indexes();
      for (const idx of indexes) {
        const keyFields = Object.keys(idx.key || {});
        if (keyFields.length === 1 && keyFields[0] === 'slug') {
          if (idx.unique || idx.name === 'slug_1') {
            try {
              await col.dropIndex(idx.name);
              // eslint-disable-next-line no-console
              console.log(`✅ Dropped legacy single slug index "${idx.name}" on ${colName}`);
            } catch (dropErr) {
              // eslint-disable-next-line no-console
              console.warn(`Could not drop index "${idx.name}" on ${colName}:`, dropErr);
            }
          }
        }
      }
    } catch {
      // Ignored if collection doesn't exist
    }
  }
}

async function syncDatabaseIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    await dropLegacySingleSlugIndexes(db);

    // Sync indexes with updated schemas
    await Puja.syncIndexes();
    await PujaLocation.syncIndexes();
    indexesSynced = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Index sync warning:', err);
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    if (!indexesSynced) {
      await syncDatabaseIndexes();
    }
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
