/**
 * Generates the full SEO landing-page content for a (puja × city) pair,
 * mirroring the structure of the reference content document:
 * H1, hero tagline, intro, sections, benefits, rituals, samagri, why-choose-us,
 * occasions, service areas, FAQs, CTA and the complete SEO meta block.
 */
import { pujaLocationSlug } from '../../src/utils/slug.js';
import type { CitySeed, PujaSeed } from './data.js';

export interface GeneratedLocationContent {
  slug: string;
  h1: string;
  heroTagline: string;
  intro: string;
  sections: { heading: string; body: string }[];
  benefits: string[];
  rituals: { name: string; description: string }[];
  samagri: { group: string; items: string[] }[];
  whyChooseUs: { title: string; description: string }[];
  occasions: string[];
  serviceAreas: string[];
  faqs: { question: string; answer: string }[];
  cta: { heading: string; bullets: string[]; body: string; buttonLabel: string };
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  canonicalUrl: string;
  breadcrumb: string[];
  internalLinks: { label: string; href: string }[];
  imageAlt: string;
  published: boolean;
}

const SITE = 'https://www.namanpuja.com';

export function generateLocationContent(
  puja: PujaSeed,
  city: CitySeed,
  country: string,
  otherPujasInCity: string[],
): GeneratedLocationContent {
  const slug = pujaLocationSlug(puja.name, city.name, city.state);
  const place = `${city.name}, ${city.state}`;
  const h1 = `${puja.name} in ${place} – Authentic Vedic Rituals at Home`;

  const heroTagline = `Celebrate Faith, Family and Tradition with ${puja.name} in ${city.name}. ${puja.subtitle}.`;

  const intro =
    `In ${place}, ${puja.name} offers Hindu families a meaningful way to stay connected to their ` +
    `spiritual roots while celebrating life's most important milestones. At Naman Puja, we bring ` +
    `experienced Vedic priests directly to your home in ${city.name}, helping you perform authentic ` +
    `Hindu rituals with convenience and devotion. ${puja.shortDesc}`;

  const sections = [
    {
      heading: `Understanding the Significance of ${puja.name}`,
      body: puja.description,
    },
    {
      heading: `Why Families in ${city.name} Perform ${puja.name}`,
      body:
        `Families across ${city.name} perform ${puja.name} to bless new homes, celebrate milestones such as ` +
        `birthdays and anniversaries, seek success in career and business, express gratitude, and bring ` +
        `the family together in prayer and devotion. ${puja.subtitle}.`,
    },
    {
      heading: `Keeping Hindu Traditions Alive in ${city.state}`,
      body:
        `${city.name} and the wider ${city.state} region are home to a vibrant community that has preserved ` +
        `its customs, festivals and religious traditions across generations. ${puja.name} continues to play ` +
        `an important role in these celebrations — helping families stay connected to Sanatan Dharma, teach ` +
        `younger generations about Hindu traditions, and create meaningful spiritual experiences at home.`,
    },
  ];

  const whyChooseUs = [
    { title: 'Experienced Vedic Priests', description: 'Authentic rituals performed according to Hindu scriptures and regional traditions.' },
    { title: 'Convenient Home & e-Puja Services', description: `Perform the ceremony comfortably at your home in ${city.name}, or join a guided online e-puja.` },
    { title: 'Personalized Support', description: 'Complete guidance on samagri, preparations and ceremony arrangements.' },
    { title: 'Flexible Scheduling', description: 'Book a date and time that suits your family and occasion.' },
  ];

  const faqs = [
    {
      question: `Can ${puja.name} be performed at home in ${city.name}?`,
      answer: `Yes. Naman Puja provides experienced Vedic priests who can perform ${puja.name} at homes, apartments, community halls and other venues throughout ${city.name} and surrounding areas.`,
    },
    {
      question: `How long does ${puja.name} take?`,
      answer: `A complete ${puja.name} generally takes about ${Math.round(puja.durationMin / 30) * 0.5} to ${Math.ceil(puja.durationMin / 60) + 0.5} hours depending on the rituals, family participation and number of attendees.`,
    },
    {
      question: `What are the benefits of performing ${puja.name}?`,
      answer: `Devotees believe ${puja.name} brings ${puja.benefits.slice(0, 4).map((b) => b.toLowerCase()).join(', ')}, and more.`,
    },
    {
      question: 'Do I need to arrange the puja samagri myself?',
      answer: 'Naman Puja provides complete guidance regarding all required puja samagri before the ceremony, and can arrange the samagri for you on request.',
    },
    {
      question: `Which areas do you serve around ${city.name}?`,
      answer: `We provide ${puja.name} services throughout ${city.name}, including ${city.serviceAreas.slice(0, 6).join(', ')} and nearby communities.`,
    },
    {
      question: `Is an online e-puja option available for ${puja.name}?`,
      answer:
        puja.serviceType === 'HOME_VISIT'
          ? `${puja.name} is best performed at home with a priest present; contact us to discuss available options.`
          : `Yes. We offer a guided online e-puja for ${puja.name}, where the rituals are performed on your behalf (sankalp in your name) and streamed live for you to participate from anywhere.`,
    },
  ];

  const cta = {
    heading: 'Honor Tradition. Celebrate Family. Receive Divine Blessings.',
    bullets: [
      'Authentic Vedic Rituals at Home',
      'Experienced Hindu Priests',
      'Personalized Guidance and Support',
      `Perfect for ${puja.occasions.slice(0, 3).join(', ')}`,
      'Preserve Hindu Traditions Across Generations',
    ],
    body: `Book your ${puja.name} in ${city.name} today with Naman Puja and create a meaningful spiritual experience that brings your family together under divine blessings.`,
    buttonLabel: `Book ${puja.name}`,
  };

  const keywords = [
    `${puja.name} in ${city.name}`,
    `${puja.name} ${city.name}`,
    `Book ${puja.name} ${city.name}`,
    `Home ${puja.name} ${city.name}`,
    `Pandit for ${puja.name} ${city.name}`,
    `Hindu Priest ${city.name}`,
    `${puja.name} at home ${city.name}`,
    `Online ${puja.name} booking ${city.name}`,
    `Puja services ${city.name}`,
    `Vedic Priest ${city.name}`,
  ];

  const metaTitle = `${puja.name} in ${city.name} ${city.state} | Book Pandit for Home Puja`;
  const metaDescription =
    `Book ${puja.name} in ${place} with experienced Vedic priests. Authentic Hindu rituals at home, ` +
    `flexible scheduling and complete samagri guidance. Invite prosperity, peace and divine blessings.`;

  const breadcrumb = ['Home', country, city.state, city.name, puja.name];

  const internalLinks = otherPujasInCity
    .filter((p) => p !== puja.name)
    .slice(0, 6)
    .map((p) => ({
      label: `${p} in ${city.name}`,
      href: `/locations/${pujaLocationSlug(p, city.name, city.state)}`,
    }));

  const imageBase = slug;

  return {
    slug,
    h1,
    heroTagline,
    intro,
    sections,
    benefits: puja.benefits,
    rituals: puja.rituals,
    samagri: puja.samagri,
    whyChooseUs,
    occasions: puja.occasions,
    serviceAreas: city.serviceAreas,
    faqs,
    cta,
    metaTitle,
    metaDescription,
    keywords,
    ogImage: `${SITE}/images/${imageBase}.jpg`,
    canonicalUrl: `${SITE}/${slug}/`,
    breadcrumb,
    internalLinks,
    imageAlt: `${puja.name} at home in ${place} performed by an experienced Hindu priest`,
    published: true,
  };
}
