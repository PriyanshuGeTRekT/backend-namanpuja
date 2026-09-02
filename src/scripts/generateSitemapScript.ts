import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { generateAndSaveSitemap } from '../utils/sitemap.js';

dotenv.config();

async function run() {
  await connectDB();
  console.log('Connected to DB, generating sitemap...');
  await generateAndSaveSitemap();
  console.log('Sitemap successfully generated!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
