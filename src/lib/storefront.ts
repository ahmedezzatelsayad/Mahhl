/**
 * storefront.ts — متاجر المسوقين (الميزة القاتلة).
 * Shared helpers: slug validation, reserved names, pricing resolution,
 * and the public store URL builder (path always works; subdomain/custom
 * domain work once wired in Vercel).
 */
import { db } from '@/lib/db';

/** Reserved slugs that can never be a storefront subdomain. */
export const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'store', 'stores', 'mail', 'blog', 'shop',
  'support', 'help', 'cdn', 'static', 'assets', 'dashboard', 'affiliate',
  'marketer', 'auth', 'login', 'register', 'settings', 'account', 'orders',
  'vercel', 'mahhl', 'mahal', 'kw', 'kuwait',
]);

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$/;

/** Validate + normalize a storefront slug. Returns null when invalid. */
export function normalizeSlug(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.length < 3 || s.length > 30) return null;
  if (RESERVED_SLUGS.has(s)) return null;
  if (!SLUG_RE.test(s)) return null;
  return s;
}

/** Clean a short text field (name / tagline / whatsapp). */
export function cleanField(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

/** Validate an http(s) logo URL (or data image). Returns null when invalid. */
export function normalizeLogoUrl(v: unknown): string | null {
  const s = cleanField(v, 400_000);
  if (!s) return null;
  if (/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(s)) return s;
  if (/^https:\/\/[^\s]+\.[^\s]+$/.test(s)) return s;
  return null;
}

/** Validate a custom domain (example.com / store.example.com). */
export function normalizeCustomDomain(v: unknown): string | null {
  const s = cleanField(v, 120).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!s) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(s)) return null;
  if (s.endsWith('.vercel.app')) return null; // vercel subdomains are platform-managed
  return s;
}

/** Platform effective price (mirrors create-order.effectivePrice). */
export function platformPrice(p: { price: number; salePrice: number }): number {
  return p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

/** Round to 3 decimals (KWD fils). */
export function kwd(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Storefront selling price for a product: explicit override, or
 * platform price + the store's default markup (floor .500 endings for a
 * clean look without lying about the marketer's margin).
 */
export function storefrontPrice(
  product: { price: number; salePrice: number },
  markup: number,
  override?: number | null
): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return kwd(Math.max(override, platformPrice(product)));
  }
  return kwd(platformPrice(product) + Math.max(0, markup));
}

/** The marketer's profit per unit for a storefront product. */
export function storefrontProfit(
  product: { price: number; salePrice: number },
  markup: number,
  override?: number | null
): number {
  const sell = storefrontPrice(product, markup, override);
  return kwd(Math.max(0, sell - platformPrice(product)));
}

/** Public URL of a storefront (path form — always works). */
export function storefrontUrl(slug: string, siteUrl?: string): string {
  const base = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mahhl-qzjn.vercel.app').replace(/\/+$/, '');
  return `${base}/store/${slug}`;
}

/** Load an active storefront with its active products (public view). */
export async function loadPublicStorefront(key: { slug?: string; customDomain?: string }) {
  const where = key.customDomain
    ? { customDomain: key.customDomain, isActive: true }
    : { slug: key.slug || '', isActive: true };
  return db.storefront.findFirst({
    where,
    include: {
      owner: { select: { name: true, code: true } },
      products: {
        where: { isActive: true },
        orderBy: { addedAt: 'desc' },
        take: 200,
        include: {
          product: {
            select: {
              id: true, slug: true, name: true, thumb: true, images: true,
              price: true, salePrice: true, quantity: true, trackStock: true,
              disableOOS: true, isBestSeller: true, description: true,
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });
}

export type PublicStorefront = NonNullable<Awaited<ReturnType<typeof loadPublicStorefront>>>;
