import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireUserAuth } from '../middleware/auth.js';
import { createFormSubmission } from '../bookings/createFormSubmission.js';
import { paymentRouter } from '../routes/razourpayment.js';
import { currencyRouter } from '../routes/currencyRoutes.js';

import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { PujaCategory } from '../models/PujaCategory.js';
import { Puja } from '../models/Puja.js';
import { User } from '../models/User.js';
import { Blog } from '../models/Blog.js';
import { buildSitemapXml } from '../utils/sitemap.js';
import { toSlug } from '../utils/slug.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

const getCountryCitiesHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawParam = req.params.countrySlug || req.params.slug || '';
  const cleanSlug = toSlug(rawParam.replace(/-cities$/, '').replace(/\/cities$/, ''));

  const slugVariants = [cleanSlug, toSlug(rawParam)];
  if (cleanSlug === 'usa' || cleanSlug === 'us') slugVariants.push('united-states');
  if (cleanSlug === 'united-states') slugVariants.push('usa');
  if (cleanSlug === 'uk') slugVariants.push('united-kingdom');
  if (cleanSlug === 'united-kingdom') slugVariants.push('uk');

  const safeNameRegex = new RegExp(`^${cleanSlug.replace(/-/g, ' ')}$`, 'i');

  const country = await Country.findOne({
    $or: [
      ...slugVariants.map((s) => ({ slug: s })),
      { name: safeNameRegex },
    ],
  });
  if (!country) throw ApiError.notFound('Country not found');

  const cities = await City.find({ countryId: country._id, enabled: { $ne: false } }).sort({
    isPopular: -1,
    sortOrder: 1,
    name: 1,
  });

  res.json({ country, cities });
});

publicRouter.get('/countries/:slug/cities', getCountryCitiesHandler);
publicRouter.get('/countries/:countrySlug-cities', getCountryCitiesHandler);

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

const getCityDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawSlug = req.params.citySlug || req.params.slug || '';
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
    .populate('countryId')
    .lean();

  if (!city) {
    throw ApiError.notFound('City not found');
  }

  const cityCountry = (city as any).countryId || (city as any).country;

  const cityDoc: any = {
    ...city,
    id: (city as any)._id ? (city as any)._id.toString() : (city as any).id,
    country: cityCountry
      ? {
          ...cityCountry,
          id: cityCountry._id ? cityCountry._id.toString() : cityCountry.id,
        }
      : undefined,
  };

  const safeCityName = String((city as any).name || '').trim();
  const safeCitySlug = String((city as any).slug || '').trim();
  const cityRegex = safeCityName ? new RegExp(`^${escapeRegex(safeCityName)}$`, 'i') : null;

  const locations = await Puja.find({
    bhaktiType: 'location',
    published: true,
    $or: [
      { cityId: (city as any)._id },
      ...(cityRegex ? [{ city: cityRegex }, { cityName: cityRegex }] : []),
      ...(safeCitySlug ? [{ citySlug: safeCitySlug }, { slug: new RegExp(`-in-${escapeRegex(safeCitySlug)}`, 'i') }] : []),
    ],
    enabled: { $ne: false },
  })
    .populate({ path: 'targetPujaId', populate: { path: 'categoryId' } })
    .populate({ path: 'pujaId', populate: { path: 'categoryId' } })
    .populate('categoryId')
    .sort({ createdAt: -1 })
    .lean();

  const formattedLocations = locations.map((l: any) => {
    const pujaObj = l.targetPujaId || l.pujaId || l.puja;
    const pIdStr = pujaObj?._id
      ? pujaObj._id.toString()
      : (pujaObj?.id ? String(pujaObj.id) : (typeof l.pujaId === 'string' ? l.pujaId : undefined));
    const cIdStr = (city as any)._id ? (city as any)._id.toString() : (city as any).id;

    return {
      ...l,
      id: l._id ? l._id.toString() : l.id,
      pujaId: pIdStr,
      cityId: cIdStr,
      puja: pujaObj && typeof pujaObj === 'object'
        ? {
            ...pujaObj,
            id: pujaObj._id ? pujaObj._id.toString() : (pujaObj.id || pujaObj._id),
          }
        : undefined,
    };
  });

  res.json({ city: cityDoc, locations: formattedLocations, temples: [] });
});

publicRouter.get('/cities/:slug', getCityDetailHandler);
publicRouter.get('/countries/:countrySlug-cities/:citySlug', getCityDetailHandler);
publicRouter.get('/countries/:countrySlug/cities/:citySlug', getCityDetailHandler);

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
      // Normalize image: old records stored it in heroImage, new ones use featuredImage
      featuredImage: p.featuredImage || p.heroImage || '',
      heroImage: p.featuredImage || p.heroImage || '',
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
    const rawParam = String(req.params.slug || '').trim();
    const s = toSlug(rawParam);
    const coreSlug = s.includes('-in-') ? s.split('-in-')[0] : s;
    const coreWithoutPuja = coreSlug.replace(/-puja$/, '');

    // 1. Try exact match first
    let puja = await Puja.findOne({
      slug: { $in: [rawParam, rawParam.toLowerCase(), s, coreSlug, `${coreSlug}-puja`, coreWithoutPuja] },
      enabled: { $ne: false },
    }).populate('category');

    // 2. Slug starts with or contains core slug
    if (!puja) {
      puja = await Puja.findOne({
        $or: [
          { slug: new RegExp(`^${escapeRegex(coreSlug)}`, 'i') },
          { slug: new RegExp(escapeRegex(coreSlug), 'i') },
        ],
        enabled: { $ne: false },
      }).populate('category');
    }

    // 3. Fall back to title or name match for slugs with extra descriptive words
    if (!puja) {
      const searchWords = coreSlug.replace(/-/g, ' ');
      puja = await Puja.findOne({
        $or: [
          { name: new RegExp(escapeRegex(searchWords), 'i') },
          { title: new RegExp(escapeRegex(searchWords), 'i') },
        ],
        enabled: { $ne: false },
      }).populate('category');
    }

    if (!puja) throw ApiError.notFound('Puja not found');
    res.json(puja);
  }),
);

publicRouter.get(
  '/blogs',
  asyncHandler(async (req: Request, res: Response) => {
    const { category, tag, search, limit = '50', page = '1' } = req.query as Record<string, string>;
    const filter: any = { status: { $ne: 'draft' } };

    if (category && category.trim()) {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (tag && tag.trim()) {
      filter.tags = { $in: [new RegExp(`^${tag.trim()}$`, 'i')] };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { excerpt: regex }, { author: regex }, { category: regex }, { tags: { $in: [regex] } }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-content')
        .sort({ publishDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const formatted = blogs.map((b: any) => ({
      ...b,
      id: b._id ? b._id.toString() : b.id,
    }));

    res.json({
      blogs: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }),
);

publicRouter.get(
  '/blogs/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const s = toSlug(req.params.slug);
    const blog = await Blog.findOne({
      $or: [{ slug: s }, { slug: req.params.slug }],
      status: { $ne: 'draft' },
    })
      .populate('relatedBlogs', 'title slug featuredImage excerpt category readTime publishDate author')
      .lean();

    if (!blog) throw ApiError.notFound('Blog not found');

    const formatted = {
      ...blog,
      id: (blog as any)._id ? (blog as any)._id.toString() : (blog as any).id,
      relatedBlogs: Array.isArray((blog as any).relatedBlogs)
        ? (blog as any).relatedBlogs.map((r: any) => ({
            ...r,
            id: r._id ? r._id.toString() : r.id,
          }))
        : [],
    };

    res.json(formatted);
  }),
);


const getLocationDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawParamSlug = String(req.params.slug || '').trim();
  const reqSlug = toSlug(rawParamSlug).replace(/-\d+$/, '');
  const rawCitySlug = req.params.citySlug || (req.params as any).slugCity || '';
  const citySlug = rawCitySlug ? toSlug(rawCitySlug).replace(/-cities$/, '') : undefined;

  // Extract core puja slug without suffixes like "-in-muscat", "-in-dubai", etc.
  const coreSlug = reqSlug.includes('-in-') ? reqSlug.split('-in-')[0] : reqSlug;
  const coreWithoutPuja = coreSlug.replace(/-puja$/, '');

  // If slug has "-in-{city}", try to extract inferred city
  let inferredCityName = '';
  if (reqSlug.includes('-in-')) {
    const afterIn = reqSlug.split('-in-')[1] || '';
    inferredCityName = afterIn.split('-')[0] || '';
  }

  let city: any = null;
  const targetCitySlug = citySlug || inferredCityName;
  if (targetCitySlug) {
    city = await City.findOne({
      $or: [
        { slug: targetCitySlug },
        { slug: toSlug(targetCitySlug) },
        { name: new RegExp(`^${escapeRegex(targetCitySlug.replace(/-/g, ' '))}$`, 'i') },
        { name: new RegExp(escapeRegex(targetCitySlug.replace(/-/g, ' ')), 'i') },
      ],
    });
  }

  const cityMatches: any[] = [];
  if (city) {
    cityMatches.push(
      { cityId: city._id },
      { city: new RegExp(`^${escapeRegex(city.name)}$`, 'i') },
      { cityName: new RegExp(`^${escapeRegex(city.name)}$`, 'i') },
      { citySlug: city.slug },
    );
  }

  const populateFields = [
    { path: 'targetPujaId', populate: { path: 'categoryId' } },
    { path: 'pujaId', populate: { path: 'categoryId' } },
    { path: 'categoryId' },
    { path: 'cityId', populate: { path: 'countryId' } },
  ];

  let location: any = null;

  // Candidate slugs to test for exact match
  const exactSlugList = [
    rawParamSlug,
    rawParamSlug.toLowerCase(),
    reqSlug,
    reqSlug.toLowerCase(),
    coreSlug,
    `${coreSlug}-puja`,
    coreWithoutPuja,
  ];

  // Tier 1: Exact slug match within the city
  if (cityMatches.length > 0) {
    location = await Puja.findOne({
      slug: { $in: exactSlugList },
      $or: cityMatches,
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  // Tier 2: Exact slug match globally
  if (!location) {
    location = await Puja.findOne({
      slug: { $in: exactSlugList },
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  // Tier 3: Slug starts with or contains core slug (supports long slugs with lots of things in title/slug)
  const coreRegex = new RegExp(`^${escapeRegex(coreSlug)}`, 'i');
  const coreRegexAnywhere = new RegExp(escapeRegex(coreSlug), 'i');

  if (!location && cityMatches.length > 0) {
    location = await Puja.findOne({
      $or: [{ slug: coreRegex }, { slug: coreRegexAnywhere }],
      $and: [{ $or: cityMatches }],
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  if (!location) {
    location = await Puja.findOne({
      $or: [{ slug: coreRegex }, { slug: coreRegexAnywhere }],
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  // Tier 4: Match by title, name, or h1 (e.g. title: "Ganesh Puja in Muscat" with extra keywords)
  const titleSearchWords = coreSlug.replace(/-/g, ' ');
  const titleRegex = new RegExp(escapeRegex(titleSearchWords), 'i');

  if (!location && cityMatches.length > 0) {
    location = await Puja.findOne({
      $or: [{ name: titleRegex }, { title: titleRegex }, { h1: titleRegex }],
      $and: [{ $or: cityMatches }],
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  if (!location) {
    location = await Puja.findOne({
      $or: [{ name: titleRegex }, { title: titleRegex }, { h1: titleRegex }],
      enabled: { $ne: false },
    }).populate(populateFields);
  }

  // Tier 5: Target puja ID match or fallback to parent main Puja if city matched
  if (!location && cityMatches.length > 0) {
    const parentPuja = await Puja.findOne({
      slug: { $in: [coreSlug, `${coreSlug}-puja`, coreWithoutPuja] },
      enabled: { $ne: false },
    });
    if (parentPuja) {
      location = await Puja.findOne({
        $or: [{ targetPujaId: parentPuja._id }, { pujaId: parentPuja._id }],
        $and: [{ $or: cityMatches }],
        enabled: { $ne: false },
      }).populate(populateFields);

      if (!location) {
        location = parentPuja;
      }
    }
  }

  if (!location) throw ApiError.notFound('Page not found');

  Puja.updateOne({ _id: location._id }, { $inc: { views: 1 } }).catch(() => undefined);

  const json = location.toJSON ? location.toJSON() : { ...location };
  const pujaDoc = json.targetPujaId || json.pujaId || json.puja;
  const cityDoc = json.cityId || json.city;

  if (pujaDoc && typeof pujaDoc === 'object') {
    json.puja = {
      ...pujaDoc,
      id: pujaDoc._id ? pujaDoc._id.toString() : (pujaDoc.id || pujaDoc._id),
    };
    json.pujaId = pujaDoc._id ? pujaDoc._id.toString() : (pujaDoc.id ? String(pujaDoc.id) : String(pujaDoc));
  }

  if (cityDoc && typeof cityDoc === 'object') {
    json.city = {
      ...cityDoc,
      id: cityDoc._id ? cityDoc._id.toString() : (cityDoc.id || cityDoc._id),
    };
    json.cityId = cityDoc._id ? cityDoc._id.toString() : (cityDoc.id ? String(cityDoc.id) : String(cityDoc));
  }

  // Ensure blocks and benefits exist
  json.blocks = Array.isArray(json.blocks) ? json.blocks : [];
  json.sections = Array.isArray(json.sections) ? json.sections : [];

  res.json(json);
});

publicRouter.get('/countries/:countrySlug-cities/:citySlug/:slug', getLocationDetailHandler);
publicRouter.get('/countries/:countrySlug/cities/:citySlug/:slug', getLocationDetailHandler);
publicRouter.get('/countries/:countrySlug-cities/:citySlug/pujas/:slug', getLocationDetailHandler);
publicRouter.get('/locations/:slug', getLocationDetailHandler);

publicRouter.get(
  '/locations',
  asyncHandler(async (_req, res: Response) => {
    const locations = await Puja.find({
      $or: [
        { bhaktiType: 'location' },
        { city: { $exists: true, $ne: '' } },
        { cityId: { $exists: true, $ne: null } },
      ],
      enabled: { $ne: false },
    })
      .select('slug updatedAt city citySlug country countrySlug cityId')
      .populate({ path: 'cityId', select: 'slug countryId', populate: { path: 'countryId', select: 'slug' } })
      .lean();
    res.json(locations);
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

publicRouter.use('/currency', currencyRouter);
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