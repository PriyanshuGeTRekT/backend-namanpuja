/**
 * listPujas.ts — lists all pujas and their content field status
 * Run: npx tsx --env-file=.env src/scripts/listPujas.ts
 */
import mongoose from 'mongoose';
import { Puja } from '../models/Puja.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/namanpuja';

async function main() {
  await mongoose.connect(MONGO_URI);
  const pujas = await Puja.find({}).select('slug name benefits rituals samagri occasions').lean();
  for (const p of pujas) {
    const counts = [
      `benefits:${(p as any).benefits?.length ?? 0}`,
      `rituals:${(p as any).rituals?.length ?? 0}`,
      `samagri:${(p as any).samagri?.length ?? 0}`,
      `occasions:${(p as any).occasions?.length ?? 0}`,
    ].join(' ');
    console.log(`${(p as any).slug}  |  ${(p as any).name}  |  ${counts}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
