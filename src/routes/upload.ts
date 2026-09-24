import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'namanpuja',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  }),
}) as any;

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

// Inserts Cloudinary's auto-format + auto-quality transformation into the
// upload URL before it's saved anywhere — so every image entering the DB
// from this point on is pre-optimized, with zero frontend changes needed.
export function optimizeCloudinaryUrl(url: string): string {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

uploadRouter.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const rawUrl = (req.file as any).path;
  const optimizedUrl = optimizeCloudinaryUrl(rawUrl);
  res.json({ url: optimizedUrl });
});