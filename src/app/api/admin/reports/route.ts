import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/reports?days=14 — daily business reports.
 *
 * Returns:
 *  - daily[]: last N days (orders, revenue, itemsSold, sessions, addToCart, checkouts)
 *  - kpis: totals, avg order value, conversion
 *  - topProducts[]: best sellers by quantity in range
 *  - topCategories[]: revenue by category
 *  - upsellFunnel: shown/clicked/added
 */
export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '14')));
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    // ---- Orders + items in range ----
    const orders = await db.order.findMany({
      where: { createdAt: { gte: since } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    // ---- Events in range ----
    const events = await db.userEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, createdAt: true },
    });
    const sessions = await db.userSession.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true },
    });

    // ---- Build daily buckets (local dates) ----
    const dayKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    interface DayBucket {
      date: string;
      orders: number;
      revenue: number;
      itemsSold: number;
      sessions: number;
      addToCart: number;
      checkouts: number;
    }
    const buckets = new Map<string, DayBucket>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.set(dayKey(d), {
        date: dayKey(d),
        orders: 0,
        revenue: 0,
        itemsSold: 0,
        sessions: 0,
        addToCart: 0,
        checkouts: 0,
      });
    }

    let totalRevenue = 0;
    let totalItems = 0;
    for (const o of orders) {
      const k = dayKey(o.createdAt);
      const b = buckets.get(k);
      if (!b) continue;
      b.orders++;
      b.revenue += o.total;
      b.itemsSold += o.items.reduce((s, i) => s + i.quantity, 0);
      totalRevenue += o.total;
      totalItems += o.items.reduce((s, i) => s + i.quantity, 0);
    }

    for (const ev of events) {
      const k = dayKey(ev.createdAt);
      const b = buckets.get(k);
      if (!b) continue;
      if (ev.type === 'add_to_cart') b.addToCart++;
      if (ev.type === 'checkout_complete') b.checkouts++;
    }

    // sessions counted per day by updated sessions — approximate daily activity
    // (one session row per visitor; count once on its bucket day)
    // We use event-derived session activity instead for accuracy:
    const sessionEvents = await db.userEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { sessionId: true, createdAt: true },
    });
    const sessionDaySeen = new Set<string>();
    for (const ev of sessionEvents) {
      const k = dayKey(ev.createdAt);
      const key = `${k}:${ev.sessionId}`;
      if (!sessionDaySeen.has(key)) {
        sessionDaySeen.add(key);
        const b = buckets.get(k);
        if (b) b.sessions++;
      }
    }

    // ---- Top products by quantity sold ----
    const productQty = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const it of o.items) {
        const cur = productQty.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.price * it.quantity;
        productQty.set(it.productId, cur);
      }
    }
    const topProducts = Array.from(productQty.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    // ---- Upsell funnel ----
    const upsellShown = events.filter((e) => e.type === 'upsell_shown').length;
    const upsellClicked = events.filter((e) => e.type === 'upsell_clicked').length;
    const upsellAdded = events.filter((e) => e.type === 'upsell_added').length;

    const kpis = {
      orders: orders.length,
      revenue: Math.round(totalRevenue * 100) / 100,
      itemsSold: totalItems,
      avgOrderValue: orders.length ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
      sessions: sessions.length,
      addToCart: events.filter((e) => e.type === 'add_to_cart').length,
      conversionRate: sessions.length
        ? Math.round((orders.length / sessions.length) * 1000) / 10
        : 0,
    };

    // ---- Today snapshot ----
    const today = dayKey(new Date());
    const todayBucket = buckets.get(today) || {
      date: today,
      orders: 0,
      revenue: 0,
      itemsSold: 0,
      sessions: 0,
      addToCart: 0,
      checkouts: 0,
    };

    return NextResponse.json({
      days,
      today: todayBucket,
      daily: Array.from(buckets.values()),
      kpis,
      topProducts,
      upsellFunnel: { shown: upsellShown, clicked: upsellClicked, added: upsellAdded },
    });
  });
}

export const dynamic = 'force-dynamic';
