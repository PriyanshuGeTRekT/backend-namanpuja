/**
 * Seed script for namanpuja.com.
 *
 * Creates: admin user, countries, puja categories, master pujas, North-India
 * cities + their temples, and a published SEO landing page for every
 * (puja × city) combination — all generated from prisma/content/data.ts.
 *
 * Run with:  npm run db:seed
 */
import { PrismaClient, PujaServiceType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { toSlug } from '../src/utils/slug.js';
import { COUNTRIES, PUJA_CATEGORIES, PUJAS, CITIES } from './content/data.js';
import { generateLocationContent } from './content/generateContent.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding namanpuja.com ...');

  // ── Admin user ──
  const passwordHash = await bcrypt.hash(env.seedAdmin.password, 10);
  await prisma.adminUser.upsert({
    where: { email: env.seedAdmin.email.toLowerCase() },
    update: {},
    create: {
      email: env.seedAdmin.email.toLowerCase(),
      name: 'Naman Puja Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`   ✔ admin user: ${env.seedAdmin.email}`);

  // ── Countries ──
  const countryByName = new Map<string, string>();
  for (const c of COUNTRIES) {
    const country = await prisma.country.upsert({
      where: { slug: c.slug },
      update: { name: c.name, isoCode: c.isoCode, flagEmoji: c.flagEmoji, sortOrder: c.sortOrder, enabled: c.enabled },
      create: c,
    });
    countryByName.set(c.name, country.id);
  }
  console.log(`   ✔ ${COUNTRIES.length} countries`);

  // ── Puja categories ──
  const categoryByName = new Map<string, string>();
  for (const cat of PUJA_CATEGORIES) {
    const category = await prisma.pujaCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder, description: cat.description },
      create: cat,
    });
    categoryByName.set(cat.name, category.id);
  }
  console.log(`   ✔ ${PUJA_CATEGORIES.length} puja categories`);

  // ── Master pujas ──
  const pujaIdByName = new Map<string, string>();
  let pujaOrder = 0;
  for (const p of PUJAS) {
    const slug = toSlug(p.name);
    const puja = await prisma.puja.upsert({
      where: { slug },
      update: {
        subtitle: p.subtitle,
        deity: p.deity,
        serviceType: p.serviceType as PujaServiceType,
        durationMin: p.durationMin,
        basePrice: p.basePrice,
        shortDesc: p.shortDesc,
        description: p.description,
        isFeatured: p.isFeatured ?? false,
        sortOrder: pujaOrder,
        categoryId: categoryByName.get(p.category),
        benefits: p.benefits,
        rituals: p.rituals,
        samagri: p.samagri,
        occasions: p.occasions,
      },
      create: {
        name: p.name,
        slug,
        subtitle: p.subtitle,
        deity: p.deity,
        serviceType: p.serviceType as PujaServiceType,
        durationMin: p.durationMin,
        basePrice: p.basePrice,
        currency: 'INR',
        shortDesc: p.shortDesc,
        description: p.description,
        isFeatured: p.isFeatured ?? false,
        sortOrder: pujaOrder,
        categoryId: categoryByName.get(p.category),
        benefits: p.benefits,
        rituals: p.rituals,
        samagri: p.samagri,
        occasions: p.occasions,
      },
    });
    pujaIdByName.set(p.name, puja.id);
    pujaOrder += 1;
  }
  console.log(`   ✔ ${PUJAS.length} master pujas`);

  // ── Cities + temples + SEO landing pages ──
  const indiaId = countryByName.get('India')!;
  let cityOrder = 0;
  let locationCount = 0;
  let templeCount = 0;
  const allPujaNames = PUJAS.map((p) => p.name);

  for (const city of CITIES) {
    const citySlug = toSlug(city.name);
    const cityRecord = await prisma.city.upsert({
      where: { countryId_slug: { countryId: indiaId, slug: citySlug } },
      update: {
        name: city.name,
        state: city.state,
        geoRegion: city.geoRegion,
        latitude: city.latitude,
        longitude: city.longitude,
        isPopular: city.isPopular ?? false,
        sortOrder: cityOrder,
      },
      create: {
        name: city.name,
        slug: citySlug,
        state: city.state,
        geoRegion: city.geoRegion,
        latitude: city.latitude,
        longitude: city.longitude,
        isPopular: city.isPopular ?? false,
        sortOrder: cityOrder,
        countryId: indiaId,
      },
    });
    cityOrder += 1;

    // Temples
    let templeOrder = 0;
    for (const t of city.temples) {
      const templeSlug = toSlug(`${t.name} ${city.name}`);
      await prisma.temple.upsert({
        where: { slug: templeSlug },
        update: {
          name: t.name,
          deity: t.deity,
          shortDesc: t.shortDesc,
          description: t.description,
          significance: t.significance,
          timings: t.timings,
          isFeatured: t.isFeatured ?? false,
          sortOrder: templeOrder,
          cityId: cityRecord.id,
          metaTitle: `${t.name}, ${city.name} | Timings, History & Significance`,
          metaDescription: `${t.shortDesc} Plan your visit to ${t.name} in ${city.name}, ${city.state}.`,
          keywords: [t.name, `${t.name} ${city.name}`, `${t.deity} temple ${city.name}`, `temples in ${city.name}`],
        },
        create: {
          name: t.name,
          slug: templeSlug,
          deity: t.deity,
          shortDesc: t.shortDesc,
          description: t.description,
          significance: t.significance,
          timings: t.timings,
          isFeatured: t.isFeatured ?? false,
          sortOrder: templeOrder,
          cityId: cityRecord.id,
          metaTitle: `${t.name}, ${city.name} | Timings, History & Significance`,
          metaDescription: `${t.shortDesc} Plan your visit to ${t.name} in ${city.name}, ${city.state}.`,
          keywords: [t.name, `${t.name} ${city.name}`, `${t.deity} temple ${city.name}`, `temples in ${city.name}`],
        },
      });
      templeOrder += 1;
      templeCount += 1;
    }

    // SEO landing pages: every puja × this city
    for (const p of PUJAS) {
      const content = generateLocationContent(p, city, 'India', allPujaNames);
      const pujaId = pujaIdByName.get(p.name)!;
      await prisma.pujaLocation.upsert({
        where: { pujaId_cityId: { pujaId, cityId: cityRecord.id } },
        update: {
          slug: content.slug,
          h1: content.h1,
          heroTagline: content.heroTagline,
          intro: content.intro,
          sections: content.sections,
          benefits: content.benefits,
          rituals: content.rituals,
          samagri: content.samagri,
          whyChooseUs: content.whyChooseUs,
          occasions: content.occasions,
          serviceAreas: content.serviceAreas,
          faqs: content.faqs,
          cta: content.cta,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          keywords: content.keywords,
          ogImage: content.ogImage,
          canonicalUrl: content.canonicalUrl,
          breadcrumb: content.breadcrumb,
          internalLinks: content.internalLinks,
          imageAlt: content.imageAlt,
          published: content.published,
        },
        create: {
          pujaId,
          cityId: cityRecord.id,
          slug: content.slug,
          h1: content.h1,
          heroTagline: content.heroTagline,
          intro: content.intro,
          sections: content.sections,
          benefits: content.benefits,
          rituals: content.rituals,
          samagri: content.samagri,
          whyChooseUs: content.whyChooseUs,
          occasions: content.occasions,
          serviceAreas: content.serviceAreas,
          faqs: content.faqs,
          cta: content.cta,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          keywords: content.keywords,
          ogImage: content.ogImage,
          canonicalUrl: content.canonicalUrl,
          breadcrumb: content.breadcrumb,
          internalLinks: content.internalLinks,
          imageAlt: content.imageAlt,
          published: content.published,
        },
      });
      locationCount += 1;
    }
  }

  console.log(`   ✔ ${CITIES.length} cities`);
  console.log(`   ✔ ${templeCount} temples`);
  console.log(`   ✔ ${locationCount} SEO landing pages (puja × city)`);
  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
