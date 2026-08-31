const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const names = await p.product.findMany({select: {name: true}});
  const c75 = names.filter(n => n.name.length >= 75).length;
  const c90 = names.filter(n => n.name.length >= 90).length;
  const c120 = names.filter(n => n.name.length >= 120).length;
  console.log('total:', names.length, '| >=75:', c75, '| >=90:', c90, '| >=120:', c120);
  const worst = names.sort((a,b)=>b.name.length-a.name.length).slice(0,3);
  worst.forEach(w => console.log(w.name.length, w.name.slice(0,110)));
  await p.$disconnect();
})();
