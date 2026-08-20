import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireUserAuth } from '../middleware/auth.js';
import { createFormSubmission } from '../bookings/createFormSubmission.js';
import { paymentRouter } from '../routes/razourpayment.js';

import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { PujaCategory } from '../models/PujaCategory.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { Temple } from '../models/Temple.js';
import { User } from '../models/User.js';
import { buildSitemapXml } from '../utils/sitemap.js';
import { toSlug } from '../utils/slug.js';

export const publicRouter = Router();

publicRouter.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res: Response) => {
    const xml = await buildSitemapXml();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  }),
);


publicRouter.get(
  '/countries',
  asyncHandler(async (_req, res: Response) => {
    const countries = await Country.aggregate([
      { $match: { enabled: { $ne: false } } },
      { $sort: { sortOrder: 1 } },
      {
        $lookup: {
          from: 'cities',
          localField: '_id',
          foreignField: 'countryId',
          as: 'cities',
        },
      },
      { $addFields: { _count: { cities: { $size: '$cities' } } } },
      { $project: { cities: 0 } },
    ]);
    res.json(countries);
  }),
);

publicRouter.get(
  '/countries/:slug/cities',
  asyncHandler(async (req: Request, res: Response) => {
    const country = await Country.findOne({ slug: toSlug(req.params.slug) });
    if (!country) throw ApiError.notFound('Country not found');

    const cities = await City.find({ countryId: country._id, enabled: { $ne: false } }).sort({
      isPopular: -1,
      sortOrder: 1,
      name: 1,
    });

    res.json({ country, cities });
  }),
);

publicRouter.get(
  '/cities',
  asyncHandler(async (_req, res: Response) => {
    // Use $lookup so country data is included even without virtuals.
    // .lean() strips Mongoose virtuals, so .populate('country') would be empty.
    const cities = await City.aggregate([
      { $match: { enabled: { $ne: false } } },
      { $sort: { isPopular: -1, sortOrder: 1, name: 1 } },
      {
        $lookup: {
          from: 'countries',
          localField: 'countryId',
          foreignField: '_id',
          as: '_countryArr',
        },
      },
      {
        $addFields: {
          country: { $arrayElemAt: ['$_countryArr', 0] },
        },
      },
      { $project: { _countryArr: 0 } },
    ]);

    const formatted = cities.map((c: any) => ({
      ...c,
      id: c._id ? c._id.toString() : c.id,
      country: c.country
        ? {
            ...c.country,
            id: c.country._id ? c.country._id.toString() : c.country.id,
          }
        : undefined,
    }));

    res.json(formatted);
  }),
);

publicRouter.get(
  '/cities/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const rawSlug = req.params.slug;
    const cleanSlug = toSlug(rawSlug);

    const safeNameRegex = new RegExp(`^${rawSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, ' ')}$`, 'i');
    const safeSlugRegex = new RegExp(`^${cleanSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const city = await City.findOne({
      $or: [
        { slug: cleanSlug },
        { slug: rawSlug },
        { slug: rawSlug.toLowerCase() },
        { name: safeNameRegex },
        { slug: safeSlugRegex },
      ],
      enabled: { $ne: false },
    })
      .populate('country')
      .lean();

    if (!city) {
      throw ApiError.notFound('City not found');
    }

    const cityDoc: any = {
      ...city,
      id: (city as any)._id ? (city as any)._id.toString() : (city as any).id,
      country: (city as any).country
        ? {
            ...(city as any).country,
            id: (city as any).country._id
              ? (city as any).country._id.toString()
              : (city as any).country.id,
          }
        : undefined,
    };

    const locations = await PujaLocation.find({
      cityId: (city as any)._id,
      published: { $ne: false },
    })
      .populate({ path: 'pujaId', populate: { path: 'categoryId' } })
      .sort({ createdAt: -1 });

    const formattedLocations = locations.map((locDoc: any) => {
      const l = locDoc.toJSON ? locDoc.toJSON() : locDoc;
      const pujaObj = l.pujaId || l.puja;
      return {
        ...l,
        id: l._id ? l._id.toString() : l.id,
        puja: pujaObj
          ? {
              ...pujaObj,
              id: pujaObj._id ? pujaObj._id.toString() : (pujaObj.id || pujaObj._id),
            }
          : undefined,
      };
    });

    const temples = await Temple.find({ cityId: (city as any)._id, enabled: { $ne: false } })
      .sort({ isFeatured: -1, sortOrder: 1 })
      .lean();

    const formattedTemples = temples.map((t: any) => ({
      ...t,
      id: t._id ? t._id.toString() : t.id,
    }));

    res.json({ city: cityDoc, locations: formattedLocations, temples: formattedTemples });
  }),
);

publicRouter.get(
  '/pujas',
  asyncHandler(async (req: Request, res: Response) => {
    const { bhaktiType } = req.query;
    const filter: any = { enabled: { $ne: false } };

    if (bhaktiType) {
      filter.bhaktiType = String(bhaktiType);
    } else {
      filter.bhaktiType = { $ne: 'location' };
    }
const pujas = await Puja.find(filter)
  .select('-blocks -seoDescription -excerpt')   // ← removed "-featuredImage"
  .populate('category')
  .sort({ isFeatured: -1, sortOrder: 1 })
  .lean();

    const formatted = pujas.map((p: any) => ({
      ...p,
      id: p._id ? p._id.toString() : p.id,
      category: p.category && typeof p.category === 'object'
        ? {
            ...p.category,
            id: p.category._id ? p.category._id.toString() : p.category.id,
          }
        : undefined,
    }));

    res.json(formatted);
  }),
);
publicRouter.get(
  '/pujas/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const s = toSlug(req.params.slug);

    // 1. Try exact match first
    let puja = await Puja.findOne({ slug: s, enabled: { $ne: false } }).populate('category');

    // 2. Only fall back to fuzzy variants if no exact match found
    if (!puja) {
      puja = await Puja.findOne({
        $or: [
          { slug: s.toLowerCase() },
          { slug: `${s}-puja` },
          { slug: s.replace(/-puja$/, '') },
        ],
        enabled: { $ne: false },
      }).populate('category');
    }

    if (!puja) throw ApiError.notFound('Puja not found');
    res.json(puja);
  }),
);

publicRouter.get(
  '/locations/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const location = await PujaLocation.findOne({ slug: toSlug(req.params.slug), published: true }).populate([
      { path: 'pujaId', populate: { path: 'category' } },
      { path: 'cityId', populate: { path: 'country' } },
    ]);
    if (!location) throw ApiError.notFound('Page not found');

    PujaLocation.updateOne({ _id: location._id }, { $inc: { views: 1 } }).catch(() => undefined);

    const json = location.toJSON() as any;
    if (json.pujaId) json.puja = json.pujaId;
    if (json.cityId) json.city = json.cityId;

    res.json(json);
  }),
);

publicRouter.get(
  '/locations',
  asyncHandler(async (_req, res: Response) => {
    const locations = await PujaLocation.find({ published: true }).select('slug updatedAt');
    res.json(locations);
  }),
);


publicRouter.get(
  '/temples',
  asyncHandler(async (_req, res: Response) => {
    const temples = await Temple.find({ enabled: true })
      .populate('city')
      .sort({ isFeatured: -1, sortOrder: 1 });
    res.json(temples);
  }),
);

publicRouter.get(
  '/temples/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const temple = await Temple.findOne({ slug: toSlug(req.params.slug), enabled: true }).populate({
      path: 'city',
      populate: { path: 'country' },
    });
    if (!temple) throw ApiError.notFound('Temple not found');
    res.json(temple);
  }),
);


publicRouter.post(
  '/bookings',
  asyncHandler(async (req: Request, res: Response) => {
    const submission = await createFormSubmission(req.body);
    res.status(201).json({
      reference: submission.reference,
      status: submission.status,
      message: 'Your booking request has been received. Our team will contact you shortly.',
    });
  }),
);

publicRouter.use('/payment', paymentRouter);


publicRouter.post(
  '/auth/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, phone } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
    };

    if (!email || !password || !name || !phone) {
      throw ApiError.badRequest('Email, password, name, and phone are required');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.badRequest('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      phone,
      passwordHash,
    });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, name: user.name },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );

    res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, phone: user.phone },
    });
  }),
);

publicRouter.post(
  '/auth/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }
console.log('Login:', email);

    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', !!user);

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
      console.log('Password match:', isMatch);

    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, name: user.name },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );

    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, phone: user.phone },
    });
  }),
);

publicRouter.get(
  '/auth/me',
  requireUserAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.sub).select('id email name phone');
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    res.json(user);
  }),
);