const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const top = await p.product.count({where: {demandRank: {not: null}}});
  const best = await p.product.count({where: {isBestSeller: true}});
  console.log('demandRank set:', top, '| bestsellers:', best);
  const both = await p.product.count({where: {OR: [{demandRank: {not: null}}, {isBestSeller: true}]}});
  console.log('union:', both);
  await p.$disconnect();
})();
