import mongoose from 'mongoose';
import { env } from './env.js';
import { seedAdminUsers, seedInitialData } from './seed.js';
import { Puja } from '../models/Puja.js';

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
    indexesSynced = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Index sync warning:', err);
  }
}

import { City } from '../models/City.js';
import { Country } from '../models/Country.js';
import { toSlug } from '../utils/slug.js';

export async function migratePujaLocationsToPujas() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections({ name: 'pujalocations' }).toArray();
    if (collections.length === 0) {
      return;
    }

    const rawLocations = await db.collection('pujalocations').find({}).toArray();
    if (rawLocations.length === 0) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`🔄 Checking migration of ${rawLocations.length} documents from "pujalocations" to "pujas"...`);

    // Preload cities and countries for quick lookup
    const cities = await City.find({}).populate('countryId').lean();
    const cityMapById = new Map<string, any>();
    cities.forEach((c: any) => {
      if (c._id) cityMapById.set(c._id.toString(), c);
    });

    let migratedCount = 0;

    for (const loc of rawLocations) {
      const cityIdStr = loc.cityId ? loc.cityId.toString() : '';
      const cityDoc = cityMapById.get(cityIdStr);

      const cityName = (loc.cityName || cityDoc?.name || '').trim();
      const countryDoc = cityDoc?.countryId;
      const countryName = (loc.countryName || countryDoc?.name || (typeof countryDoc === 'string' ? countryDoc : '') || 'India').trim();
      const citySlug = loc.citySlug || (cityDoc?.slug ? String(cityDoc.slug) : toSlug(cityName));
      const countrySlug = loc.countrySlug || (countryDoc?.slug ? String(countryDoc.slug) : toSlug(countryName));
      const cleanSlug = loc.slug ? String(loc.slug).replace(/-\d+$/, '') : toSlug(loc.h1 || 'puja');

      // Determine clean name
      let pujaName = loc.h1 ? loc.h1.split(' in ')[0].trim() : '';
      if (!pujaName && loc.title) pujaName = loc.title;
      if (!pujaName && loc.name) pujaName = loc.name;
      if (!pujaName) pujaName = cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      const isPublished = loc.published !== false;

      const pujaData: Record<string, any> = {
        name: pujaName,
        title: loc.title || loc.h1 || `${pujaName} in ${cityName}`,
        slug: cleanSlug,
        bhaktiType: 'location',
        city: cityName,
        cityName,
        citySlug,
        cityId: loc.cityId || (cityDoc?._id ? cityDoc._id : undefined),
        country: countryName,
        countryName,
        countrySlug,
        state: loc.state || cityDoc?.state || '',
        h1: loc.h1 || `${pujaName} in ${cityName}`,
        heroTagline: loc.heroTagline || '',
        intro: loc.intro || '',
        excerpt: loc.excerpt || loc.intro || '',
        description: loc.description || loc.intro || '',
        featuredImage: loc.featuredImage || loc.heroImage || '',
        heroImage: loc.heroImage || loc.featuredImage || '',
        blocks: Array.isArray(loc.blocks) ? loc.blocks : [],
        sections: Array.isArray(loc.sections) ? loc.sections : [],
        benefits: loc.benefits || [],
        rituals: loc.rituals || [],
        samagri: loc.samagri || [],
        whyChooseUs: loc.whyChooseUs || [],
        occasions: loc.occasions || [],
        serviceAreas: loc.serviceAreas || [],
        faqs: loc.faqs || [],
        cta: loc.cta || {},
        packages: loc.packages || [],
        metaTitle: loc.metaTitle || '',
        seoTitle: loc.seoTitle || loc.metaTitle || '',
        metaDescription: loc.metaDescription || '',
        seoDescription: loc.seoDescription || loc.metaDescription || '',
        keywords: loc.keywords || [],
        seoKeywords: loc.seoKeywords || loc.keywords || [],
        ogImage: loc.ogImage || loc.featuredImage || '',
        canonicalUrl: loc.canonicalUrl || '',
        breadcrumb: loc.breadcrumb || [],
        internalLinks: loc.internalLinks || [],
        imageAlt: loc.imageAlt || '',
        basePrice: loc.basePrice !== undefined ? Number(loc.basePrice) : 0,
        onlinePrice: loc.onlinePrice !== undefined ? Number(loc.onlinePrice) : (loc.basePrice !== undefined ? Number(loc.basePrice) : 0),
        offlinePrice: loc.offlinePrice !== undefined ? Number(loc.offlinePrice) : 0,
        status: isPublished ? 'published' : 'draft',
        published: isPublished,
        views: Number(loc.views) || 0,
        enabled: true,
        targetPujaId: loc.pujaId || loc.targetPujaId,
        pujaId: loc.pujaId || loc.targetPujaId,
      };

      for (const key of Object.keys(pujaData)) {
        if (pujaData[key] === undefined) delete pujaData[key];
      }

      // Upsert into pujas collection
      const filter: any = {
        slug: cleanSlug,
        bhaktiType: 'location',
      };
      if (cityName) {
        filter.city = cityName;
      }
      if (countryName) {
        filter.country = countryName;
      }

      await Puja.findOneAndUpdate(filter, { $set: pujaData }, { upsert: true, new: true });
      migratedCount++;
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Successfully verified/migrated ${migratedCount} locations into the "pujas" collection.`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️ Error during pujalocations migration:', err);
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

    // Migrate all data from pujalocations to pujas collection
    await migratePujaLocationsToPujas();

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
