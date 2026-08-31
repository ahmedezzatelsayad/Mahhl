import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
try {
  const users = await db.adminUser.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  console.log('OK, users:', users.length);
} catch (e) {
  console.error('QUERY FAILED:', e.message.slice(0, 300));
}
await db.$disconnect();
