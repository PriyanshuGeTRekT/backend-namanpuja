import mongoose from 'mongoose'; import { env } from './src/config/env.js'; mongoose.connect(env.mongoUri).then(() = console.log('Count:', c); process.exit(0); }).catch(console.error);  
