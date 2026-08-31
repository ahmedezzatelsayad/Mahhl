import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const since = new Date(Date.now() - 20 * 60 * 1000);
const orders = await db.order.findMany({
  where: { createdAt: { gte: since } },
  select: { orderNumber: true, phone: true, customerName: true, total: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.log('orders in last 20 min:', orders.length);
for (const o of orders) console.log(o.orderNumber, '|', o.phone, '|', o.customerName, '|', o.total);
await db.$disconnect();
