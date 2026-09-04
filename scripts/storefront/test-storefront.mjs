/**
 * test-storefront.mjs — اختبار E2E كامل لميزة المتجر المجاني على إنتاج Neon:
 * تسجيل مسوق → فتح متجر → إضافة منتجين بنقرة → طلب زائر COD → التحقق من
 * العمولة والربح → تنظيف بيانات الاختبار.
 * Usage: set -a; source .env; set +a; export DATABASE_URL="$NEON_DATABASE_URL"; node scripts/storefront/test-storefront.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const PHONE = `9${Math.floor(1000000 + Math.random() * 8999999)}`; // رقم كويتي اختباري 8 أرقام

function check(name, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  console.log('=== 1) تسجيل مسوق اختباري ===');
  const passwordHash = await bcrypt.hash('Test1234', 10);
  const aff = await db.affiliate.create({
    data: {
      name: 'مسوق اختبار المتاجر',
      phone: PHONE,
      passwordHash,
      code: `ST${Date.now().toString(36).toUpperCase().slice(-6)}`,
      status: 'active',
    },
  });
  console.log('affiliate:', aff.id, 'code:', aff.code);

  console.log('=== 2) تسجيل الدخول (API البوابة) ===');
  const loginRes = await fetch(`${BASE}/api/affiliate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, password: 'Test1234' }),
  });
  const login = await loginRes.json();
  check('login ok', loginRes.ok && login.token, login.token ? '' : JSON.stringify(login));
  const auth = { headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' } };

  console.log('=== 3) فتح المتجر ===');
  const slug = `test-store-${Date.now().toString(36).slice(-4)}`;
  const createRes = await fetch(`${BASE}/api/storefront/me`, {
    method: 'POST',
    ...auth,
    body: JSON.stringify({ name: 'متجر الاختبار', slug, tagline: 'أفضل العروض', defaultMarkup: 2.5, primaryColor: '#047857', whatsapp: '+96550000000', thankYouNote: 'شكراً لطلبك!' }),
  });
  const created = await createRes.json();
  check('create storefront', createRes.ok && created.storefront?.slug === slug, JSON.stringify(created).slice(0, 120));

  console.log('=== 4) منع المعرفات المحجوزة + متجر واحد لكل مسوق ===');
  const dupRes = await fetch(`${BASE}/api/storefront/me`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ثاني', slug: 'admin' }),
  });
  check('reserved slug rejected', dupRes.status === 400, `status=${dupRes.status}`);
  // إعادة POST بنفس المتجر = تحديث فقط (لا متجر ثانٍ) — بدون تغيير الاسم/المعرف
  const dup2 = await fetch(`${BASE}/api/storefront/me`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagline: 'أفضل العروض في الكويت' }),
  });
  const dup2Data = await dup2.json();
  check('one store per marketer', dup2.status === 200 && dup2Data.created === false, `status=${dup2.status}`);

  console.log('=== 5) جلب منتجين من الكتالوج وإضافتهم بنقرة ===');
  const prods = await db.product.findMany({ take: 2, orderBy: { isBestSeller: 'desc' }, select: { id: true, name: true, price: true, salePrice: true } });
  console.log('products:', prods.map((p) => p.name).join(' / '));
  const addRes = await fetch(`${BASE}/api/storefront/me/products`, {
    method: 'POST',
    ...auth,
    body: JSON.stringify({ productIds: prods.map((p) => p.id) }),
  });
  const added = await addRes.json();
  check('one-click add x2', addRes.ok && added.added === 2, JSON.stringify(added));

  console.log('=== 6) الواجهة العامة: بيانات المتجر بالأسعار ===');
  const pubRes = await fetch(`${BASE}/api/storefront/${slug}`);
  const pub = await pubRes.json();
  const expected = prods.map((p) => {
    const base = p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
    return Math.round((base + 2.5) * 1000) / 1000;
  });
  check('public store 200', pubRes.ok && pub.storefront?.name === 'متجر الاختبار');
  check('prices = platform + markup 2.5', pub.products?.length === 2 && expected.every((v) => pub.products.some((x) => Math.abs(x.price - v) < 0.001)), JSON.stringify(pub.products?.map((p) => p.price)));

  console.log('=== 7) طلب زائر COD من المتجر ===');
  const orderRes = await fetch(`${BASE}/api/storefront/${slug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'زبون تجربة',
      phone: '55500011',
      governorate: 'محافظة حولي',
      area: 'السالمية',
      address: 'قطعة 5 شارع 12 منزل 3',
      items: [{ productId: prods[0].id, quantity: 2 }],
    }),
  });
  const order = await orderRes.json();
  const base0 = prods[0].salePrice > 0 && prods[0].salePrice < prods[0].price ? prods[0].salePrice : prods[0].price;
  // الشحن من إعدادات المنصة (نفس منطق create-order)
  const shipRow = await db.siteSetting.findUnique({ where: { key: 'shipping' } });
  const shipCfg = (shipRow?.value || {});
  const shipPrice = Number(shipCfg.price ?? 1) || 0;
  const shipFree = Number(shipCfg.freeThreshold ?? 0) || 0;
  const subtotal0 = Math.round((base0 + 2.5) * 2 * 1000) / 1000;
  const ship0 = shipFree > 0 && subtotal0 >= shipFree ? 0 : shipPrice;
  const expectedTotal = Math.round((subtotal0 + ship0) * 1000) / 1000;
  check('order created', orderRes.ok && order.orderNumber, JSON.stringify(order).slice(0, 160));
  check('total = (store price x2) + shipping', Math.abs(order.total - expectedTotal) < 0.001, `total=${order.total} expected=${expectedTotal} (subtotal=${subtotal0}, ship=${ship0})`);

  console.log('=== 8) العمولة دخلت محفظة المسوق = الهامش ===');
  const ord = await db.order.findFirst({ where: { orderNumber: order.orderNumber }, include: { items: true } });
  const profit = Math.round((base0 + 2.5 - base0) * 1000) / 1000;
  check('order attributed to owner', ord?.affiliateId === aff.id);
  check('commissionTotal = markup*qty', Math.abs((ord?.commissionTotal || 0) - profit * 2) < 0.001, `commissionTotal=${ord?.commissionTotal}`);
  check('notes mention store', (ord?.notes || '').includes('متجر الاختبار'), ord?.notes);

  console.log('=== 9) منع طلب لمنتج مش في المتجر ===');
  const other = await db.product.findFirst({ where: { id: { notIn: prods.map((p) => p.id) } }, select: { id: true } });
  const badRes = await fetch(`${BASE}/api/storefront/${slug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'زبون', phone: '55500011', governorate: 'محافظة حولي', address: 'عنوان تجربة طويل', items: [{ productId: other.id, quantity: 1 }] }),
  });
  check('foreign product rejected', badRes.status === 400);

  console.log('=== 10) الزائر ما يقدر يعدل السعر ===');
  const cheat = await fetch(`${BASE}/api/storefront/${slug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'محاول غش', phone: '55500022', governorate: 'محافظة حولي', address: 'عنوان تجربة طويل جداً', items: [{ productId: prods[1].id, quantity: 1, price: 0.001 }] }),
  });
  const cheatData = await cheat.json();
  const base1 = prods[1].salePrice > 0 && prods[1].salePrice < prods[1].price ? prods[1].salePrice : prods[1].price;
  const subtotal1 = Math.round((base1 + 2.5) * 1000) / 1000;
  const ship1 = shipFree > 0 && subtotal1 >= shipFree ? 0 : shipPrice;
  check('price override ignored', cheat.ok && Math.abs(cheatData.total - (subtotal1 + ship1)) < 0.001, `total=${cheatData.total} expected=${subtotal1 + ship1}`);

  console.log('=== 11) تعديل سعر منتج + تغيير المعرف + الحماية من البيع تحت سعر المنصة ===');
  const meRes = await fetch(`${BASE}/api/storefront/me`, auth);
  const me = await meRes.json();
  const spId = me.products[0].id;
  const lowRes = await fetch(`${BASE}/api/storefront/me/products`, {
    method: 'PATCH', ...auth,
    body: JSON.stringify({ id: spId, price: 0.1 }),
  });
  check('below-platform price rejected', lowRes.status === 400, `status=${lowRes.status}`);
  const okPatch = await fetch(`${BASE}/api/storefront/me/products`, {
    method: 'PATCH', ...auth,
    body: JSON.stringify({ id: spId, price: 99.5 }),
  });
  check('custom price accepted', okPatch.ok);
  // تغيير المعرف يشتغل من الواجهة (من الاسم للدومين كله قابل للتعديل)
  const newSlug = `${slug}-b`;
  const slugRes = await fetch(`${BASE}/api/storefront/me`, {
    method: 'POST', ...auth,
    body: JSON.stringify({ slug: newSlug }),
  });
  const slugData = await slugRes.json();
  check('slug editable', slugRes.ok && slugData.storefront?.slug === newSlug, JSON.stringify(slugData.storefront?.slug));
  const slugPage = await fetch(`${BASE}/store/${newSlug}`);
  check('page works at new slug', slugPage.ok);

  console.log('=== 12) صفحة المتجر العامة ترندر ===');
  const pageRes = await fetch(`${BASE}/store/${newSlug}`);
  const html = await pageRes.text();
  check('store page 200', pageRes.ok);
  check('store name in page', html.includes('متجر الاختبار'));
  check('thank you note in page', html.includes('شكراً لطلبك!'));
  const oldPage = await fetch(`${BASE}/store/${slug}`);
  check('old slug no longer serves store', oldPage.status === 404, `status=${oldPage.status}`);

  console.log('\n=== تنظيف بيانات الاختبار ===');
  await db.storefront.deleteMany({ where: { ownerId: aff.id } });
  const orders = await db.order.findMany({ where: { orderNumber: { in: [order.orderNumber, cheatData.orderNumber].filter(Boolean) } } });
  for (const o of orders) {
    await db.commissionEntry.deleteMany({ where: { orderId: o.id } });
    await db.orderItem.deleteMany({ where: { orderId: o.id } });
    await db.order.delete({ where: { id: o.id } });
  }
  await db.customer.deleteMany({ where: { phone: { in: ['55500011', '55500022'] } } });
  await db.affiliate.delete({ where: { id: aff.id } });
  console.log('cleanup done ✅');
}

main()
  .catch((e) => { console.error('FATAL', e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
