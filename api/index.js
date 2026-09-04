// Vercel serverless entry point.
// Ensures MongoDB connection is active on every request (handles serverless freezes/reconnects).
import { createApp } from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('Serverless DB connection failure:', err);
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance(req, res);
}
