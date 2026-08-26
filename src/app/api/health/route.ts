import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health check — used by uptime monitors & deploy verification.
 * GET /api/health → { ok, db, uptime }
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json(
    { ok: dbOk, db: dbOk ? 'up' : 'down', uptime: Math.round(process.uptime()), ts: new Date().toISOString() },
    { status: dbOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
