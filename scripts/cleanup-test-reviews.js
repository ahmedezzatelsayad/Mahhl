/* eslint-disable @typescript-eslint/no-require-imports */
// cleanup: remove TEST reviews injected during e2e verification
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const del = await p.review.deleteMany({
    where: { customerName: { in: ['أحمد التجريبي', 'مشاري الدوسري', 'visitor test'] } },
  });
  console.log('deleted test reviews:', del.count);
  await p.$disconnect();
})();
