/**
 * Admin API — all routes require a valid admin JWT (except /auth/login).
 * Wired to react-admin via the ra-data-simple-rest dialect.
 */
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createCrudRouter } from './crudFactory.js';
import { authRouter } from './auth.routes.js';
import { toSlug, pujaLocationSlug } from '../utils/slug.js';

export const adminRouter = Router();

// Auth (login is public; everything else requires a token)
adminRouter.use('/auth', authRouter);

// Everything below requires authentication
adminRouter.use(requireAuth);

adminRouter.use(
  '/countries',
  createCrudRouter({
    resource: 'countries',
    model: prisma.country,
    searchableFields: ['name', 'slug', 'isoCode'],
    defaultOrderBy: { sortOrder: 'asc' },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/cities',
  createCrudRouter({
    resource: 'cities',
    model: prisma.city,
    searchableFields: ['name', 'slug', 'state'],
    include: { country: true },
    defaultOrderBy: { sortOrder: 'asc' },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/puja-categories',
  createCrudRouter({
    resource: 'puja-categories',
    model: prisma.pujaCategory,
    searchableFields: ['name', 'slug'],
    defaultOrderBy: { sortOrder: 'asc' },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/pujas',
  createCrudRouter({
    resource: 'pujas',
    model: prisma.puja,
    searchableFields: ['name', 'slug', 'deity'],
    include: { category: true },
    defaultOrderBy: { sortOrder: 'asc' },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/puja-locations',
  createCrudRouter({
    resource: 'puja-locations',
    model: prisma.pujaLocation,
    searchableFields: ['slug', 'h1', 'metaTitle'],
    include: { puja: true, city: { include: { country: true } } },
    beforeWrite: async (data) => {
      // Auto-build slug + h1 from puja + city when missing
      if ((!data.slug || !data.h1) && data.pujaId && data.cityId) {
        const [puja, city] = await Promise.all([
          prisma.puja.findUnique({ where: { id: String(data.pujaId) } }),
          prisma.city.findUnique({ where: { id: String(data.cityId) } }),
        ]);
        if (puja && city) {
          if (!data.slug) data.slug = pujaLocationSlug(puja.name, city.name, city.state);
          if (!data.h1) data.h1 = `${puja.name} in ${city.name}${city.state ? ', ' + city.state : ''}`;
        }
      }
      return data;
    },
  }),
);

adminRouter.use(
  '/temples',
  createCrudRouter({
    resource: 'temples',
    model: prisma.temple,
    searchableFields: ['name', 'slug', 'deity'],
    include: { city: true },
    defaultOrderBy: { sortOrder: 'asc' },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/bookings',
  createCrudRouter({
    resource: 'bookings',
    model: prisma.booking,
    searchableFields: ['reference', 'customerName', 'customerEmail', 'customerPhone'],
    include: { puja: true, city: true },
  }),
);
