import mongoose from 'mongoose';
import { env } from './env.js';
import { seedAdminUsers, seedInitialData } from './seed.js';
import { Puja } from '../models/Puja.js';

let cachedConnection: typeof mongoose | null = null;
let indexesSynced = false;

/**
 * Drops any old single-field or country-based unique slug index on the given collections.
 * Called on startup once and kept as a fallback in crudFactory on E11000 errors.
 */
export async function dropLegacySingleSlugIndexes(db: any) {
  const collections = ['pujas'];
  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      const indexes = await col.indexes();
      for (const idx of indexes) {
        const keyFields = Object.keys(idx.key || {});
        // Drop any legacy single slug index without bhaktiType: 'main' filter
        if (keyFields.length === 1 && keyFields[0] === 'slug') {
          if (idx.unique || idx.name === 'slug_1') {
            const hasMainFilter = idx.partialFilterExpression?.bhaktiType === 'main';
            if (!hasMainFilter) {
              try {
                await col.dropIndex(idx.name);
                console.log(`✅ Dropped legacy single slug index "${idx.name}" on ${colName}`);
              } catch {}
            }
          }
        }
        // Drop any legacy unique index that contains country / countryName or 3-field compound
        if (idx.unique && keyFields.includes('slug')) {
          if (keyFields.includes('country') || keyFields.includes('countryName') || idx.name === 'slug_1_city_1_country_1') {
            try {
              await col.dropIndex(idx.name);
              console.log(`✅ Dropped legacy country-based unique slug index "${idx.name}" on ${colName}`);
            } catch {}
          }
        }
      }
    } catch {
      // Ignored if collection doesn't exist
    }
  }
}

async function syncDatabaseIndexes() {
  if (indexesSynced) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // Drop any old global or country-based unique indexes
    await dropLegacySingleSlugIndexes(db);

    // Ensure the compound indexes from Puja schema are applied
    await Puja.syncIndexes();
    indexesSynced = true;
  } catch (err) {
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
    console.log('✅ MongoDB connected');

    // Sync compound indexes (one-time migration, skipped after first run)
    await syncDatabaseIndexes();

    // Always ensure admin accounts exist (safe upsert, runs in prod too).
    await seedAdminUsers();

    // Full demo-data seed only in development.
    if (!env.isProd) {
      await seedInitialData();
    }
    return cachedConnection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}
