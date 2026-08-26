import { db } from '@/lib/db';

/**
 * Auto-ship job — every day at 10:00 Kuwait time (UTC+3, no DST) every active
 * order is automatically marked as shipped and gets the arrival promise:
 * "سيصل في الميعاد المنسق مع خدمة العملاء والمندوب"
 *
 * Execution model: lazy cron. Any order-related API call first invokes
 * runAutoShipIfDue() — the setting "autoship".lastRun guarantees it runs at
 * most once per day. An external scheduler can also hit GET /api/cron/autoship.
 */

const ARRIVAL_NOTE = 'سيصل في الميعاد المنسق مع خدمة العملاء والمندوب';
const KEY = 'autoship';
const SHIPPABLE = ['pending', 'confirmed', 'processing'];

/** Kuwait is UTC+3 all year */
const KW_OFFSET_MS = 3 * 60 * 60 * 1000;

/** timestamp (real UTC ms) of today's 10:00 Kuwait time */
function todayTenAmKuwait(): number {
  const kwNow = new Date(Date.now() + KW_OFFSET_MS); // read via UTC getters
  const y = kwNow.getUTCFullYear();
  const m = kwNow.getUTCMonth();
  const d = kwNow.getUTCDate();
  return Date.UTC(y, m, d, 10, 0, 0) - KW_OFFSET_MS;
}

export async function runAutoShipIfDue(force = false): Promise<{
  ran: boolean;
  shippedCount: number;
}> {
  const dueAt = todayTenAmKuwait();
  const nowMs = Date.now();

  let lastRunMs = 0;
  try {
    const row = await db.siteSetting.findUnique({ where: { key: KEY } });
    lastRunMs = row?.value ? new Date((row.value as any).lastRun).getTime() || 0 : 0;
  } catch {
    /* treat as never run */
  }

  const isDue = force || (nowMs >= dueAt && lastRunMs < dueAt);
  if (!isDue) return { ran: false, shippedCount: 0 };

  const result = await db.order.updateMany({
    where: { status: { in: SHIPPABLE } },
    data: {
      status: 'shipped',
      shippedAt: new Date(),
      arrivalNote: ARRIVAL_NOTE,
    },
  });

  await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: { lastRun: new Date().toISOString() } as any },
    create: { key: KEY, value: { lastRun: new Date().toISOString() } as any },
  });

  return { ran: true, shippedCount: result.count };
}

export const AUTO_SHIP_ARRIVAL_NOTE = ARRIVAL_NOTE;
