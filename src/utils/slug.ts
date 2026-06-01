import slugify from 'slugify';

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/** Build the canonical puja-in-city slug, e.g. "satyanarayan-puja-in-varanasi-uttar-pradesh". */
export function pujaLocationSlug(pujaName: string, cityName: string, state?: string | null): string {
  const parts = [pujaName, 'in', cityName, state ?? ''].filter(Boolean).join(' ');
  return toSlug(parts);
}
