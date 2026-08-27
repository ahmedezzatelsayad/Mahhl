/* Debug the agent's catalog search — prints scored candidates for a query */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const STOP_WORDS = new Set([
  'في','من','على','عن','الى','إلى','ابي','أبي','ابغى','أبغى','أريد','اريد','دور','ادور','أدور','يدور',
  'عندي','وش','شنو','شلون','كم','سعر','بسعر','حلو','حلوة','أحسن','احسن','افضل','أفضل','اللي','ذي','هذا',
  'هذي','كان','ممكن','لو','سمحلي','هلا','والله','الله','يعطيك','العافية','شكرا','شكراً',
  'i','want','need','looking','for','the','a','an','please','can','you','have','do','me','my','show','find',
]);

function tokenize(q) {
  return q.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).map(t=>t.trim())
    .filter(t=>t.length>1 && !STOP_WORDS.has(t.toLowerCase())).slice(0,6);
}

async function main() {
  const q = process.argv[2] || 'هلا، أبغي عطر رجالي حلو شحن سريع';
  const tokens = tokenize(q);
  console.log('TOKENS:', tokens);

  const nameWhere = {
    disableOOS: false,
    OR: [
      ...tokens.flatMap(t=>[{name:{contains:t}},{nameEn:{contains:t}},{sku:{contains:t}}]),
      { name: { contains: q } }, { nameEn: { contains: q } },
    ],
  };
  const byName = await db.product.findMany({ where: nameWhere, take: 30, orderBy: [{soldCount:'desc'}], select: { id: true, name: true, soldCount: true } });
  console.log('\nBY NAME (top 30 by soldCount):', byName.length);
  byName.slice(0,10).forEach(p=>console.log('  ', p.name.slice(0,50), '| sold:', p.soldCount));

  const total = await db.product.count({ where: { disableOOS: false, name: { contains: 'عطر' } } });
  console.log('\nProducts with عطر in name:', total);
  const perfumes = await db.product.findMany({ where: { disableOOS: false, name: { contains: 'عطر' } }, orderBy: [{soldCount:'desc'}], take: 5, select: { name: true, soldCount: true } });
  perfumes.forEach(p=>console.log('  ', p.name.slice(0,50), '| sold:', p.soldCount));
  await db.$disconnect();
}
main();
