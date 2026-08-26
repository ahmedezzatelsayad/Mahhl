import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCustomer } from '@/lib/customer-auth';
import { runAutoShipIfDue } from '@/lib/auto-ship';

/** GET — my orders with a live tracking timeline (also nudges the 10AM auto-ship) */
export async function GET(req: NextRequest) {
  const customer = await verifyCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await runAutoShipIfDue().catch(() => {});

  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });

  return NextResponse.json({ orders });
}
