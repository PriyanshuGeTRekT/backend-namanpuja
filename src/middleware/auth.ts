import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
}

export interface UserAuthPayload {
  sub: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AuthPayload;
      user?: UserAuthPayload;
    }
  }
}

/** Requires a valid admin JWT. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }
  const token = header.slice(7);
  try {
    req.admin = jwt.verify(token, env.jwtSecret) as AuthPayload;
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/** Requires the authenticated admin to have one of the given roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
}

/** Requires a valid customer user JWT. */
export function requireUserAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, env.jwtSecret) as UserAuthPayload;
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}
