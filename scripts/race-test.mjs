import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
// Any tracked product? Count by config
const [tracked, oos, low] = await Promise.all([
  db.product.count({ where: { trackStock: true } }),
  db.product.count({ where: { disableOOS: true } }),
  db.product.count({ where: { trackStock: true, quantity: { lte: 2 } } }),
]);
console.log('tracked:', tracked, '| disableOOS:', oos, '| tracked&low:', low);
const p = await db.product.findFirst({
  where: { trackStock: true, quantity: { gte: 1 } },
  orderBy: { quantity: 'asc' },
  select: { id: true, name: true, quantity: true, slug: true },
});
console.log('candidate:', JSON.stringify(p));
await db.$disconnect();
