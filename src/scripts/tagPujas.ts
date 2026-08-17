import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Puja } from '../models/Puja.js';

const mainSlugs = [
  'lakshmi-puja',
  'griha-pravesh-puja',
  'ganesh-puja-online-booking',
  'ganesh-puja',
  'satyanarayan-puja',
  'satyanarayan-katha',
  'rudrabhishek-puja',
  'navagraha-shanti-puja',
  'annaprasan-puja',
  'pitrudosh-puja-online-booking',
  'satyanarayan',
];

async function main() {
  await mongoose.connect(env.mongoUri);
  const pujas = await Puja.find({});
  for (const p of pujas) {
    const isMain = mainSlugs.includes(p.slug);
    p.bhaktiType = isMain ? 'main' : 'location';
    await p.save();
    console.log(`Updated ${p.slug} -> bhaktiType: ${p.bhaktiType}`);
  }
  await mongoose.disconnect();
  console.log('Done tagging pujas strictly.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
