import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) throw ApiError.badRequest('Email and password are required');

    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) throw ApiError.unauthorized('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid credentials');

    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.admin!.sub },
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    res.json(user);
  }),
);
