/**
 * Admin API — all routes require a valid admin JWT (except /auth/login).
 * Wired to react-admin via the ra-data-simple-rest dialect.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCrudRouter } from './crudFactory.js';
import { authRouter } from './auth.routes.js';
import { toSlug, pujaLocationSlug } from '../utils/slug.js';
import { generateAndSaveSitemap } from '../utils/sitemap.js';
import { fireDeployHook } from '../utils/deployHook.js';

import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { PujaCategory } from '../models/PujaCategory.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Blog } from '../models/Blog.js';

export const adminRouter = Router();

// Auth (login is public; everything else requires a token)
adminRouter.use('/auth', authRouter);

// Everything below requires authentication
adminRouter.use(requireAuth);

// 1. Registered Users Section
adminRouter.use(
  '/users',
  createCrudRouter({
    resource: 'users',
    model: User,
    searchableFields: ['name', 'email', 'phone'],
  }),
);

// 2. Form Submissions from /book (No payment ID yet)
adminRouter.use(
  '/form-submissions',
  createCrudRouter({
    resource: 'form-submissions',
    model: Booking,
    searchableFields: ['reference', 'customerName', 'customerEmail', 'customerPhone'],
    populate: ['puja', 'city', 'user'],
    baseFilter: { $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }] },
  }),
);

// 3. Paid Bookings / Payments (Completed payment)
adminRouter.use(
  '/paid-bookings',
  createCrudRouter({
    resource: 'paid-bookings',
    model: Booking,
    searchableFields: ['reference', 'customerName', 'customerEmail', 'customerPhone', 'paymentId'],
    populate: ['puja', 'city', 'user'],
    baseFilter: { paymentId: { $exists: true, $nin: [null, ''] } },
  }),
);

adminRouter.use(
  '/countries',
  createCrudRouter({
    resource: 'countries',
    model: Country,
    searchableFields: ['name', 'slug', 'isoCode', 'currencyCode'],
    defaultOrderBy: { sortOrder: 1 },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      const kIso = String(data.isoCode || '').trim().toLowerCase();
      const kName = String(data.name || '').trim().toLowerCase();
      const defaultLookup: Record<string, { code: string; symbol: string }> = {
        in: { code: 'INR', symbol: '₹' }, india: { code: 'INR', symbol: '₹' },
        us: { code: 'USD', symbol: '$' }, usa: { code: 'USD', symbol: '$' }, 'united states': { code: 'USD', symbol: '$' },
        gb: { code: 'GBP', symbol: '£' }, uk: { code: 'GBP', symbol: '£' }, 'united kingdom': { code: 'GBP', symbol: '£' },
        ca: { code: 'CAD', symbol: 'CA$' }, canada: { code: 'CAD', symbol: 'CA$' },
        au: { code: 'AUD', symbol: 'A$' }, australia: { code: 'AUD', symbol: 'A$' },
        om: { code: 'OMR', symbol: 'OMR' }, oman: { code: 'OMR', symbol: 'OMR' },
        ae: { code: 'AED', symbol: 'AED' }, uae: { code: 'AED', symbol: 'AED' }, 'united arab emirates': { code: 'AED', symbol: 'AED' },
        de: { code: 'EUR', symbol: '€' }, germany: { code: 'EUR', symbol: '€' },
        fr: { code: 'EUR', symbol: '€' }, france: { code: 'EUR', symbol: '€' },
        sg: { code: 'SGD', symbol: 'S$' }, singapore: { code: 'SGD', symbol: 'S$' },
        np: { code: 'NPR', symbol: 'NPR' }, nepal: { code: 'NPR', symbol: 'NPR' },
        jp: { code: 'JPY', symbol: '¥' }, japan: { code: 'JPY', symbol: '¥' },
        lk: { code: 'LKR', symbol: 'Rs' }, 'sri lanka': { code: 'LKR', symbol: 'Rs' },
        th: { code: 'THB', symbol: '฿' }, thailand: { code: 'THB', symbol: '฿' },
        my: { code: 'MYR', symbol: 'RM' }, malaysia: { code: 'MYR', symbol: 'RM' },
        sa: { code: 'SAR', symbol: 'SAR' }, 'saudi arabia': { code: 'SAR', symbol: 'SAR' },
        qa: { code: 'QAR', symbol: 'QAR' }, qatar: { code: 'QAR', symbol: 'QAR' },
      };
      const resolved = defaultLookup[kIso] || defaultLookup[kName] || { code: 'USD', symbol: '$' };
      if (!data.currencyCode) data.currencyCode = resolved.code;
      if (!data.currencySymbol) data.currencySymbol = resolved.symbol;
      return data;
    },
    afterWrite: () => { fireDeployHook('countries'); },
    afterDelete: () => { fireDeployHook('countries'); },
  }),
);

adminRouter.use(
  '/cities',
  createCrudRouter({
    resource: 'cities',
    model: City,
    searchableFields: ['name', 'slug', 'state'],
    populate: ['countryId'],
    defaultOrderBy: { sortOrder: 1 },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      return data;
    },
    afterWrite: () => { fireDeployHook('cities'); },
    afterDelete: () => { fireDeployHook('cities'); },
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
    afterWrite: () => { fireDeployHook('puja-categories'); },
    afterDelete: () => { fireDeployHook('puja-categories'); },
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
    baseFilter: { bhaktiType: { $ne: 'location' } },
    beforeWrite: (data) => {
      if (data.name && !data.slug) data.slug = toSlug(String(data.name));
      if (!data.bhaktiType) data.bhaktiType = 'main';
      if (data.categoryId === '' || data.categoryId === null) {
        delete data.categoryId;
      }
      // Normalize image fields: heroImage and featuredImage are the same thing.
      // Whichever is set, copy it to the other so both admin panel and frontend work.
      if (data.heroImage && !data.featuredImage) {
        data.featuredImage = data.heroImage;
      } else if (data.featuredImage && !data.heroImage) {
        data.heroImage = data.featuredImage;
      }
      if (data.basePrice !== undefined && data.basePrice !== '') {
        data.basePrice = Number(data.basePrice);
      }
      if (data.onlinePrice !== undefined && data.onlinePrice !== '') {
        data.onlinePrice = Number(data.onlinePrice);
      } else if (data.basePrice) {
        data.onlinePrice = Number(data.basePrice);
      }
      if (data.offlinePrice !== undefined && data.offlinePrice !== '') {
        data.offlinePrice = Number(data.offlinePrice);
      }
      return data;
    },
    afterWrite: () => { fireDeployHook('pujas'); },
    afterDelete: () => { fireDeployHook('pujas'); },
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
    beforeWrite: async (data, ctx) => {
      if (!data.name && data.title) {
        data.name = data.title;
      }
      if (data.bhaktiType !== 'location' && data.name && !data.slug) {
        data.slug = toSlug(String(data.name));
      }
      // On create, ensure the slug is unique — if it already exists in the DB,
      // append a numeric suffix until we find a free one.
      if (ctx.isCreate && data.slug) {
        const baseSlug = String(data.slug);
        let candidateSlug = baseSlug;
        let attempt = 1;
        while (await Puja.exists({ slug: candidateSlug })) {
          candidateSlug = `${baseSlug}-${attempt}`;
          attempt++;
        }
        data.slug = candidateSlug;
      }
      if (data.basePrice !== undefined && data.basePrice !== '') {
        data.basePrice = Number(data.basePrice);
      } else {
        data.basePrice = 0;
      }
      if (data.onlinePrice !== undefined && data.onlinePrice !== '') {
        data.onlinePrice = Number(data.onlinePrice);
      } else if (data.basePrice) {
        data.onlinePrice = Number(data.basePrice);
      }
      if (data.offlinePrice !== undefined && data.offlinePrice !== '') {
        data.offlinePrice = Number(data.offlinePrice);
      }
      if (data.categoryId === '' || data.categoryId === null) {
        delete data.categoryId;
      }
      // Normalize image fields: heroImage and featuredImage are the same thing.
      if (data.heroImage && !data.featuredImage) {
        data.featuredImage = data.heroImage;
      } else if (data.featuredImage && !data.heroImage) {
        data.heroImage = data.featuredImage;
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
            longitude: data.cityLongitude !== undefined && data.cityLongitude !== '' ? Number(data.cityLongitude) : (data.latitude !== undefined && data.latitude !== '' ? Number(data.latitude) : undefined),
            isPopular: Boolean(data.cityIsPopular || data.isPopular),
            sortOrder: Number(data.citySortOrder || data.sortOrder) || 0,
          });
        } else {
          const cityUpdates: Record<string, any> = {};
          if (data.cityState !== undefined || data.state !== undefined) cityUpdates.state = String(data.cityState ?? data.state);
          if (data.cityGeoRegion !== undefined || data.geoRegion !== undefined) cityUpdates.geoRegion = String(data.cityGeoRegion ?? data.geoRegion);
          if (data.cityLatitude !== undefined || data.latitude !== undefined) cityUpdates.latitude = Number(data.cityLatitude ?? data.latitude);
          if (data.cityLongitude !== undefined || data.latitude !== undefined) cityUpdates.longitude = Number(data.cityLongitude ?? data.latitude);
          if (data.cityIsPopular !== undefined || data.isPopular !== undefined) cityUpdates.isPopular = Boolean(data.cityIsPopular ?? data.isPopular);
          if (data.citySortOrder !== undefined || data.sortOrder !== undefined) cityUpdates.sortOrder = Number(data.citySortOrder ?? data.sortOrder);

          if (Object.keys(cityUpdates).length > 0) {
            await City.updateOne({ _id: cityDoc._id }, { $set: cityUpdates });
          }
        }
      }
      return data;
    },
    getTransform: (doc: Record<string, any>) => ({
      ...doc,
      title: doc.title ?? doc.name,
      excerpt: doc.excerpt ?? doc.shortDesc ?? doc.shortDescription ?? '',
      basePrice: doc.basePrice ?? 0,
      seoTitle: doc.seoTitle ?? doc.metaTitle ?? '',
      seoDescription: doc.seoDescription ?? doc.metaDescription ?? '',
      seoKeywords: doc.seoKeywords ?? doc.keywords ?? [],
      blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
      // Normalize image fields so admin form shows the image correctly
      featuredImage: doc.featuredImage || doc.heroImage || '',
    }),
    afterWrite: async (doc, _ctx) => {
      fireDeployHook('puja-pages');
      if (doc.bhaktiType === 'location' && doc.country && doc.city) {
        const cityName = String(doc.city).trim();
        const countryName = String(doc.country).trim();
        const citySlug = doc.citySlug ? String(doc.citySlug).trim() : toSlug(cityName);
        const countrySlug = doc.countrySlug ? String(doc.countrySlug).trim() : toSlug(countryName);

        const countryDoc = await Country.findOne({ $or: [{ slug: countrySlug }, { name: countryName }] });
        const cityDoc = await City.findOne({ $or: [{ slug: citySlug }, { name: cityName }], countryId: countryDoc?._id });
        if (!cityDoc) return;

        const cityState = (cityDoc as any).state || '';
        const targetPujaId = doc.targetPujaId || doc.pujaId || doc._id;

        const blocks: Array<{ type: string; value: any; bgColor?: string }> = Array.isArray(doc.blocks) ? doc.blocks : [];
        
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

        const existing = await PujaLocation.findOne({ pujaId: targetPujaId, cityId: cityDoc._id }).lean() as Record<string, any> | null;

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
          slug: existing?.slug || doc.slug || locSlug,
          h1: `${doc.name || doc.title} in ${cityName}`,
          published: doc.status === 'published',
          basePrice: doc.basePrice !== undefined && doc.basePrice !== '' ? Number(doc.basePrice) : (existing?.basePrice ?? 0),
          onlinePrice: doc.onlinePrice !== undefined && doc.onlinePrice !== '' ? Number(doc.onlinePrice) : existing?.onlinePrice,
          offlinePrice: doc.offlinePrice !== undefined && doc.offlinePrice !== '' ? Number(doc.offlinePrice) : existing?.offlinePrice,
          intro: pick(doc.excerpt, existing?.intro),
          blocks: Array.isArray(doc.blocks) ? doc.blocks : (existing?.blocks ?? []),
          sections: sections,
          featuredImage: doc.featuredImage ?? existing?.featuredImage ?? '',
          faqs: doc.faqs && doc.faqs.length ? doc.faqs : (existing?.faqs ?? []),
          metaTitle: pick(doc.seoTitle, existing?.metaTitle),
          metaDescription: pick(doc.seoDescription, existing?.metaDescription),
          keywords: pickArray(doc.seoKeywords, existing?.keywords),
          ogImage: firstImageUrl || doc.featuredImage || existing?.ogImage || '',
          breadcrumb: existing?.breadcrumb || ['Home', countryName, cityName, doc.name || doc.title],
          imageAlt: pick(doc.title || doc.name, existing?.imageAlt),
        };

        for (const key of Object.keys(upsertData)) {
          if (upsertData[key] === undefined) delete upsertData[key];
        }

        await PujaLocation.findOneAndUpdate(
          { pujaId: targetPujaId, cityId: cityDoc._id },
          upsertData,
          { upsert: true, new: true },
        );
      }

      // Bidirectional sync: if this is a main bhakti page linked to a Puja,
      // push the updated image and pricing back to the source Puja so the
      // pujas listing page always stays consistent.
      if (doc.bhaktiType === 'main') {
        const sourcePujaName = doc.title || doc.name;
        if (sourcePujaName) {
          const updateFields: Record<string, any> = {};
          const img = doc.featuredImage || doc.heroImage || '';
          if (img) {
            updateFields.featuredImage = img;
            updateFields.heroImage = img;
          }
          if (doc.onlinePrice !== undefined && doc.onlinePrice !== '') {
            updateFields.onlinePrice = Number(doc.onlinePrice);
          }
          if (doc.offlinePrice !== undefined && doc.offlinePrice !== '') {
            updateFields.offlinePrice = Number(doc.offlinePrice);
          }
          if (Object.keys(updateFields).length > 0) {
            // Update by name — bhaktiType=main pujas are uniquely identified by name
            await Puja.updateMany(
              { name: sourcePujaName, bhaktiType: { $ne: 'location' } },
              { $set: updateFields },
            );
          }
        }
      }

      await generateAndSaveSitemap();
    }
  }),
);

adminRouter.use(
  '/puja-locations',
  createCrudRouter({
    resource: 'puja-locations',
    model: PujaLocation,
    searchableFields: ['slug', 'h1', 'metaTitle', 'cityName', 'countryName'],
    populate: ['pujaId', 'cityId'],
    beforeWrite: async (data) => {
      if (data.onlinePrice !== undefined && data.onlinePrice !== '') {
        data.onlinePrice = Number(data.onlinePrice);
      }
      if (data.offlinePrice !== undefined && data.offlinePrice !== '') {
        data.offlinePrice = Number(data.offlinePrice);
      }

      // Always recompute slug from puja + city — the admin UI shows it read-only,
      // but we also strip any user-submitted value so the backend is the sole source of truth.
      if (data.pujaId) {
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

        if (puja && cName && !data.slug) {
            data.slug = pujaLocationSlug(puja.name, cName, cState);
          if (!data.h1) data.h1 = `${puja.name} in ${cName}${cState && !data.cityName ? ', ' + cState : ''}`;
        }
      }
      return data;
    },
    afterWrite: async () => {
      await generateAndSaveSitemap();
      fireDeployHook('puja-locations');
    },
    afterDelete: () => { fireDeployHook('puja-locations'); },
  }),
);


adminRouter.use(
  '/bookings',
  createCrudRouter({
    resource: 'bookings',
    model: Booking,
    searchableFields: ['reference', 'customerName', 'customerEmail', 'customerPhone', 'paymentId'],
    populate: ['puja', 'city', 'user'],
  }),
);

function compileBlogBlocksToHtml(blocks: Array<{ type: string; value: any; bgColor?: string }>): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  const htmlParts: string[] = [];

  for (const b of blocks) {
    if (!b || !b.type) continue;
    if (b.type === 'heading' && typeof b.value === 'string' && b.value.trim()) {
      htmlParts.push(`<h2>${b.value.trim()}</h2>`);
    } else if (b.type === 'paragraph' && typeof b.value === 'string' && b.value.trim()) {
      const bgStyle = b.bgColor && b.bgColor !== '#ffffff' ? ` style="background-color: ${b.bgColor}; padding: 14px 18px; border-radius: 12px; margin-bottom: 1.5rem;"` : '';
      const formatted = b.value.trim().replace(/\n/g, '<br/>');
      htmlParts.push(`<p${bgStyle}>${formatted}</p>`);
    } else if (b.type === 'image' && typeof b.value === 'string' && b.value.trim()) {
      htmlParts.push(`<img src="${b.value.trim()}" alt="Blog visual" class="rounded-2xl my-6 w-full" loading="lazy" />`);
    } else if (b.type === 'timing' && b.value && typeof b.value === 'object') {
      const label = b.value.label ? `<strong>${b.value.label}:</strong> ` : '';
      const time = b.value.time || '';
      if (label || time) {
        htmlParts.push(`<p class="timing-badge">${label}${time}</p>`);
      }
    } else if (b.type === 'table' && b.value && typeof b.value === 'object') {
      const cols = Array.isArray(b.value.columns) ? b.value.columns : [];
      const rows = Array.isArray(b.value.rows) ? b.value.rows : [];
      if (cols.length > 0 || rows.length > 0) {
        let tableHtml = '<div class="overflow-x-auto my-6"><table class="w-full border-collapse border border-stone-200"><thead><tr class="bg-stone-100">';
        for (const col of cols) {
          tableHtml += `<th class="border border-stone-200 p-2 text-left font-bold">${col}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        for (const row of rows) {
          tableHtml += '<tr>';
          const cells = Array.isArray(row.cells) ? row.cells : [];
          for (let c = 0; c < cols.length; c++) {
            tableHtml += `<td class="border border-stone-200 p-2">${cells[c] || ''}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        htmlParts.push(tableHtml);
      }
    } else if (b.type === 'cta' && b.value && typeof b.value === 'object') {
      const label = b.value.label || 'Read More';
      const url = b.value.url || '#';
      htmlParts.push(
        `<div class="my-8 text-center"><a href="${url}" class="inline-block bg-[#D77E1E] text-white font-bold px-6 py-3 rounded-full hover:bg-orange-600 transition shadow-sm">${label}</a></div>`
      );
    }
  }

  return htmlParts.join('\n');
}

adminRouter.use(
  '/blogs',
  createCrudRouter({
    resource: 'blogs',
    model: Blog,
    searchableFields: ['title', 'slug', 'author', 'category', 'excerpt'],
    populate: ['relatedBlogs'],
    defaultOrderBy: { publishDate: -1 },
    beforeWrite: (data) => {
      if (data.title && !data.slug) {
        data.slug = toSlug(String(data.title));
      } else if (data.slug) {
        data.slug = toSlug(String(data.slug));
      }
      if (typeof data.tags === 'string') {
        data.tags = (data.tags as string)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
      if (typeof data.seoKeywords === 'string') {
        data.seoKeywords = (data.seoKeywords as string)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
      }
      if (Array.isArray(data.relatedBlogs)) {
        data.relatedBlogs = data.relatedBlogs
          .map((b: any) => {
            if (!b) return null;
            if (typeof b === 'object') return b.id || b._id || null;
            return String(b);
          })
          .filter((id: any) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
      } else {
        data.relatedBlogs = [];
      }
      if (Array.isArray(data.faqs)) {
        data.faqs = data.faqs.filter((f: any) => f && (f.question || f.answer));
      }
      if (data.publishDate === '' || data.publishDate === null) {
        data.publishDate = new Date();
      }
      if (Array.isArray(data.blocks) && data.blocks.length > 0) {
        const compiledHtml = compileBlogBlocksToHtml(data.blocks);
        if (compiledHtml) {
          data.content = compiledHtml;
        }
        // Auto-populate excerpt from first paragraph if missing
        if (!data.excerpt || typeof data.excerpt !== 'string' || !data.excerpt.trim()) {
          const firstP = (data.blocks as any[]).find((b: any) => b && b.type === 'paragraph' && typeof b.value === 'string' && b.value.trim());
          if (firstP) {
            const cleanText = firstP.value.trim().replace(/\s+/g, ' ');
            data.excerpt = cleanText.slice(0, 200) + (cleanText.length > 200 ? '...' : '');
          }
        }
        // Auto-populate readTime if missing
        if (!data.readTime || typeof data.readTime !== 'string' || !data.readTime.trim()) {
          const totalWords = (data.blocks as any[])
            .map((b: any) => (typeof b?.value === 'string' ? b.value : ''))
            .join(' ')
            .split(/\s+/)
            .filter(Boolean).length;
          const mins = Math.max(1, Math.ceil(totalWords / 200));
          data.readTime = `${mins} min read`;
        }
      }
      return data;
    },
    getTransform: (doc: Record<string, any>) => ({
      ...doc,
      relatedBlogs: Array.isArray(doc.relatedBlogs)
        ? doc.relatedBlogs
            .map((b: any) => (typeof b === 'object' && b !== null ? (b.id || b._id || String(b)) : b))
            .filter(Boolean)
        : [],
      blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
      faqs: Array.isArray(doc.faqs) ? doc.faqs : [],
      tags: Array.isArray(doc.tags)
        ? doc.tags
        : (typeof doc.tags === 'string' ? doc.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
      seoKeywords: Array.isArray(doc.seoKeywords)
        ? doc.seoKeywords
        : (typeof doc.seoKeywords === 'string' ? doc.seoKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
    }),
    afterWrite: async () => {
      await generateAndSaveSitemap();
      fireDeployHook('blogs');
    },
    afterDelete: async () => {
      await generateAndSaveSitemap();
      fireDeployHook('blogs');
    },
  }),
);

