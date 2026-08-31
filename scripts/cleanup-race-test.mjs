/** Remove test orders + test customers created by the concurrency experiments. */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const TEST_PHONES = [];
for (let i = 1; i <= 9; i++) TEST_PHONES.push(`5510030${i}`);
for (let i = 1; i <= 7; i++) TEST_PHONES.push(`5510031${i}`);

const orders = await db.order.deleteMany({ where: { phone: { in: TEST_PHONES } } });
const customers = await db.customer.deleteMany({ where: { phone: { in: TEST_PHONES } } });
console.log('deleted orders:', orders.count, '| deleted customers:', customers.count);

const remaining = await db.order.count({ where: { phone: { in: TEST_PHONES } } });
console.log('remaining test orders:', remaining);
await db.$disconnect();
