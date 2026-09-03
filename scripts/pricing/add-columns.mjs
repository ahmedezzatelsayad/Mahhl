import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Additive migration — same columns as schema.prisma (suggestedPrice/demandTier/adChannel/studyNote)
const stmts = [
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "suggestedPrice" DOUBLE PRECISION`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "demandTier" TEXT`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "adChannel" TEXT`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "studyNote" TEXT`,
];

for (const s of stmts) {
  await db.$executeRawUnsafe(s);
  console.log('OK:', s.slice(0, 60));
}

// verify
const cols = await db.$queryRawUnsafe(
  `SELECT column_name FROM information_schema.columns WHERE table_name='Product' AND column_name IN ('suggestedPrice','demandTier','adChannel','studyNote') ORDER BY column_name`
);
console.log('columns present:', cols.map((c) => c.column_name).join(', '));
await db.$disconnect();
