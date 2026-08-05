import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireUserAuth } from '../middleware/auth.js';
import { createBooking } from '../bookings/createBooking.js';

import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { Temple } from '../models/Temple.js';
import { User } from '../models/User.js';

export const publicRouter = Router();


publicRouter.get(
  '/countries',
  asyncHandler(async (_req, res: Response) => {
    const countries = await Country.aggregate([
      { $match: { enabled: true } },
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
    const country = await Country.findOne({ slug: req.params.slug });
    if (!country) throw ApiError.notFound('Country not found');

    const cities = await City.find({ countryId: country._id, enabled: true }).sort({
      isPopular: -1,
      sortOrder: 1,
      name: 1,
    });

    res.json({ country, cities });
  }),
);


publicRouter.get(
  '/cities/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const city = await City.findOne({ slug: req.params.slug, enabled: true }).populate('country');
    if (!city) throw ApiError.notFound('City not found');

    const locations = await PujaLocation.find({ cityId: city._id, published: true })
      .populate({ path: 'puja', populate: { path: 'category' } })
      .sort({ createdAt: -1 });

    const temples = await Temple.find({ cityId: city._id, enabled: true }).sort({
      isFeatured: -1,
      sortOrder: 1,
    });

    res.json({ city, locations, temples });
  }),
);


publicRouter.get(
  '/pujas',
  asyncHandler(async (_req, res: Response) => {
    const pujas = await Puja.find({ enabled: true, bhaktiType: { $ne: 'location' } })
      .populate('category')
      .sort({ isFeatured: -1, sortOrder: 1 });
    res.json(pujas);
  }),
);

publicRouter.get(
  '/pujas/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const puja = await Puja.findOne({ slug: req.params.slug, enabled: true }).populate('category');
    if (!puja) throw ApiError.notFound('Puja not found');
    res.json(puja);
  }),
);


publicRouter.get(
  '/locations/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const location = await PujaLocation.findOne({ slug: req.params.slug, published: true }).populate([
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
    const temple = await Temple.findOne({ slug: req.params.slug, enabled: true }).populate({
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
    const booking = await createBooking(req.body);
    res.status(201).json({
      reference: booking.reference,
      status: booking.status,
      message: 'Your booking request has been received. Our team will contact you shortly.',
    });
  }),
);


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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
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