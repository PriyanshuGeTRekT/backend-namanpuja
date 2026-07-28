import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';
import { AdminUser } from '../models/AdminUser.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) throw ApiError.badRequest('Email and password are required');

    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    // Assuming active logic wasn't added to schema but if it is needed, it can be added. 
    // We removed active in schema but can check if user exists.
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid credentials');

    await AdminUser.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const token = jwt.sign(
      { sub: user._id, email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );

    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await AdminUser.findById(req.admin!.sub).select('email name role lastLoginAt');
    if (!user) throw ApiError.notFound('User not found');
    res.json({ id: user._id.toString(), email: user.email, name: user.name, role: user.role, lastLoginAt: user.lastLoginAt });
  }),
);
