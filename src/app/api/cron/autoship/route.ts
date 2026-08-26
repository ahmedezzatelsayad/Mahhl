import { NextRequest, NextResponse } from 'next/server';
import { runAutoShipIfDue } from '@/lib/auto-ship';

/**
 * Auto-ship endpoint — marks every active order as shipped at/after 10:00
 * Kuwait time. Can be hit by an external cron (e.g. daily 10:05) with
 * ?force=1 (admin token required for force).
 */
export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('force') === '1';
  const result = await runAutoShipIfDue(force);
  return NextResponse.json({
    ...result,
    message: result.ran
      ? `تم شحن ${result.shippedCount} طلب تلقائياً — سيصل في الميعاد المنسق مع خدمة العملاء والمندوب`
      : 'ما حان وقت الشحن التلقائي بعد (10:00 صباحاً بتوقيت الكويت) — أو تم تنفيذه اليوم',
  });
}

export const POST = GET;
