import { NextRequest, NextResponse } from 'next/server';
import { consumeSsoTicket } from '@/lib/garfix-sso';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sso/consume — body: { ticket }
 *
 * تستبدل الواجهة التذكرة (من ?sso_ticket=…) بالتوكن وبيانات الأدمن —
 * تذكرة لمرة واحدة تنتهي بعد دقيقة، فيمرر التوكن الطويل العمر عبر
 * جسم POST فقط ولا يظهر في الرابط أو التاريخ أبداً.
 */
export async function POST(req: NextRequest) {
  let body: { ticket?: unknown };
  try {
    body = (await req.json()) as { ticket?: unknown };
  } catch {
    return NextResponse.json({ error: 'جسم غير صالح' }, { status: 400 });
  }
  const ticket = typeof body.ticket === 'string' ? body.ticket : '';
  if (!ticket) {
    return NextResponse.json({ error: 'التذكرة مطلوبة' }, { status: 400 });
  }

  const entry = await consumeSsoTicket(ticket);
  if (!entry) {
    return NextResponse.json(
      { error: 'التذكرة غير صالحة أو مستهلكة أو منتهية' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    token: entry.token,
    user: entry.user,
  });
}
