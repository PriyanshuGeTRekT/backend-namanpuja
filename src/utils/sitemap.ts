import fs from 'fs';
import path from 'path';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { City } from '../models/City.js';
import { Country } from '../models/Country.js';
import { toSlug, pujaLocationSlug } from './slug.js';

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

  function formatLastmod(date?: any): string {
    if (!date) return today;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return today;
      // Guard against future timestamps
      const safeTime = Math.min(d.getTime(), Date.now());
      return new Date(safeTime).toISOString().split('T')[0];
    } catch {
      return today;
    }
  }

  const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
    .select('_id name slug state countryId updatedAt')
    .lean();

  const cityMapById = new Map<string, { citySlug: string; countrySlug: string; cityName: string; state?: string; updatedAt?: any }>();
  const cityMapByName = new Map<string, { citySlug: string; countrySlug: string; cityName: string; state?: string; updatedAt?: any }>();

  for (const c of cities as any[]) {
    if (!c.slug) continue;
    let countrySlug = 'india';
    if (c.countryId && typeof c.countryId === 'object' && c.countryId.slug) {
      countrySlug = c.countryId.slug;
    } else if (c.countryId) {
      const matchedCountry = countryMapById.get(c.countryId.toString());
      if (matchedCountry?.slug) countrySlug = matchedCountry.slug;
    }

    const info = { citySlug: c.slug, countrySlug, cityName: c.name, state: c.state, updatedAt: c.updatedAt };
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
  }).select('_id name slug updatedAt').lean();

  // 4. Fetch Puja Locations (real documents)
  const locations = await PujaLocation.find({ published: { $ne: false } })
    .populate({ path: 'cityId', populate: { path: 'countryId' } })
    .populate('pujaId', '_id name slug')
    .select('slug cityId cityName countryName pujaId h1 updatedAt')
    .lean();

  // Helper to extract puja ID from location doc (matching frontend getPujaId logic)
  const getPujaId = (loc: any): string | undefined => {
    if (loc.puja?.id) return String(loc.puja.id);
    if (loc.puja?._id) return String(loc.puja._id);
    const pId = loc.pujaId;
    if (typeof pId === 'string' && pId) return pId;
    if (typeof pId === 'object' && pId !== null) {
      return pId.id ? String(pId.id) : pId._id ? String(pId._id) : pId.toString();
    }
    return undefined;
  };

  // Build a covered set of city+puja combinations that already have a real PujaLocation document
  const coveredSet = new Set<string>();

  for (const l of locations as any[]) {
    // Resolve city identifiers
    const cityKeys: string[] = [];
    if (l.cityId) {
      if (typeof l.cityId === 'object' && l.cityId._id) {
        cityKeys.push(l.cityId._id.toString());
        if (l.cityId.slug) cityKeys.push(l.cityId.slug.toLowerCase().trim());
        if (l.cityId.name) cityKeys.push(normalizeName(l.cityId.name));
      } else {
        cityKeys.push(l.cityId.toString());
        const cityInfo = cityMapById.get(l.cityId.toString());
        if (cityInfo) {
          cityKeys.push(cityInfo.citySlug.toLowerCase().trim());
          cityKeys.push(normalizeName(cityInfo.cityName));
        }
      }
    }
    if (l.cityName) {
      cityKeys.push(normalizeName(l.cityName));
      const cityInfo = cityMapByName.get(l.cityName.toLowerCase().trim());
      if (cityInfo) {
        cityKeys.push(cityInfo.citySlug.toLowerCase().trim());
      }
    }

    // Resolve puja identifiers
    const pId = getPujaId(l);
    const targetId = (l.puja as any)?.targetPujaId || (l as any)?.targetPujaId;
    const pSlug = (l.pujaId && typeof l.pujaId === 'object' && l.pujaId.slug)
      ? l.pujaId.slug
      : ((l as any).puja?.slug || undefined);
    const pName = (l.pujaId && typeof l.pujaId === 'object' && l.pujaId.name)
      ? l.pujaId.name
      : ((l as any).puja?.name || l.h1 || undefined);
    const pNameNorm = normalizeName(pName);

    for (const cKey of cityKeys) {
      if (!cKey) continue;
      if (pId) coveredSet.add(`id:${cKey}:${pId}`);
      if (targetId) coveredSet.add(`id:${cKey}:${String(targetId)}`);
      if (pSlug) coveredSet.add(`slug:${cKey}:${pSlug.toLowerCase().trim()}`);
      if (pNameNorm) coveredSet.add(`name:${cKey}:${pNameNorm}`);
    }
  }

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
    addUrl(`https://www.namanpuja.com/countries/${c.slug.toLowerCase()}-cities`, '0.85', formatLastmod(c.updatedAt));
  }

  // Pujas (/pujas/:slug)
  for (const p of pujas) {
    if (!p.slug) continue;
    addUrl(`https://www.namanpuja.com/pujas/${p.slug}`, '0.9', formatLastmod(p.updatedAt));
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
    addUrl(
      `https://www.namanpuja.com/countries/${countrySlug.toLowerCase()}-cities/${c.slug.toLowerCase()}`,
      '0.85',
      formatLastmod(c.updatedAt)
    );
  }

  // Real Database Locations (/countries/:countrySlug-cities/:citySlug/:locationSlug)
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

    addUrl(
      `https://www.namanpuja.com/countries/${countrySlug.toLowerCase()}-cities/${citySlug.toLowerCase()}/${l.slug}`,
      '0.85',
      formatLastmod(l.updatedAt)
    );
  }

  // Synthesized Mock Locations for every (City x Main Puja) combination not in real locations
  for (const city of cities as any[]) {
    if (!city.slug || !city.name) continue;

    let countrySlug = 'india';
    if (city.countryId && typeof city.countryId === 'object' && city.countryId.slug) {
      countrySlug = city.countryId.slug;
    } else if (city.countryId) {
      const matchedCountry = countryMapById.get(city.countryId.toString());
      if (matchedCountry?.slug) countrySlug = matchedCountry.slug;
    }

    const cityIdStr = city._id ? city._id.toString() : '';
    const citySlugStr = city.slug.toLowerCase().trim();
    const cityNameNorm = normalizeName(city.name);

    for (const puja of pujas as any[]) {
      if (!puja.name) continue;

      const pId = puja._id ? puja._id.toString() : '';
      const pSlug = puja.slug ? puja.slug.toLowerCase().trim() : '';
      const pNameNorm = normalizeName(puja.name);

      const isCovered =
        (pId && (coveredSet.has(`id:${cityIdStr}:${pId}`) || coveredSet.has(`id:${citySlugStr}:${pId}`) || coveredSet.has(`id:${cityNameNorm}:${pId}`))) ||
        (pSlug && (coveredSet.has(`slug:${cityIdStr}:${pSlug}`) || coveredSet.has(`slug:${citySlugStr}:${pSlug}`) || coveredSet.has(`slug:${cityNameNorm}:${pSlug}`))) ||
        (pNameNorm && (coveredSet.has(`name:${cityIdStr}:${pNameNorm}`) || coveredSet.has(`name:${citySlugStr}:${pNameNorm}`) || coveredSet.has(`name:${cityNameNorm}:${pNameNorm}`)));

      if (isCovered) {
        continue;
      }

      const mockSlug = pujaLocationSlug(puja.name, city.name, city.state);
      const lastmodDate = formatLastmod(puja.updatedAt || city.updatedAt || today);

      addUrl(
        `https://www.namanpuja.com/countries/${countrySlug.toLowerCase()}-cities/${citySlugStr}/${mockSlug}`,
        '0.85',
        lastmodDate
      );
    }
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


