import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PujaLocation } from '../models/PujaLocation.js';

// The 5 redundant / duplicate slugs identified:
const duplicateSlugsToDelete = [
  // 1. Leeds - redundant second entry
  'satyanarayan-katha-book-online-today-in-leeds',
  // 2. Nottingham - overly long redundant entry
  'satyanarayan-puja-in-nottingham-book-a-pandit-for-home-or-online-katha-in-nottingham-east-midlands-england',
  // 3. Swindon - overly long redundant entry
  'satyanarayan-puja-in-swindon-book-online-or-at-home-with-naman-puja-in-swindon-south-west-england',
  // 4. San Jose - misspelled duplicate ("rudrabhisheka" with extra 'a')
  'rudrabhisheka-puja-in-san-jose-california',
  // 5. Irving - duplicate with stutter phrase ("in-irving-in-irving-texas")
  'ganesh-puja-in-irving-in-irving-texas',
];

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB. Deleting 5 duplicate PujaLocation documents...\n');

  for (const slug of duplicateSlugsToDelete) {
    const res = await PujaLocation.deleteMany({ slug });
    console.log(`Deleted slug: "${slug}" -> count: ${res.deletedCount}`);
  }

  console.log('\nFinished deleting duplicate puja locations.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
