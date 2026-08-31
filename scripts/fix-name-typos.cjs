const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const r1 = await p.product.updateMany({where: {name: {contains: 'نлектронي'}}, data: {name: 'كتاب إلكتروني ناطق لتعليم العربية والإنجليزية'}});
  console.log('fixed book name:', r1.count);
  const r2 = await p.product.updateMany({where: {name: {contains: 'المفاصل والع لتسكين'}}, data: {name: 'كريم المفاصل والعظام لتسكين الألم وتخفيف الالتهابات'}});
  console.log('fixed cream name:', r2.count);
  await p.$disconnect();
})();
