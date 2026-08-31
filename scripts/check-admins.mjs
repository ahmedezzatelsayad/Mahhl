/** Check existing AdminUser rows in production Neon. */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const users = await db.adminUser.findMany({
  select: { email: true, role: true, createdAt: true },
});
console.log(JSON.stringify(users, null, 2));
await db.$disconnect();
