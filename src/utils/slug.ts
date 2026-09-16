export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word/space/hyphen characters
    .replace(/[\s_]+/g, '-')  // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Strip a trailing " in {cityName}" suffix from a puja name (case-insensitive).
 * Prevents doubled-city slugs when the DB puja name already embeds the city
 * (e.g. "Ganesh Puja in Sharjah" → stripped to "Ganesh Puja" before combining).
 */
export function stripCitySuffix(pujaName: string, cityName: string): string {
  const suffix = new RegExp(`\\s+in\\s+${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  return pujaName.replace(suffix, '').trim();
}

/** Build the canonical puja-in-city slug, e.g. "satyanarayan-puja-in-varanasi-uttar-pradesh". */
export function pujaLocationSlug(pujaName: string, cityName: string, state?: string | null): string {
  const cleanPujaName = stripCitySuffix(pujaName, cityName);
  const parts = [cleanPujaName, 'in', cityName, state ?? ''].filter(Boolean).join(' ');
  return toSlug(parts);
}

