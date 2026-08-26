/**
 * kw-phone.ts — Kuwait phone helpers (client + server safe).
 * Kept free of any imports so it can be used in client components
 * WITHOUT pulling Prisma/bcrypt into the browser bundle.
 */

/** Normalize a Kuwait phone to bare 8 digits (handles +965/00965/965 prefixes). */
export function normalizeKwPhone(input: string): string {
  let p = (input || '').replace(/\s|-|\(|\)/g, '');
  if (p.startsWith('+965')) p = p.slice(4);
  else if (p.startsWith('00965')) p = p.slice(5);
  else if (p.startsWith('965') && p.length > 8) p = p.slice(3);
  return p;
}

/** Kuwait mobile numbers: 8 digits starting with 5, 6 or 9. */
export function isValidKwPhone(p: string): boolean {
  return /^[569]\d{7}$/.test(p);
}

/** Pretty display: 66046358 -> 6604 6358 */
export function formatKwPhone(p: string): string {
  const n = normalizeKwPhone(p);
  return n.length === 8 ? `${n.slice(0, 4)} ${n.slice(4)}` : p;
}
