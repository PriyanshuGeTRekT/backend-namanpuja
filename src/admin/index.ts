/**
 * Admin API — all routes require a valid admin JWT (except /auth/login).
 * Wired to react-admin via the ra-data-simple-rest dialect.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCrudRouter } from './crudFactory.js';
import { authRouter } from './auth.routes.js';
import { toSlug, pujaLocationSlug } from '../utils/slug.js';

import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { PujaCategory } from '../models/PujaCategory.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { Temple } from '../models/Temple.js';
import { Booking } from '../models/Booking.js';

export const adminRouter = Router();

// Auth (login is public; everything else requires a token)
adminRouter.use('/auth', authRouter);

// Everything below requires authentication
adminRouter.use(requireAuth);

adminRouter.use(
  '/countries',
  createCrudRouter({
    resource: 'countries',
    model: Country,
    searchableFields: ['name', 'slug', 'isoCode'],
    defaultOrderBy: { sortOrder: 1 },
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
    model: City,
    searchableFields: ['name', 'slug', 'state'],
    populate: ['country'],
    defaultOrderBy: { sortOrder: 1 },
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
    model: PujaCategory,
    searchableFields: ['name', 'slug'],
    defaultOrderBy: { sortOrder: 1 },
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
    model: Puja,
    searchableFields: ['name', 'slug', 'deity'],
    populate: ['category'],
    defaultOrderBy: { sortOrder: 1 },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
  }),
);

adminRouter.use(
  '/puja-pages',
  createCrudRouter({
    resource: 'puja-pages',
    model: Puja,
    searchableFields: ['name', 'slug', 'deity', 'title', 'bhaktiType', 'country', 'city'],
    populate: ['category'],
    defaultOrderBy: { sortOrder: 1 },
    // Map form field names → model field names before saving
    beforeWrite: async (data) => {
      if (!data.name && data.title) {
        data.name = data.title;
      }
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      if (data.basePrice !== undefined && data.basePrice !== '') {
        data.basePrice = Number(data.basePrice);
      } else {
        data.basePrice = 0;
      }
      
      if (data.bhaktiType === 'location' && data.country && data.city) {
        const countryName = String(data.country).trim();
        const cityName = String(data.city).trim();
        const countrySlug = data.countrySlug ? String(data.countrySlug).trim() : toSlug(countryName);
        const citySlug = data.citySlug ? String(data.citySlug).trim() : toSlug(cityName);

        let countryDoc = await Country.findOne({ $or: [{ slug: countrySlug }, { name: countryName }] });
        if (!countryDoc) {
          countryDoc = await Country.create({
            name: countryName,
            slug: countrySlug,
            isoCode: String(data.countryIsoCode || ''),
            flagEmoji: String(data.countryFlagEmoji || ''),
            sortOrder: Number(data.countrySortOrder) || 0,
          });
        } else if (data.countryIsoCode || data.countryFlagEmoji || data.countrySortOrder !== undefined) {
          const countryUpdates: Record<string, any> = {};
          if (data.countryIsoCode) countryUpdates.isoCode = String(data.countryIsoCode);
          if (data.countryFlagEmoji) countryUpdates.flagEmoji = String(data.countryFlagEmoji);
          if (data.countrySortOrder !== undefined) countryUpdates.sortOrder = Number(data.countrySortOrder);

          if (Object.keys(countryUpdates).length > 0) {
            await Country.updateOne({ _id: countryDoc._id }, { $set: countryUpdates });
          }
        }

        let cityDoc = await City.findOne({ $or: [{ slug: citySlug }, { name: cityName }], countryId: countryDoc._id });
        if (!cityDoc) {
          await City.create({
            name: cityName,
            slug: citySlug,
            countryId: countryDoc._id,
            state: String(data.cityState || data.state || ''),
            geoRegion: String(data.cityGeoRegion || data.geoRegion || ''),
            latitude: data.cityLatitude !== undefined && data.cityLatitude !== '' ? Number(data.cityLatitude) : (data.latitude !== undefined && data.latitude !== '' ? Number(data.latitude) : undefined),
            longitude: data.cityLongitude !== undefined && data.cityLongitude !== '' ? Number(data.cityLongitude) : (data.longitude !== undefined && data.longitude !== '' ? Number(data.longitude) : undefined),
            isPopular: Boolean(data.cityIsPopular || data.isPopular),
            sortOrder: Number(data.citySortOrder || data.sortOrder) || 0,
          });
        } else {
          const cityUpdates: Record<string, any> = {};
          if (data.cityState !== undefined || data.state !== undefined) cityUpdates.state = String(data.cityState ?? data.state);
          if (data.cityGeoRegion !== undefined || data.geoRegion !== undefined) cityUpdates.geoRegion = String(data.cityGeoRegion ?? data.geoRegion);
          if (data.cityLatitude !== undefined || data.latitude !== undefined) cityUpdates.latitude = Number(data.cityLatitude ?? data.latitude);
          if (data.cityLongitude !== undefined || data.latitude !== undefined) cityUpdates.longitude = Number(data.cityLongitude ?? data.longitude);
          if (data.cityIsPopular !== undefined || data.isPopular !== undefined) cityUpdates.isPopular = Boolean(data.cityIsPopular ?? data.isPopular);
          if (data.citySortOrder !== undefined || data.sortOrder !== undefined) cityUpdates.sortOrder = Number(data.citySortOrder ?? data.sortOrder);

          if (Object.keys(cityUpdates).length > 0) {
            await City.updateOne({ _id: cityDoc._id }, { $set: cityUpdates });
          }
        }
      }
      return data;
    },
    // Map model field names → form field names when loading for edit
    getTransform: (doc: Record<string, any>) => ({
      ...doc,
      // The form uses 'title' but model saves as 'name'
      title: doc.title ?? doc.name,
      // The form uses 'excerpt' but model may save as 'excerpt' or 'shortDesc'
      excerpt: doc.excerpt ?? doc.shortDesc ?? doc.shortDescription ?? '',
      basePrice: doc.basePrice ?? 0,
      // SEO field name mapping
      seoTitle: doc.seoTitle ?? doc.metaTitle ?? '',
      seoDescription: doc.seoDescription ?? doc.metaDescription ?? '',
      seoKeywords: doc.seoKeywords ?? doc.keywords ?? [],
      // blocks must be an array for useFieldArray
      blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
    }),
    afterWrite: async (doc, ctx) => {
      if (doc.bhaktiType === 'location' && doc.country && doc.city) {
        const cityName = String(doc.city).trim();
        const countryName = String(doc.country).trim();
        const citySlug = doc.citySlug ? String(doc.citySlug).trim() : toSlug(cityName);
        const countrySlug = doc.countrySlug ? String(doc.countrySlug).trim() : toSlug(countryName);

        // Find the city (with its country) created in beforeWrite
        const countryDoc = await Country.findOne({ $or: [{ slug: countrySlug }, { name: countryName }] });
        const cityDoc = await City.findOne({ $or: [{ slug: citySlug }, { name: cityName }], countryId: countryDoc?._id });
        if (!cityDoc) return;

        const cityState = (cityDoc as any).state || '';
        const targetPujaId = doc.targetPujaId || doc.pujaId || doc._id;

        // ── Full blocks array — preserve all block types ──
        const blocks: Array<{ type: string; value: any; bgColor?: string }> = Array.isArray(doc.blocks) ? doc.blocks : [];
        
        // Build legacy sections (heading+body) for backwards compat
        const sections: Array<{ heading: string; body: string }> = [];
        let firstImageUrl = '';
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.type === 'heading' && typeof b.value === 'string' && b.value.trim()) {
            const next = blocks[i + 1];
            const body = next?.type === 'paragraph' && typeof next.value === 'string' ? next.value : '';
            sections.push({ heading: b.value.trim(), body });
            if (body) i++;
          } else if (b.type === 'paragraph' && typeof b.value === 'string' && b.value.trim()) {
            sections.push({ heading: '', body: b.value.trim() });
          }
          if (b.type === 'image' && typeof b.value === 'string' && b.value && !firstImageUrl) {
            firstImageUrl = b.value;
          }
        }

        // ── Check for an existing PujaLocation ──
        const existing = await PujaLocation.findOne({ pujaId: targetPujaId, cityId: cityDoc._id }).lean() as Record<string, any> | null;

        // Helper: use the new custom puja value if non-empty, else fall back to existing
        const pick = <T,>(newVal: T | undefined | null, existingVal: T | undefined | null): T | undefined | null => {
          if (newVal !== undefined && newVal !== null && newVal !== '') return newVal;
          return existingVal ?? null;
        };
        const pickArray = (newVal: any, existingVal: any) => {
          if (Array.isArray(newVal) && newVal.length > 0) return newVal;
          return existingVal ?? undefined;
        };

        const locSlug = pujaLocationSlug(doc.name || doc.title, cityName, cityState);

        const upsertData: Record<string, any> = {
          pujaId: targetPujaId,
          cityId: cityDoc._id,
          cityName,
          countryName,
          slug: existing?.slug || locSlug, // keep existing slug if it was already set
          h1: `${doc.name || doc.title} in ${cityName}`,
          published: doc.status === 'published',
          basePrice: doc.basePrice !== undefined && doc.basePrice !== '' ? Number(doc.basePrice) : (existing?.basePrice ?? 0),
          intro: pick(doc.excerpt, existing?.intro),

          // ── Full blocks array — ALWAYS overwrite with submitted blocks ──
          blocks: Array.isArray(doc.blocks) ? doc.blocks : (existing?.blocks ?? []),

          // Legacy sections for older fallback paths — updated to match current blocks
          sections: sections,

          // Featured image from form upload field
          featuredImage: doc.featuredImage ?? existing?.featuredImage ?? '',
          faqs: doc.faqs && doc.faqs.length ? doc.faqs : (existing?.faqs ?? []),

          // SEO
          metaTitle: pick(doc.seoTitle, existing?.metaTitle),
          metaDescription: pick(doc.seoDescription, existing?.metaDescription),
          keywords: pickArray(doc.seoKeywords, existing?.keywords),
          ogImage: firstImageUrl || doc.featuredImage || existing?.ogImage || '',

          // Auto-generated breadcrumb (only if none exists)
          breadcrumb: existing?.breadcrumb || ['Home', countryName, cityName, doc.name || doc.title],

          // Rich fields: PRESERVE existing data (no UI in custom puja form)
          benefits: existing?.benefits ?? undefined,
          rituals: existing?.rituals ?? undefined,
          samagri: existing?.samagri ?? undefined,
          whyChooseUs: existing?.whyChooseUs ?? undefined,
          occasions: existing?.occasions ?? undefined,
          serviceAreas: existing?.serviceAreas ?? undefined,
          cta: existing?.cta ?? undefined,
          internalLinks: existing?.internalLinks ?? undefined,
          canonicalUrl: existing?.canonicalUrl ?? undefined,
          imageAlt: pick(doc.title || doc.name, existing?.imageAlt),
        };

        // Remove undefined keys so Mongo doesn't set them to null
        for (const key of Object.keys(upsertData)) {
          if (upsertData[key] === undefined) delete upsertData[key];
        }

        await PujaLocation.findOneAndUpdate(
          { pujaId: targetPujaId, cityId: cityDoc._id },
          upsertData,
          { upsert: true, new: true },
        );
      }
    }
  }),
);

adminRouter.use(
  '/puja-locations',
  createCrudRouter({
    resource: 'puja-locations',
    model: PujaLocation,
    searchableFields: ['slug', 'h1', 'metaTitle', 'cityName', 'countryName'],
    populate: ['puja', 'city'], // Note: deeply populating city.country usually requires a specific object in mongoose, but this is simple array syntax. For simple admin it works.
    beforeWrite: async (data) => {
      // Auto-build slug + h1 from puja + city when missing
      if ((!data.slug || !data.h1) && data.pujaId) {
        const puja = await Puja.findById(data.pujaId);
        
        let cName = '';
        let cState = '';
        if (data.cityId) {
          const city = await City.findById(data.cityId);
          if (city) {
            cName = city.name;
            cState = (city as any).state || '';
          }
        } else if (data.cityName) {
          cName = String(data.cityName);
          cState = data.countryName ? String(data.countryName) : '';
        }

        if (puja && cName) {
          if (!data.slug) data.slug = pujaLocationSlug(puja.name, cName, cState);
          if (!data.h1) data.h1 = `${puja.name} in ${cName}${cState && !data.cityName ? ', ' + cState : ''}`;
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
    model: Temple,
    searchableFields: ['name', 'slug', 'deity'],
    populate: ['city'],
    defaultOrderBy: { sortOrder: 1 },
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
    model: Booking,
    searchableFields: ['reference', 'customerName', 'customerEmail', 'customerPhone'],
    populate: ['puja', 'city'],
  }),
);
