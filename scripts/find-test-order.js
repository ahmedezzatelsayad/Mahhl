/* eslint-disable @typescript-eslint/no-require-imports */
// standalone script — must point Prisma at Neon directly (like src/lib/db.ts)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const o = await p.order.findFirst({
    where: { status: { not: 'cancelled' } },
    select: { phone: true, orderNumber: true, items: { select: { productId: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
  if (!o) {
    console.log('NO_ORDERS');
  } else {
    const pr = await p.product.findUnique({ where: { id: o.items[0]?.productId }, select: { slug: true, name: true } });
    console.log(JSON.stringify({ phone: o.phone, orderNumber: o.orderNumber, slug: pr?.slug, name: pr?.name }));
  }
  await p.$disconnect();
})();
