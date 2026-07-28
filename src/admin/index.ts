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
    searchableFields: ['name', 'slug', 'deity'],
    populate: ['category'],
    defaultOrderBy: { sortOrder: 1 },
    beforeWrite: async (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      
      if (data.bhaktiType === 'location' && data.country && data.city) {
        const countryName = String(data.country).trim();
        const cityName = String(data.city).trim();
        const countrySlug = toSlug(countryName);
        const citySlug = toSlug(cityName);

        let countryDoc = await Country.findOne({ slug: countrySlug });
        if (!countryDoc) {
          countryDoc = await Country.create({ name: countryName, slug: countrySlug });
        }

        let cityDoc = await City.findOne({ slug: citySlug, countryId: countryDoc._id });
        if (!cityDoc) {
          await City.create({ name: cityName, slug: citySlug, countryId: countryDoc._id });
        }
      }
      return data;
    },
    afterWrite: async (doc, ctx) => {
      if (doc.bhaktiType === 'location' && doc.country && doc.city) {
        const cityName = String(doc.city).trim();
        const countryName = String(doc.country).trim();
        const citySlug = toSlug(cityName);
        const countrySlug = toSlug(countryName);

        // Find the city (with its country) created in beforeWrite
        const countryDoc = await Country.findOne({ slug: countrySlug });
        const cityDoc = await City.findOne({ slug: citySlug, countryId: countryDoc?._id });
        if (!cityDoc) return;

        const cityState = (cityDoc as any).state || '';

        // ── Convert content-builder blocks → sections ──
        const blocks: Array<{ type: string; value: any }> = Array.isArray(doc.blocks) ? doc.blocks : [];
        const sections: Array<{ heading: string; body: string }> = [];
        let firstImageUrl = '';
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.type === 'heading' && typeof b.value === 'string' && b.value.trim()) {
            // Look ahead for a paragraph that follows this heading
            const next = blocks[i + 1];
            const body = next?.type === 'paragraph' && typeof next.value === 'string' ? next.value : '';
            sections.push({ heading: b.value.trim(), body });
            if (body) i++; // skip the consumed paragraph
          } else if (b.type === 'paragraph' && typeof b.value === 'string' && b.value.trim()) {
            // Orphan paragraph (no heading before it)
            sections.push({ heading: '', body: b.value.trim() });
          }
          if (b.type === 'image' && typeof b.value === 'string' && b.value && !firstImageUrl) {
            firstImageUrl = b.value;
          }
        }

        // ── Check for an existing PujaLocation ──
        const existing = await PujaLocation.findOne({ pujaId: doc._id, cityId: cityDoc._id }).lean() as Record<string, any> | null;

        // Helper: use the new custom puja value if non-empty, else fall back to existing
        const pick = <T,>(newVal: T | undefined | null, existingVal: T | undefined | null): T | undefined | null => {
          if (newVal !== undefined && newVal !== null && newVal !== '') return newVal;
          return existingVal ?? null;
        };
        const pickArray = (newVal: any, existingVal: any) => {
          if (Array.isArray(newVal) && newVal.length > 0) return newVal;
          return existingVal ?? undefined;
        };

        const locSlug = pujaLocationSlug(doc.name, cityName, cityState);

        const upsertData: Record<string, any> = {
          pujaId: doc._id,
          cityId: cityDoc._id,
          cityName,
          countryName,
          slug: existing?.slug || locSlug, // keep existing slug if it was already set
          h1: `${doc.name} in ${cityName}`,
          published: doc.status === 'published',
          intro: pick(doc.excerpt, existing?.intro),

          // Fields mapped from custom puja form
          sections: pickArray(sections.length ? sections : null, existing?.sections),
          faqs: pickArray(doc.faqs, existing?.faqs),

          // SEO
          metaTitle: pick(doc.seoTitle, existing?.metaTitle),
          metaDescription: pick(doc.seoDescription, existing?.metaDescription),
          keywords: pickArray(doc.seoKeywords, existing?.keywords),
          ogImage: pick(firstImageUrl || doc.featuredImage, existing?.ogImage),

          // Auto-generated breadcrumb (only if none exists)
          breadcrumb: existing?.breadcrumb || ['Home', countryName, cityName, doc.name],

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
          imageAlt: pick(doc.title, existing?.imageAlt),
        };

        // Remove undefined keys so Mongo doesn't set them to null
        for (const key of Object.keys(upsertData)) {
          if (upsertData[key] === undefined) delete upsertData[key];
        }

        await PujaLocation.findOneAndUpdate(
          { pujaId: doc._id, cityId: cityDoc._id },
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
