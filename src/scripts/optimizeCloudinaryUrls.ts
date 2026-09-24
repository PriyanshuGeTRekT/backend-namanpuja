// $env:DRY_RUN="false"; npx tsx src/scripts/optimizeCloudinaryUrls.ts
import 'dotenv/config';
import mongoose from 'mongoose';

const DRY_RUN = process.env.DRY_RUN !== 'false'; // defaults to true unless explicitly disabled

interface OptimizeResult {
  collection: string;
  id: string;
  name: string;
  field: string;
  oldUrl: string;
  newUrl: string;
  status: 'success' | 'skipped' | 'error';
  error?: string;
}

function optimizeCloudinaryUrl(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null;
  // already optimized — skip
  if (url.includes('f_auto') || url.includes('q_auto')) return null;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

async function processNode(node: any, docName: string, docId: string, collectionName: string, results: OptimizeResult[]): Promise<{ node: any; changed: boolean }> {
  let changed = false;

  async function traverse(current: any, path: string): Promise<any> {
    if (!current) return current;

    if (typeof current === 'string') {
      const optimized = optimizeCloudinaryUrl(current);
      if (optimized) {
        console.log(`    · [${collectionName}] ${docName} -> ${path}`);
        console.log(`      old: ${current}`);
        console.log(`      new: ${optimized}`);
        results.push({
          collection: collectionName,
          id: docId,
          name: docName,
          field: path,
          oldUrl: current,
          newUrl: optimized,
          status: DRY_RUN ? 'skipped' : 'success',
        });
        changed = true;
        return DRY_RUN ? current : optimized;
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

async function optimizeCollection(collectionName: string, results: OptimizeResult[]) {
  const collection = mongoose.connection.db!.collection(collectionName);
  const docs = await collection.find({}).toArray();

  let count = 0;
  for (const doc of docs) {
    const name = doc.name || doc.title || doc.h1 || doc.slug || doc._id.toString();
    const { node: updatedDoc, changed } = await processNode(doc, name, doc._id.toString(), collectionName, results);

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
    console.log(`\n[${collectionName}] ${DRY_RUN ? 'Would update' : 'Updated'} ${count} document(s).\n`);
  } else {
    console.log(`\n[${collectionName}] Found 0 document(s) needing optimization.\n`);
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected');
  console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made\n' : '⚠️  LIVE MODE — changes WILL be written\n');

  const results: OptimizeResult[] = [];

  const allCols = await mongoose.connection.db!.listCollections().toArray();
  const collections = allCols
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));

  console.log(`Found collections in database: ${collections.join(', ')}\n`);

  for (const col of collections) {
    await optimizeCollection(col, results);
  }

  console.log('\n\n========== SUMMARY ==========');
  console.log(`Total fields found: ${results.length}`);
  console.log(`Updated: ${results.filter((r) => r.status === 'success').length}`);
  console.log(`Would update (dry run): ${results.filter((r) => r.status === 'skipped').length}`);
  console.log(`Errors: ${results.filter((r) => r.status === 'error').length}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Optimize script failed:', err);
  process.exit(1);
});