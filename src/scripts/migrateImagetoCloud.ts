import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Safety controls ──
// DRY_RUN=true  -> only logs what WOULD happen, no uploads, no DB writes
// LIMIT=3       -> only processes the first N matching documents (per collection/field)
const DRY_RUN = process.env.DRY_RUN !== 'false'; // defaults to true unless explicitly disabled
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 0; // 0 = no limit

interface MigrationResult {
  collection: string;
  id: string;
  name: string;
  field: string; // e.g. "featuredImage" or "blocks[2].value"
  oldSizeKB: number;
  newUrl?: string;
  status: 'success' | 'skipped' | 'error';
  error?: string;
}

// ───────────────────────── featuredImage migration (unchanged logic) ─────────────────────────

async function processFeaturedImage(
  doc: any,
  model: typeof Puja | typeof PujaLocation,
  collectionName: string,
  results: MigrationResult[],
) {
  const name = doc.name || doc.title || doc._id.toString();
  const base64 = doc.featuredImage as string;
  const oldSizeKB = Math.round((base64.length * 3) / 4 / 1024);

  console.log(`- [${collectionName}] "${name}" (_id: ${doc._id}) featuredImage — ~${oldSizeKB} KB`);

  if (DRY_RUN) {
    results.push({ collection: collectionName, id: doc._id.toString(), name, field: 'featuredImage', oldSizeKB, status: 'skipped' });
    return;
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: 'namanpuja-migrated',
      public_id: doc._id.toString(),
    });

    if (model === Puja) {
      await Puja.updateOne({ _id: doc._id }, { $set: { featuredImage: uploadResult.secure_url } });
    } else {
      await PujaLocation.updateOne({ _id: doc._id }, { $set: { featuredImage: uploadResult.secure_url } });
    }

    console.log(`  ✅ Uploaded → ${uploadResult.secure_url}`);
    results.push({
      collection: collectionName,
      id: doc._id.toString(),
      name,
      field: 'featuredImage',
      oldSizeKB,
      newUrl: uploadResult.secure_url,
      status: 'success',
    });
  } catch (err: any) {
    console.error(`  ❌ Failed for "${name}" (_id: ${doc._id}):`, err.message);
    results.push({
      collection: collectionName,
      id: doc._id.toString(),
      name,
      field: 'featuredImage',
      oldSizeKB,
      status: 'error',
      error: err.message,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
}

async function migratePujaCollection(results: MigrationResult[]) {
  const query = { featuredImage: { $regex: '^data:image/' } };
  let docs = await Puja.find(query);
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  console.log(`\n[Puja] Found ${docs.length} document(s) with base64 featuredImage to process.\n`);

  for (const doc of docs) {
    await processFeaturedImage(doc, Puja, 'Puja', results);
  }
}

async function migratePujaLocationFeaturedImage(results: MigrationResult[]) {
  const query = { featuredImage: { $regex: '^data:image/' } };
  let docs = await PujaLocation.find(query);
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  console.log(`\n[PujaLocation] Found ${docs.length} document(s) with base64 featuredImage to process.\n`);

  for (const doc of docs) {
    await processFeaturedImage(doc, PujaLocation, 'PujaLocation', results);
  }
}

// ───────────────────────── blocks[] migration (new) ─────────────────────────
// `blocks` is Schema.Types.Mixed — a Content Builder array that can nest image
// blocks inside other blocks (columns/groups/etc). We recursively walk it to
// find every node shaped like { type: "image", value: "data:image/..." }.

interface BlockMatch {
  path: (string | number)[]; // path to the node's "value" property
  value: string;
}

function findBase64ImageBlocks(node: any, path: (string | number)[] = []): BlockMatch[] {
  const matches: BlockMatch[] = [];

  if (Array.isArray(node)) {
    node.forEach((item, idx) => {
      matches.push(...findBase64ImageBlocks(item, [...path, idx]));
    });
  } else if (node && typeof node === 'object') {
    if (node.type === 'image' && typeof node.value === 'string' && node.value.startsWith('data:image/')) {
      matches.push({ path: [...path, 'value'], value: node.value });
    }
    for (const key of Object.keys(node)) {
      matches.push(...findBase64ImageBlocks(node[key], [...path, key]));
    }
  }

  return matches;
}

function setAtPath(root: any, path: (string | number)[], value: any) {
  let cursor = root;
  for (let i = 0; i < path.length - 1; i++) {
    cursor = cursor[path[i]];
  }
  cursor[path[path.length - 1]] = value;
}

function pathToLabel(path: (string | number)[]): string {
  return 'blocks' + path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${p}`)).join('');
}

async function processLocationBlocks(doc: any, results: MigrationResult[]) {
  const name = doc.h1 || doc.slug || doc._id.toString();
  const matches = findBase64ImageBlocks(doc.blocks);

  if (matches.length === 0) return;

  console.log(`- [PujaLocation] "${name}" (_id: ${doc._id}) — ${matches.length} base64 image block(s)`);

  let changed = false;

  for (const match of matches) {
    const fieldLabel = pathToLabel(match.path);
    const oldSizeKB = Math.round((match.value.length * 3) / 4 / 1024);

    console.log(`    · ${fieldLabel} — ~${oldSizeKB} KB`);

    if (DRY_RUN) {
      results.push({
        collection: 'PujaLocation',
        id: doc._id.toString(),
        name,
        field: fieldLabel,
        oldSizeKB,
        status: 'skipped',
      });
      continue;
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(match.value, {
        folder: 'namanpuja-migrated',
        // include a path-derived suffix so multiple images in one doc don't collide
        public_id: `${doc._id.toString()}-${match.path.join('-')}`,
      });

      setAtPath(doc.blocks, match.path, uploadResult.secure_url);
      changed = true;

      console.log(`      ✅ Uploaded → ${uploadResult.secure_url}`);
      results.push({
        collection: 'PujaLocation',
        id: doc._id.toString(),
        name,
        field: fieldLabel,
        oldSizeKB,
        newUrl: uploadResult.secure_url,
        status: 'success',
      });
    } catch (err: any) {
      console.error(`      ❌ Failed for "${name}" (_id: ${doc._id}) at ${fieldLabel}:`, err.message);
      results.push({
        collection: 'PujaLocation',
        id: doc._id.toString(),
        name,
        field: fieldLabel,
        oldSizeKB,
        status: 'error',
        error: err.message,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (changed) {
    // Required for Mixed-type fields: Mongoose doesn't auto-detect nested mutations.
    doc.markModified('blocks');
    // Update ONLY this exact document, by its own _id.
    await PujaLocation.updateOne({ _id: doc._id }, { $set: { blocks: doc.blocks } });
  }
}

async function migratePujaLocationBlocks(results: MigrationResult[]) {
  // blocks is Mixed/nested, so we can't reliably regex-match base64 at the query
  // level — fetch candidates that have a blocks field at all, then filter in JS.
  let docs = await PujaLocation.find({ blocks: { $exists: true, $ne: null } });

  docs = docs.filter((doc: any) => findBase64ImageBlocks(doc.blocks).length > 0);
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  console.log(`\n[PujaLocation] Found ${docs.length} document(s) with base64 image block(s) in "blocks".\n`);

  for (const doc of docs) {
    await processLocationBlocks(doc, results);
  }
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected');
  console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made\n' : '⚠️  LIVE MODE — changes WILL be written\n');
  if (LIMIT > 0) console.log(`Limiting to ${LIMIT} document(s) per collection/field.\n`);

  const results: MigrationResult[] = [];

  await migratePujaCollection(results);
  await migratePujaLocationFeaturedImage(results);
  await migratePujaLocationBlocks(results);

  console.log('\n\n========== SUMMARY ==========');
  console.log(`Total processed: ${results.length}`);
  console.log(`Success: ${results.filter((r) => r.status === 'success').length}`);
  console.log(`Skipped (dry run): ${results.filter((r) => r.status === 'skipped').length}`);
  console.log(`Errors: ${results.filter((r) => r.status === 'error').length}`);

  const errors = results.filter((r) => r.status === 'error');
  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.forEach((e) => console.log(`  ${e.collection} / ${e.name} (${e.id}) [${e.field}]: ${e.error}`));
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});