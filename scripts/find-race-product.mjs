import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
// find a tracked, OOS-disabled product with small stock to test the race
const p = await db.product.findFirst({
  where: { trackStock: true, disableOOS: true, quantity: { gte: 1, lte: 2 } },
  select: { id: true, name: true, quantity: true, price: true, salePrice: true, slug: true },
});
console.log(JSON.stringify(p));
await db.$disconnect();
