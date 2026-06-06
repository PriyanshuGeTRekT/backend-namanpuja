// Vercel serverless entry point.
//
// Vercel runs the backend as a serverless function (it does not run a
// long-lived server). This file imports the already-built Express app from
// `dist/` (produced by `npm run vercel-build`) and exports it as the handler.
// An Express app instance is itself a `(req, res)` handler, which is exactly
// what Vercel invokes.
//
// Local development still uses `src/index.ts` (`npm run dev`), which calls
// `app.listen()`. This file is only used by Vercel.
import { createApp } from '../dist/app.js';

const app = createApp();

export default app;
