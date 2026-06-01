/**
 * Public API — consumed by the Next.js frontend. Read-only, plus booking creation.
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { createBooking } from '../bookings/createBooking.js';

export const publicRouter = Router();

// ── Countries & cities (the Country → City → Puja flow) ──

publicRouter.get(
  '/countries',
  asyncHandler(async (_req, res: Response) => {
    const countries = await prisma.country.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { cities: true } } },
    });
    res.json(countries);
  }),
);

publicRouter.get(
  '/countries/:slug/cities',
  asyncHandler(async (req: Request, res: Response) => {
    const country = await prisma.country.findUnique({ where: { slug: req.params.slug } });
    if (!country) throw ApiError.notFound('Country not found');
    const cities = await prisma.city.findMany({
      where: { countryId: country.id, enabled: true },
      orderBy: [{ isPopular: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ country, cities });
  }),
);

// ── A city and its available pujas ──

publicRouter.get(
  '/cities/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const city = await prisma.city.findFirst({
      where: { slug: req.params.slug, enabled: true },
      include: { country: true },
    });
    if (!city) throw ApiError.notFound('City not found');

    const locations = await prisma.pujaLocation.findMany({
      where: { cityId: city.id, published: true },
      include: { puja: { include: { category: true } } },
      orderBy: { puja: { sortOrder: 'asc' } },
    });

    const temples = await prisma.temple.findMany({
      where: { cityId: city.id, enabled: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });

    res.json({ city, locations, temples });
  }),
);

// ── Puja catalog ──

publicRouter.get(
  '/pujas',
  asyncHandler(async (_req, res: Response) => {
    const pujas = await prisma.puja.findMany({
      where: { enabled: true },
      include: { category: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
    res.json(pujas);
  }),
);

publicRouter.get(
  '/pujas/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const puja = await prisma.puja.findFirst({
      where: { slug: req.params.slug, enabled: true },
      include: { category: true },
    });
    if (!puja) throw ApiError.notFound('Puja not found');
    res.json(puja);
  }),
);

// ── SEO landing page: a puja in a city ──

publicRouter.get(
  '/locations/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const location = await prisma.pujaLocation.findFirst({
      where: { slug: req.params.slug, published: true },
      include: {
        puja: { include: { category: true } },
        city: { include: { country: true } },
      },
    });
    if (!location) throw ApiError.notFound('Page not found');

    // fire-and-forget view counter
    prisma.pujaLocation
      .update({ where: { id: location.id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);

    res.json(location);
  }),
);

// All published location slugs (for Next.js generateStaticParams / sitemap)
publicRouter.get(
  '/locations',
  asyncHandler(async (_req, res: Response) => {
    const locations = await prisma.pujaLocation.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    res.json(locations);
  }),
);

// ── Temples ──

publicRouter.get(
  '/temples',
  asyncHandler(async (_req, res: Response) => {
    const temples = await prisma.temple.findMany({
      where: { enabled: true },
      include: { city: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
    res.json(temples);
  }),
);

publicRouter.get(
  '/temples/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const temple = await prisma.temple.findFirst({
      where: { slug: req.params.slug, enabled: true },
      include: { city: { include: { country: true } } },
    });
    if (!temple) throw ApiError.notFound('Temple not found');
    res.json(temple);
  }),
);

// ── Bookings ──

publicRouter.post(
  '/bookings',
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await createBooking(req.body);
    res.status(201).json({
      reference: booking.reference,
      status: booking.status,
      message: 'Your booking request has been received. Our team will contact you shortly.',
    });
  }),
);
