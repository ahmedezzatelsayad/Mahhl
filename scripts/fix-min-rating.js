/* eslint-disable @typescript-eslint/no-require-imports */
/** Enforce min average rating 3.9: bump lowest ratings to 5 until avg >= 3.9. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const groups = await p.review.groupBy({
    by: ['productId'],
    _avg: { rating: true },
    _count: { _all: true },
  });
  const low = groups.filter((g) => g._avg.rating < 3.88);
  console.log('products below 3.9:', low.length);
  let fixed = 0;
  for (const g of low) {
    const n = g._count._all;
    const needSum = Math.ceil(3.9 * n);
    const rows = await p.review.findMany({
      where: { productId: g.productId },
      select: { id: true, rating: true },
      orderBy: { rating: 'asc' },
    });
    let sum = rows.reduce((a, r) => a + r.rating, 0);
    const toUpdate = [];
    for (const r of rows) {
      if (sum >= needSum) break;
      sum += 5 - r.rating;
      toUpdate.push(r.id);
    }
    if (toUpdate.length) {
      await p.review.updateMany({ where: { id: { in: toUpdate } }, data: { rating: 5 } });
      fixed += toUpdate.length;
    }
  }
  console.log('ratings bumped:', fixed);
  const after = await p.review.groupBy({ by: ['productId'], _avg: { rating: true } });
  const avgs = after.map((g) => g._avg.rating);
  console.log('NEW MIN avg:', Math.min(...avgs).toFixed(2), 'MAX:', Math.max(...avgs).toFixed(2));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
