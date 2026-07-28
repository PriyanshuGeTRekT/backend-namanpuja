import { createApp } from './app.js';
import { env } from './config/env.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

const app = createApp();

let server: any;

async function bootstrap() {
  await connectDB();
  server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🪔  namanpuja backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

bootstrap();

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  } else {
    await mongoose.disconnect();
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));