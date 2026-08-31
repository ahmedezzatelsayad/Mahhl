/** Remove the test staff account (sara-test) after E2E verification. */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const res = await db.adminUser.deleteMany({ where: { email: 'sara-test@mahhal.shop' } });
console.log('deleted test staff accounts:', res.count);

const remaining = await db.adminUser.findMany({
  select: { email: true, role: true, isActive: true },
});
console.log('remaining staff:', JSON.stringify(remaining));
await db.$disconnect();
