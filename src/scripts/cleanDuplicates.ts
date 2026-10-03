import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Puja } from '../models/Puja.js';
import { dropLegacySingleSlugIndexes } from '../config/db.js';

export async function deduplicatePujas() {
  const db = mongoose.connection.db;
  if (db) {
    await dropLegacySingleSlugIndexes(db);
  }

  // eslint-disable-next-line no-console
  console.log('🔍 Starting Puja deduplication...\n');

  // Normalize bhaktiType tags across all records first
  await Puja.updateMany(
    {
      $or: [
        { city: { $exists: true, $nin: [null, ''] } },
        { cityName: { $exists: true, $nin: [null, ''] } },
        { cityId: { $exists: true, $ne: null } },
      ],
      bhaktiType: { $ne: 'location' },
    },
    { $set: { bhaktiType: 'location' } },
  );

  await Puja.updateMany(
    {
      $or: [
        { bhaktiType: { $exists: false } },
        { bhaktiType: null },
        { bhaktiType: '' },
      ],
      city: { $in: [null, ''] },
      cityName: { $in: [null, ''] },
    },
    { $set: { bhaktiType: 'main' } },
  );

  // ==========================================
  // 1. DEDUPLICATE LOCATION PUJAS
  // ==========================================
  const locationPujas = await Puja.find({ bhaktiType: 'location' }).lean();
  // eslint-disable-next-line no-console
  console.log(`Found ${locationPujas.length} location puja documents in database.`);

  const locationGroups = new Map<string, any[]>();

  for (const doc of locationPujas) {
    const rawSlug = String(doc.slug || '');
    const cleanSlug = rawSlug.replace(/-\d+$/, '').toLowerCase().trim();
    const cityRaw = String(doc.cityName || doc.city || doc.citySlug || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cleanName = String(doc.name || doc.title || doc.h1 || '').split(' in ')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // Canonical key: cleanName or cleanSlug combined with normalized city
    const baseKey = cleanSlug || cleanName;
    const key = `${baseKey}:::${cityRaw}`;
    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(doc);
  }

  let locationDupsDeleted = 0;

  for (const [key, docs] of locationGroups.entries()) {
    if (docs.length <= 1) {
      // If single doc has trailing numbers in slug, clean it up
      const doc = docs[0];
      const rawSlug = String(doc.slug || '');
      const cleanSlug = rawSlug.replace(/-\d+$/, '');
      if (rawSlug !== cleanSlug) {
        await Puja.updateOne({ _id: doc._id }, { $set: { slug: cleanSlug } });
      }
      continue;
    }

    // Sort to find the best document to keep
    docs.sort((a, b) => {
      // Score based on richness of content
      const scoreA =
        (Array.isArray(a.blocks) ? a.blocks.length * 10 : 0) +
        (Array.isArray(a.sections) ? a.sections.length * 5 : 0) +
        (Array.isArray(a.faqs) ? a.faqs.length * 2 : 0) +
        (a.featuredImage ? 10 : 0) +
        (a.metaTitle ? 5 : 0) +
        (a.published ? 5 : 0);

      const scoreB =
        (Array.isArray(b.blocks) ? b.blocks.length * 10 : 0) +
        (Array.isArray(b.sections) ? b.sections.length * 5 : 0) +
        (Array.isArray(b.faqs) ? b.faqs.length * 2 : 0) +
        (b.featuredImage ? 10 : 0) +
        (b.metaTitle ? 5 : 0) +
        (b.published ? 5 : 0);

      if (scoreA !== scoreB) return scoreB - scoreA;

      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const [keeper, ...duplicates] = docs;
    const cleanSlug = String(keeper.slug || '').replace(/-\d+$/, '');

    // Ensure keeper has clean slug
    await Puja.updateOne({ _id: keeper._id }, { $set: { slug: cleanSlug } });

    // Delete redundant duplicates
    const dupIds = duplicates.map((d: any) => d._id);
    await Puja.deleteMany({ _id: { $in: dupIds } });
    locationDupsDeleted += dupIds.length;

    // eslint-disable-next-line no-console
    console.log(`✅ [Location] "${key}": Kept ID ${keeper._id} (slug: "${cleanSlug}"), deleted ${dupIds.length} duplicates.`);
  }

  // ==========================================
  // 2. DEDUPLICATE MAIN MASTER PUJAS
  // ==========================================
  const mainPujas = await Puja.find({ bhaktiType: { $ne: 'location' } }).lean();
  // eslint-disable-next-line no-console
  console.log(`\nFound ${mainPujas.length} main master puja documents.`);

  const mainGroups = new Map<string, any[]>();

  for (const doc of mainPujas) {
    const rawName = String(doc.name || doc.title || '').toLowerCase().trim();
    const rawSlug = String(doc.slug || '').toLowerCase().trim().replace(/-\d+$/, '');
    const key = rawName || rawSlug;

    if (!mainGroups.has(key)) {
      mainGroups.set(key, []);
    }
    mainGroups.get(key)!.push(doc);
  }

  let mainDupsDeleted = 0;

  for (const [key, docs] of mainGroups.entries()) {
    if (docs.length <= 1) {
      const doc = docs[0];
      const rawSlug = String(doc.slug || '');
      const cleanSlug = rawSlug.replace(/-\d+$/, '');
      if (rawSlug !== cleanSlug) {
        await Puja.updateOne({ _id: doc._id }, { $set: { slug: cleanSlug } });
      }
      continue;
    }

    docs.sort((a, b) => {
      const scoreA =
        (Array.isArray(a.blocks) ? a.blocks.length * 10 : 0) +
        (a.description ? a.description.length : 0) +
        (a.featuredImage ? 10 : 0) +
        (a.enabled ? 5 : 0);

      const scoreB =
        (Array.isArray(b.blocks) ? b.blocks.length * 10 : 0) +
        (b.description ? b.description.length : 0) +
        (b.featuredImage ? 10 : 0) +
        (b.enabled ? 5 : 0);

      if (scoreA !== scoreB) return scoreB - scoreA;

      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const [keeper, ...duplicates] = docs;
    const cleanSlug = String(keeper.slug || '').replace(/-\d+$/, '');

    await Puja.updateOne({ _id: keeper._id }, { $set: { slug: cleanSlug } });

    const dupIds = duplicates.map((d: any) => d._id);
    await Puja.deleteMany({ _id: { $in: dupIds } });
    mainDupsDeleted += dupIds.length;

    // eslint-disable-next-line no-console
    console.log(`✅ [Main] "${key}": Kept ID ${keeper._id} (slug: "${cleanSlug}"), deleted ${dupIds.length} duplicates.`);
  }

  // eslint-disable-next-line no-console
  console.log(`\n🎉 Deduplication complete! Total location duplicates removed: ${locationDupsDeleted}, Total main duplicates removed: ${mainDupsDeleted}`);
}

async function run() {
  await mongoose.connect(env.mongoUri);
  await deduplicatePujas();
  await mongoose.disconnect();
}

if (process.argv[1]?.includes('cleanDuplicates')) {
  run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Error running cleanDuplicates script:', err);
    process.exit(1);
  });
}
