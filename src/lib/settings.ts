/**
 * settings.ts — server-side site settings helpers.
 *
 * Facebook Pixel settings live in the SiteSetting table (key = "facebook_pixel")
 * so the founder can manage them from the admin panel at runtime.
 * Environment variables act as a deployment-time fallback:
 *   FB_PIXEL_ID, FB_ACCESS_TOKEN, FB_TEST_EVENT_CODE
 */
import { db } from '@/lib/db';

export interface FacebookSettings {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode: string;
}

const SETTING_KEY = 'facebook_pixel';

function fromEnv(): FacebookSettings {
  return {
    enabled: !!process.env.FB_PIXEL_ID,
    pixelId: process.env.FB_PIXEL_ID || '',
    accessToken: process.env.FB_ACCESS_TOKEN || '',
    testEventCode: process.env.FB_TEST_EVENT_CODE || '',
  };
}

export async function getFacebookSettings(): Promise<FacebookSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SETTING_KEY } });
    if (row?.value) {
      const v = row.value as Record<string, unknown>;
      return {
        enabled: typeof v.enabled === 'boolean' ? v.enabled : false,
        pixelId: String(v.pixelId || ''),
        accessToken: String(v.accessToken || ''),
        testEventCode: String(v.testEventCode || ''),
      };
    }
  } catch {
    /* fall through to env */
  }
  return fromEnv();
}

export async function saveFacebookSettings(
  partial: Partial<FacebookSettings>
): Promise<FacebookSettings> {
  const current = await getFacebookSettings();
  const next: FacebookSettings = {
    enabled: partial.enabled ?? current.enabled,
    pixelId: (partial.pixelId ?? current.pixelId).trim(),
    accessToken: (partial.accessToken ?? current.accessToken).trim(),
    testEventCode: (partial.testEventCode ?? current.testEventCode).trim(),
  };
  await db.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: next as any },
    update: { value: next as any },
  });
  return next;
}

// ===== Shipping settings =====

export interface ShippingSettings {
  price: number; // flat shipping fee (KWD)
  freeThreshold: number; // orders >= this get free shipping (KWD)
  note: string; // optional note shown at checkout
}

const SHIPPING_KEY = 'shipping';
const DEFAULT_SHIPPING: ShippingSettings = { price: 2, freeThreshold: 50, note: '' };

export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SHIPPING_KEY } });
    if (row?.value) {
      const v = row.value as Record<string, unknown>;
      return {
        price: Number(v.price ?? DEFAULT_SHIPPING.price) || 0,
        freeThreshold: Number(v.freeThreshold ?? DEFAULT_SHIPPING.freeThreshold) || 0,
        note: String(v.note || ''),
      };
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_SHIPPING;
}

export async function saveShippingSettings(
  partial: Partial<ShippingSettings>
): Promise<ShippingSettings> {
  const current = await getShippingSettings();
  const next: ShippingSettings = {
    price: Math.max(0, Number(partial.price ?? current.price) || 0),
    freeThreshold: Math.max(0, Number(partial.freeThreshold ?? current.freeThreshold) || 0),
    note: String(partial.note ?? current.note).slice(0, 200),
  };
  await db.siteSetting.upsert({
    where: { key: SHIPPING_KEY },
    create: { key: SHIPPING_KEY, value: next as any },
    update: { value: next as any },
  });
  return next;
}
