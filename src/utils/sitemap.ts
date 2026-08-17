import fs from 'fs';
import path from 'path';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { City } from '../models/City.js';

export async function buildSitemapXml(): Promise<string> {
  const pujas = await Puja.find({}).lean();
  const locations = await PujaLocation.find({}).lean();
  const cities = await City.find({}).lean();

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static pages
  const staticUrls = [
    { loc: 'https://www.namanpuja.com/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://www.namanpuja.com/book/', priority: '0.8', changefreq: 'monthly' },
    { loc: 'https://www.namanpuja.com/pujas/mainpuja/', priority: '0.8', changefreq: 'monthly' },
    { loc: 'https://www.namanpuja.com/mainlocation/', priority: '0.8', changefreq: 'monthly' },
    { loc: 'https://www.namanpuja.com/login/', priority: '0.3', changefreq: 'yearly' },
    { loc: 'https://www.namanpuja.com/register/', priority: '0.3', changefreq: 'yearly' },
  ];

  for (const u of staticUrls) {
    xml += `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
  }

  // Pujas (/pujas/:slug/)
  for (const p of pujas) {
    if (!p.slug) continue;
    const slug = p.slug.endsWith('/') ? p.slug : `${p.slug}/`;
    xml += `  <url>\n    <loc>https://www.namanpuja.com/pujas/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  }

  // Cities (/city/:slug/)
  for (const c of cities) {
    if (!c.slug) continue;
    const slug = c.slug.endsWith('/') ? c.slug : `${c.slug}/`;
    xml += `  <url>\n    <loc>https://www.namanpuja.com/city/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  }

  // Locations (/locations/:slug/)
  for (const l of locations) {
    if (!l.slug) continue;
    const slug = l.slug.endsWith('/') ? l.slug : `${l.slug}/`;
    xml += `  <url>\n    <loc>https://www.namanpuja.com/locations/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

export async function generateAndSaveSitemap() {
  try {
    const xml = await buildSitemapXml();

    // Write to frontend-namanpuja public and dist sitemap.xml
    const publicSitemapPath = path.resolve(process.cwd(), '../frontend-namanpuja/public/sitemap.xml');
    const distSitemapPath = path.resolve(process.cwd(), '../frontend-namanpuja/dist/sitemap.xml');

    if (fs.existsSync(path.dirname(publicSitemapPath))) {
      fs.writeFileSync(publicSitemapPath, xml, 'utf8');
    }
    if (fs.existsSync(path.dirname(distSitemapPath))) {
      fs.writeFileSync(distSitemapPath, xml, 'utf8');
    }
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }
}
