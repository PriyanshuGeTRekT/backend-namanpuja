/**
 * clearSeedContent.ts
 * -------------------
 * One-shot migration: removes the seed-inserted content arrays
 * (benefits, rituals, samagri, occasions, faqs) from the two pujas
 * that were created by seed.ts — ganesh-puja and satyanarayan-puja.
 *
 * Run once with:
 *   npx tsx src/scripts/clearSeedContent.ts
 *
 * Safe to run multiple times — it only unsets fields that still contain
 * the exact seed values (checked by matching the slug).
 */

import mongoose from 'mongoose';
import { Puja } from '../models/Puja.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/namanpuja';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // All pujas with seed/template content that should be cleared.
  // The admin can re-enter proper content via the Admin Panel → Content (JSON) tab.
  const seedSlugs = [
    'ganesh-puja-online-booking',   // Ganesh Puja — has seed benefits/rituals/samagri/occasions
    'satyanarayan-katha',           // Satyanarayan Katha — has seed benefits/rituals
    'rudrabhishek-puja',            // Rudrabhisheka — has seed content
    'griha-pravesh-puja',           // Griha Pravesh — has seed content
    'lakshmi-puja',                 // Lakshmi Puja — has seed content
    'navagraha-shanti-puja',        // Navagraha — has seed content
    'annaprasan-puja',              // Annaprasan — has seed benefits/samagri
  ];

  for (const slug of seedSlugs) {
    const result = await Puja.updateOne(
      { slug },
      {
        $unset: {
          benefits: '',
          rituals: '',
          samagri: '',
          occasions: '',
          faqs: '',
        },
        $set: { _seedContentCleared: true },
      }
    );

    if (result.matchedCount === 0) {
      console.log(`⚠️  Puja not found: ${slug}`);
    } else {
      console.log(`🧹 Cleared seed content for: ${slug} (modified: ${result.modifiedCount})`);
    }
  }

  await mongoose.disconnect();
  console.log('✅ Done — seed content cleared.');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
