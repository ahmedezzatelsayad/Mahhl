import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { generateAffiliateCode } from '@/lib/affiliate-auth';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';
import { cleanText } from '@/lib/create-order';
import { round3 } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** All affiliates with aggregated stats (المسوقون). */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'affiliates', 'view', async () => {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().slice(0, 60);
    const status = sp.get('status') || '';

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const affiliates = await db.affiliate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true, name: true, phone: true, email: true, code: true, status: true,
        paymentMethod: true, paymentAccount: true, notes: true, createdAt: true, lastLoginAt: true,
        _count: { select: { orders: true } },
      },
    });

    // aggregate money per affiliate in one query each (bounded list)
    const ids = affiliates.map((a) => a.id);
    const [ledgerAgg, pendingAgg, payoutAgg, pipelineAgg] = await Promise.all([
      db.commissionEntry.groupBy({
        by: ['affiliateId'], where: { affiliateId: { in: ids } },
        _sum: { amount: true },
      }),
      db.withdrawalRequest.groupBy({
        by: ['affiliateId'], where: { affiliateId: { in: ids }, status: 'pending' },
        _sum: { amount: true },
      }),
      db.commissionEntry.groupBy({
        by: ['affiliateId'], where: { affiliateId: { in: ids }, type: 'payout' },
        _sum: { amount: true },
      }),
      db.order.groupBy({
        by: ['affiliateId'],
        where: { affiliateId: { in: ids }, status: { in: ['pending', 'confirmed', 'deferred', 'processing', 'shipped'] } },
        _sum: { commissionTotal: true },
      }),
    ]);
    const toMap = (rows: { affiliateId: string; _sum: { amount: number | null } }[]) =>
      new Map(rows.map((r) => [r.affiliateId, round3(r._sum.amount || 0)]));
    const balanceMap = toMap(ledgerAgg);
    const pendingMap = toMap(pendingAgg);
    const paidMap = toMap(payoutAgg);
    const pipelineMap = new Map(
      (pipelineAgg as unknown as { affiliateId: string; _sum: { commissionTotal: number | null } }[]).map(
        (r) => [r.affiliateId, round3(r._sum.commissionTotal || 0)]
      )
    );

    return NextResponse.json(
      affiliates.map((a) => {
        const balance = balanceMap.get(a.id) || 0;
        const pending = pendingMap.get(a.id) || 0;
        return {
          ...a,
          orderCount: a._count.orders,
          _count: undefined,
          balance,
          available: Math.max(0, round3(balance - pending)),
          inPayout: pending,
          paid: round3(-(paidMap.get(a.id) || 0)),
          expected: pipelineMap.get(a.id) || 0,
        };
      })
    );
  });
}

/** Manually create an affiliate (add from the dashboard). */
export async function POST(req: NextRequest) {
  return requirePermission(req, 'affiliates', 'manage', async () => {
    const body = await req.json();
    const name = cleanText(body.name, 80);
    const phone = normalizeKwPhone(String(body.phone || ''));
    const password = String(body.password || '');
    if (name.length < 2) return NextResponse.json({ error: 'اكتب اسم المسوق' }, { status: 400 });
    if (!isValidKwPhone(phone)) return NextResponse.json({ error: 'رقم هاتف كويتي غير صحيح' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 });

    const exists = await db.affiliate.findUnique({ where: { phone } });
    if (exists) return NextResponse.json({ error: 'الرقم مسجل بالفعل' }, { status: 409 });

    const code = await generateAffiliateCode();
    const aff = await db.affiliate.create({
      data: {
        name,
        phone,
        passwordHash: await bcrypt.hash(password, 10),
        code,
        status: body.status === 'pending' ? 'pending' : 'active',
        paymentMethod: cleanText(body.paymentMethod, 20) || null,
        paymentAccount: cleanText(body.paymentAccount, 200) || null,
        notes: cleanText(body.notes, 500) || null,
      },
    });
    return NextResponse.json({ ok: true, affiliate: { id: aff.id, code: aff.code } });
  });
}
