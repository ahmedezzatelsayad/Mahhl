/**
 * commission.ts — the commission & accounting engine (نظام العمولات والمحاسبة).
 *
 * PURE + SERVER helpers shared by the affiliate portal, the admin dashboard
 * and the API layer. Money principle:
 *
 *   CommissionEntry (ledger) is the SINGLE source of truth for real money
 *   movements: earned (+) when an affiliate order is delivered, reversal (−)
 *   when it is returned/cancelled after earning, payout (−) when cash is
 *   sent, and adjustment (±) for manual corrections.
 *
 *   Order-level buckets (expected / due / in-payout) are computed live from
 *   the orders + withdrawal requests so they can never drift from reality.
 */

import { db } from '@/lib/db';

export const AFFILIATE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'deferred',
  'processing',
  'shipped',
  'delivered',
  'returned',
  'cancelled',
  'commission_received',
] as const;

/** Arabic labels — richer than ecomerg's (adds مؤجل + تم استلام العمولة). */
export const STATUS_LABELS_AR: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'تم التأكيد',
  deferred: 'مؤجل',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  returned: 'مرتجع',
  cancelled: 'ملغي قبل الشحن',
  commission_received: 'تم استلام العمولة',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  deferred: 'bg-orange-100 text-orange-800',
  processing: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-red-100 text-red-800',
  commission_received: 'bg-emerald-100 text-emerald-800',
};

/** Statuses still in the pipeline → commission is "expected" (متوقعة). */
export const PIPELINE_STATUSES = ['pending', 'confirmed', 'deferred', 'processing', 'shipped'];

export const ENTRY_LABELS: Record<string, string> = {
  earned: 'عمولة طلب مسلّم',
  reversal: 'عكس عمولة (مرتجع/ملغي)',
  payout: 'دفعة مسحوبة',
  adjustment: 'تسوية يدوية',
};

export const WITHDRAWAL_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  paid: 'مدفوعة',
  rejected: 'مرفوضة',
};

export const PAYOUT_METHODS = [
  { value: 'knet', label: 'تحويل KNET' },
  { value: 'bank', label: 'تحويل بنكي' },
  { value: 'vodafone', label: 'فودافون كاش' },
  { value: 'paypal', label: 'PayPal' },
] as const;

export const PAYOUT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYOUT_METHODS.map((m) => [m.value, m.label])
);

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface AffiliateBuckets {
  /** orders still being delivered — not yet real money */
  expected: number;
  /** delivered & withdrawable now (ledger balance minus locked) */
  available: number;
  /** locked inside pending withdrawal requests (قيد الدفع) */
  inPayout: number;
  /** total paid out historically */
  paid: number;
  /** order counts by status */
  counts: Record<string, number>;
  totalOrders: number;
  /** delivered+commission_received / (total - pending) as % */
  deliveryRate: number;
}

/**
 * Compute all money buckets for one affiliate.
 * - ledger balance = Σ(entry.amount) → real money owed
 * - locked = Σ(amount) of pending withdrawal requests
 * - available = balance − locked (never below 0)
 */
export async function affiliateBuckets(affiliateId: string): Promise<AffiliateBuckets> {
  const [orders, entries, pendingAgg, paidAgg] = await Promise.all([
    db.order.findMany({
      where: { affiliateId },
      select: { status: true, commissionTotal: true },
    }),
    db.commissionEntry.aggregate({
      where: { affiliateId },
      _sum: { amount: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { affiliateId, status: 'pending' },
      _sum: { amount: true },
    }),
    db.commissionEntry.aggregate({
      where: { affiliateId, type: 'payout' },
      _sum: { amount: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  const expected = round3(
    orders
      .filter((o) => PIPELINE_STATUSES.includes(o.status))
      .reduce((s, o) => s + (o.commissionTotal || 0), 0)
  );

  const balance = round3(entries._sum.amount || 0);
  const inPayout = round3(pendingAgg._sum.amount || 0);
  const available = Math.max(0, round3(balance - inPayout));
  const paid = round3(-(paidAgg._sum.amount || 0));

  const settled = (counts['delivered'] || 0) + (counts['commission_received'] || 0);
  const decided = orders.length - (counts['pending'] || 0);
  const deliveryRate = decided > 0 ? Math.round((settled / decided) * 100) : 0;

  return {
    expected,
    available,
    inPayout,
    paid,
    counts,
    totalOrders: orders.length,
    deliveryRate,
  };
}

/** Global buckets across all affiliates (admin dashboard). */
export async function globalCommissionBuckets() {
  const [pipelineAgg, ledgerAgg, pendingAgg, paidAgg, affiliates, pendingW, activeAffiliates] =
    await Promise.all([
      db.order.aggregate({
        where: { affiliateId: { not: null }, status: { in: PIPELINE_STATUSES } },
        _sum: { commissionTotal: true },
      }),
      db.commissionEntry.aggregate({ _sum: { amount: true } }),
      db.withdrawalRequest.aggregate({
        where: { status: 'pending' },
        _sum: { amount: true },
      }),
      db.commissionEntry.aggregate({
        where: { type: 'payout' },
        _sum: { amount: true },
      }),
      db.affiliate.count(),
      db.withdrawalRequest.count({ where: { status: 'pending' } }),
      db.affiliate.count({ where: { status: 'active' } }),
    ]);

  const balance = round3(ledgerAgg._sum.amount || 0);
  const inPayout = round3(pendingAgg._sum.amount || 0);

  return {
    expected: round3(pipelineAgg._sum.commissionTotal || 0),
    balance,
    available: Math.max(0, round3(balance - inPayout)),
    inPayout,
    paid: round3(-(paidAgg._sum.amount || 0)),
    affiliates,
    activeAffiliates,
    pendingWithdrawals: pendingW,
  };
}

/**
 * Idempotently create the "earned" commission entry when an affiliate order
 * becomes delivered. Safe to call multiple times.
 */
export async function ensureEarnedEntry(orderId: string, adminId?: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, affiliateId: true, commissionTotal: true, status: true },
  });
  if (!order || !order.affiliateId || !order.commissionTotal || order.commissionTotal <= 0) {
    return;
  }
  const existing = await db.commissionEntry.findFirst({
    where: { orderId: order.id, type: 'earned' },
  });
  if (existing) return;
  await db.commissionEntry.create({
    data: {
      affiliateId: order.affiliateId,
      orderId: order.id,
      type: 'earned',
      amount: round3(order.commissionTotal),
      note: `عمولة الطلب #${orderId.slice(-6).toUpperCase()}`,
      createdById: adminId || null,
    },
  });
}

/**
 * Create a reversal entry when an earned order is returned/cancelled.
 * Only reverses if an earned entry exists and no reversal yet.
 */
export async function ensureReversalEntry(orderId: string, reason: string, adminId?: string): Promise<void> {
  const earned = await db.commissionEntry.findFirst({
    where: { orderId, type: 'earned' },
  });
  if (!earned) return; // never earned → nothing to reverse
  const reversed = await db.commissionEntry.findFirst({
    where: { orderId, type: 'reversal' },
  });
  if (reversed) return;
  await db.commissionEntry.create({
    data: {
      affiliateId: earned.affiliateId,
      orderId,
      type: 'reversal',
      amount: round3(-Math.abs(earned.amount)),
      note: reason,
      createdById: adminId || null,
    },
  });
}
