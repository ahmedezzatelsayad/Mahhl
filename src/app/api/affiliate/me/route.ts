import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { affiliateBuckets } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** Session + live money buckets for the portal shell/header. */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const buckets = await affiliateBuckets(aff.id);
    const row = await db.affiliate.findUnique({
      where: { id: aff.id },
      select: {
        id: true, name: true, phone: true, email: true, code: true, status: true,
        paymentMethod: true, paymentAccount: true, createdAt: true,
      },
    });
    return NextResponse.json({ affiliate: row, buckets });
  });
}
