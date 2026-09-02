import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { cleanText } from '@/lib/create-order';
import { ENTRY_LABELS, STATUS_LABELS_AR, globalCommissionBuckets, round3 } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** Global commission ledger + buckets (العمولات والمحاسبة). */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'commissions', 'view', async () => {
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') || '';
    const affiliateId = sp.get('affiliateId') || '';
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const perPage = 40;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (affiliateId && affiliateId !== 'all') where.affiliateId = affiliateId;

    const [buckets, total, entries, affiliateList] = await Promise.all([
      globalCommissionBuckets(),
      db.commissionEntry.count({ where }),
      db.commissionEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          affiliate: { select: { name: true, phone: true, code: true } },
          order: { select: { orderNumber: true, status: true } },
        },
      }),
      db.affiliate.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      buckets,
      total,
      page,
      perPage,
      affiliates: affiliateList,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        typeLabel: ENTRY_LABELS[e.type] || e.type,
        amount: e.amount,
        note: e.note,
        affiliate: e.affiliate,
        orderNumber: e.order?.orderNumber || null,
        orderStatus: e.order ? STATUS_LABELS_AR[e.order.status] || e.order.status : null,
        createdAt: e.createdAt,
      })),
    });
  });
}

/** Manual accounting entry: bonus / deduction / manual payout (تسوية يدوية). */
export async function POST(req: NextRequest) {
  return requirePermission(req, 'commissions', 'manage', async (admin) => {
    const body = await req.json();
    const affiliateId = String(body.affiliateId || '');
    const amount = Number(body.amount);
    const type = String(body.type || 'adjustment');
    const note = cleanText(body.note, 300);

    if (!affiliateId) return NextResponse.json({ error: 'اختر المسوق' }, { status: 400 });
    if (!['adjustment', 'payout'].includes(type)) {
      return NextResponse.json({ error: 'نوع حركة غير صحيح' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'اكتب مبلغاً صحيحاً غير صفري' }, { status: 400 });
    }
    if (type === 'payout' && amount >= 0) {
      return NextResponse.json({ error: 'الدفعة يجب أن تكون بمبلغ سالب (خصم من الرصيد)' }, { status: 400 });
    }
    if (type === 'adjustment' && Math.abs(amount) > 1000) {
      return NextResponse.json({ error: 'الحد الأقصى للتسوية اليدوية 1000 د.ك' }, { status: 400 });
    }

    const aff = await db.affiliate.findUnique({ where: { id: affiliateId } });
    if (!aff) return NextResponse.json({ error: 'المسوق غير موجود' }, { status: 404 });

    const entry = await db.commissionEntry.create({
      data: {
        affiliateId,
        type,
        amount: round3(amount),
        note: note || (type === 'payout' ? 'دفعة يدوية' : 'تسوية يدوية'),
        createdById: admin.id,
      },
    });

    return NextResponse.json({ ok: true, entry: { id: entry.id, amount: entry.amount } });
  });
}
