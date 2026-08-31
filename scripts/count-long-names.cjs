const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const all = await p.product.count();
  const long = await p.product.count({where: {name: {gte: '75'}}});
  const vlong = await p.product.count({where: {name: {gte: '90'}}});
  console.log('all:', all, '| >=75 chars:', long, '| >=90:', vlong);
  await p.$disconnect();
})();
