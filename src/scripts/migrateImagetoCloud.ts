// $env:DRY_RUN="false"; npx tsx src/scripts/migrateImagetoCloud.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Safety controls ──
// DRY_RUN=true  -> only logs what WOULD happen, no uploads, no DB writes
const DRY_RUN = process.env.DRY_RUN !== 'false'; // defaults to true unless explicitly disabled

interface MigrationResult {
  collection: string;
  id: string;
  name: string;
  field: string;
  oldSizeKB: number;
  newUrl?: string;
  status: 'success' | 'skipped' | 'error';
  error?: string;
}

const base64Regex = /data:image\/[^"'\s<>)]+/gi;

async function uploadBase64Images(node: any, docName: string, docId: string, collectionName: string, results: MigrationResult[]): Promise<{ node: any; changed: boolean }> {
  let changed = false;

  async function traverse(current: any, path: string): Promise<any> {
    if (!current) return current;

    if (typeof current === 'string') {
      if (current.includes('data:image/')) {
        const matches = current.match(base64Regex);
        if (matches && matches.length > 0) {
          let newStr = current;
          for (const rawMatch of matches) {
            const match = rawMatch.trim();
            const oldSizeKB = Math.round((match.length * 3) / 4 / 1024);
            console.log(`    · [${collectionName}] ${docName} -> ${path} — ~${oldSizeKB} KB`);
            if (DRY_RUN) {
              results.push({ collection: collectionName, id: docId, name: docName, field: path, oldSizeKB, status: 'skipped' });
              changed = true;
              continue;
            }
            try {
              const publicId = `${docId}-${path}`.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 150);
              const uploadResult = await cloudinary.uploader.upload(match, {
                folder: 'namanpuja-migrated',
                public_id: publicId,
              });
              console.log(`      ✅ Uploaded → ${uploadResult.secure_url}`);
              newStr = newStr.replace(rawMatch, uploadResult.secure_url);
              results.push({ collection: collectionName, id: docId, name: docName, field: path, oldSizeKB, newUrl: uploadResult.secure_url, status: 'success' });
              changed = true;
            } catch (err: any) {
              console.error(`      ❌ Failed upload for ${path}:`, err.message);
              results.push({ collection: collectionName, id: docId, name: docName, field: path, oldSizeKB, status: 'error', error: err.message });
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return newStr;
        }
      }
      return current;
    }

    if (Array.isArray(current)) {
      const newArr = [];
      for (let i = 0; i < current.length; i++) {
        newArr.push(await traverse(current[i], path ? `${path}[${i}]` : `[${i}]`));
      }
      return newArr;
    }

    if (typeof current === 'object') {
      if (current instanceof Date || current instanceof mongoose.Types.ObjectId) return current;
      const newObj: any = {};
      for (const key of Object.keys(current)) {
        if (key.startsWith('$')) {
          newObj[key] = current[key];
          continue;
        }
        newObj[key] = await traverse(current[key], path ? `${path}.${key}` : key);
      }
      return newObj;
    }

    return current;
  }

  const finalNode = await traverse(node, '');
  return { node: finalNode, changed };
}

async function migrateCollection(collectionName: string, results: MigrationResult[]) {
  const collection = mongoose.connection.db!.collection(collectionName);
  const docs = await collection.find({}).toArray();

  let count = 0;
  for (const doc of docs) {
    const name = doc.name || doc.title || doc.h1 || doc.slug || doc._id.toString();
    const { node: updatedDoc, changed } = await uploadBase64Images(doc, name, doc._id.toString(), collectionName, results);
    
    if (changed) {
      count++;
      if (!DRY_RUN) {
        const docId = doc._id;
        const copy = { ...updatedDoc };
        delete copy._id;
        await collection.replaceOne({ _id: docId }, copy);
      }
    }
  }
  
  if (count > 0) {
    console.log(`\n[${collectionName}] Processed ${count} document(s) containing base64 images.\n`);
  } else {
    console.log(`\n[${collectionName}] Found 0 document(s) with base64 images.\n`);
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected');
  console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made\n' : '⚠️  LIVE MODE — changes WILL be written\n');

  const results: MigrationResult[] = [];

  const allCols = await mongoose.connection.db!.listCollections().toArray();
  const collections = allCols
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));

  console.log(`Found collections in database: ${collections.join(', ')}\n`);

  for (const col of collections) {
    await migrateCollection(col, results);
  }

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