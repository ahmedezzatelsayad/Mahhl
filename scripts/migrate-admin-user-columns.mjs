/** Pre-add new AdminUser columns with defaults (safe for existing rows), then prisma db push syncs. */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

await db.$executeRawUnsafe(
  `ALTER TABLE "AdminUser"
     ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
     ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
     ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()`
);
console.log('columns added');

// Normalize legacy role values
const res = await db.adminUser.updateMany({
  where: { role: { in: ['staff', ''] } },
  data: { role: 'viewer' },
});
console.log('legacy roles normalized:', res.count);

await db.$disconnect();
