import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PujaLocation } from '../models/PujaLocation.js';

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('Deleting duplicate PujaLocation 6a86ecba13017853fb1f5c31 for Dallas...');
  const res = await PujaLocation.deleteOne({ _id: '6a86ecba13017853fb1f5c31' });
  console.log('Delete result:', res);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
