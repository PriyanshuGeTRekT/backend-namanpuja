import fs from 'fs';
import path from 'path';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { City } from '../models/City.js';
import { Country } from '../models/Country.js';
import { toSlug } from './slug.js';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function buildSitemapXml(): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch Countries & create lookups
  const countries = await Country.find({ enabled: { $ne: false } }).select('_id name slug updatedAt').lean();
  const countryMapById = new Map<string, any>();
  const countryMapByName = new Map<string, any>();
  for (const c of countries) {
    if (c._id) countryMapById.set(c._id.toString(), c);
    if (c.name) countryMapByName.set(c.name.toLowerCase().trim(), c);
    if (c.slug) countryMapByName.set(c.slug.toLowerCase().trim(), c);
  }

  // 2. Fetch Cities & create lookups
  const cities = await City.find({ enabled: { $ne: false } })
    .populate('countryId', 'slug name')
    .select('_id name slug countryId updatedAt')
    .lean();

  const cityMapById = new Map<string, { citySlug: string; countrySlug: string; updatedAt?: any }>();
  const cityMapByName = new Map<string, { citySlug: string; countrySlug: string; updatedAt?: any }>();

  for (const c of cities as any[]) {
    if (!c.slug) continue;
    let countrySlug = 'india';
    if (c.countryId && typeof c.countryId === 'object' && c.countryId.slug) {
      countrySlug = c.countryId.slug;
    } else if (c.countryId) {
      const matchedCountry = countryMapById.get(c.countryId.toString());
      if (matchedCountry?.slug) countrySlug = matchedCountry.slug;
    }

    const info = { citySlug: c.slug, countrySlug, updatedAt: c.updatedAt };
    if (c._id) cityMapById.set(c._id.toString(), info);
    if (c.name) cityMapByName.set(c.name.toLowerCase().trim(), info);
    if (c.slug) cityMapByName.set(c.slug.toLowerCase().trim(), info);
  }

  // 3. Fetch Pujas (only main master pujas dynamically from DB)
  const pujas = await Puja.find({
    enabled: { $ne: false },
    bhaktiType: 'main',
    country: { $in: [null, ''] },
    city: { $in: [null, ''] },
  }).select('slug updatedAt').lean();

  // 4. Fetch Puja Locations
  const locations = await PujaLocation.find({ published: { $ne: false } })
    .populate({ path: 'cityId', populate: { path: 'countryId' } })
    .select('slug cityId cityName countryName updatedAt')
    .lean();

  const addedUrls = new Set<string>();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  function addUrl(loc: string, priority: string, lastmod = today) {
    const cleanUrl = loc.trim();
    if (!addedUrls.has(cleanUrl)) {
      addedUrls.add(cleanUrl);
      xml += `  <url>\n    <loc>${escapeXml(cleanUrl)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>\n`;
    }
  }

  // Static pages
  const staticUrls = [
    { loc: 'https://www.namanpuja.com/', priority: '1.0' },
    { loc: 'https://www.namanpuja.com/book', priority: '0.8' },
    { loc: 'https://www.namanpuja.com/pujas', priority: '0.8' },
    { loc: 'https://www.namanpuja.com/countries', priority: '0.8' },
    { loc: 'https://www.namanpuja.com/login', priority: '0.3' },
    { loc: 'https://www.namanpuja.com/register', priority: '0.3' },
  ];

  for (const u of staticUrls) {
    addUrl(u.loc, u.priority);
  }

  // Countries (/countries/:slug-cities)
  for (const c of countries) {
    if (!c.slug) continue;
    addUrl(`https://www.namanpuja.com/countries/${c.slug}-cities`, '0.85');
  }

  // Pujas (/pujas/:slug)
  for (const p of pujas) {
    if (!p.slug) continue;
    addUrl(`https://www.namanpuja.com/pujas/${p.slug}`, '0.9');
  }

  // Cities (/countries/:countrySlug-cities/:citySlug)
  for (const c of cities as any[]) {
    if (!c.slug) continue;
    let countrySlug = 'india';
    if (c.countryId && typeof c.countryId === 'object' && c.countryId.slug) {
      countrySlug = c.countryId.slug;
    } else if (c.countryId) {
      const matchedCountry = countryMapById.get(c.countryId.toString());
      if (matchedCountry?.slug) countrySlug = matchedCountry.slug;
    }
    addUrl(`https://www.namanpuja.com/countries/${countrySlug}-cities/${c.slug}`, '0.85');
  }

  // Locations (/countries/:countrySlug-cities/:citySlug/:locationSlug)
  for (const l of locations as any[]) {
    if (!l.slug) continue;

    let countrySlug = '';
    let citySlug = '';

    // Strategy 1: Check populated cityId
    if (l.cityId) {
      if (typeof l.cityId === 'object') {
        if (l.cityId.slug) citySlug = l.cityId.slug;
        if (l.cityId.countryId && typeof l.cityId.countryId === 'object' && l.cityId.countryId.slug) {
          countrySlug = l.cityId.countryId.slug;
        } else if (l.cityId.countryId) {
          const matchedCountry = countryMapById.get(l.cityId.countryId.toString());
          if (matchedCountry?.slug) countrySlug = matchedCountry.slug;
        }
      } else {
        const cityInfo = cityMapById.get(l.cityId.toString());
        if (cityInfo) {
          citySlug = cityInfo.citySlug;
          countrySlug = cityInfo.countrySlug;
        }
      }
    }

    // Strategy 2: Fallback to cityName / countryName string lookup
    if (!citySlug && l.cityName) {
      const cityInfo = cityMapByName.get(l.cityName.toLowerCase().trim());
      if (cityInfo) {
        citySlug = cityInfo.citySlug;
        if (!countrySlug) countrySlug = cityInfo.countrySlug;
      } else {
        citySlug = toSlug(l.cityName);
      }
    }

    if (!countrySlug && l.countryName) {
      const matchedCountry = countryMapByName.get(l.countryName.toLowerCase().trim());
      if (matchedCountry?.slug) {
        countrySlug = matchedCountry.slug;
      } else {
        countrySlug = toSlug(l.countryName);
      }
    }

    // Default fallback if still missing
    if (!countrySlug) countrySlug = 'india';
    if (!citySlug) citySlug = 'city';

    addUrl(`https://www.namanpuja.com/countries/${countrySlug}-cities/${citySlug}/${l.slug}`, '0.85');
  }

  xml += `</urlset>\n`;
  return xml;
}

import { triggerAmplifyRebuild } from './amplifyWebhook.js';

export async function generateAndSaveSitemap() {
  try {
    const xml = await buildSitemapXml();

    const candidates = [
      path.resolve(process.cwd(), '../frontend-namanpuja/public/sitemap.xml'),
      path.resolve(process.cwd(), '../frontend-namanpuja/dist/sitemap.xml'),
      path.resolve(process.cwd(), 'frontend-namanpuja/public/sitemap.xml'),
      path.resolve(process.cwd(), 'frontend-namanpuja/dist/sitemap.xml'),
      path.resolve(process.cwd(), 'public/sitemap.xml'),
      path.resolve(process.cwd(), 'dist/sitemap.xml'),
    ];

    for (const sitemapPath of candidates) {
      try {
        const dir = path.dirname(sitemapPath);
        if (fs.existsSync(dir)) {
          fs.writeFileSync(sitemapPath, xml, 'utf8');
        }
      } catch (e) {
        // ignore write errors to non-existent paths
      }
    }

    await triggerAmplifyRebuild();
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }
}

