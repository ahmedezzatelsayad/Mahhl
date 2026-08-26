/**
 * E2E order-flow test — mirrors the pre-launch review checklist:
 *
 *  1. Normal order creation (valid Kuwaiti phone)
 *  2. Server-side pricing: forged prices in the payload are IGNORED
 *  3. Shipping: 1 KWD under threshold, FREE at/above 50 KWD (server-computed)
 *  4. Duplicate guard: identical order within 90s → same order returned
 *  5. Honeypot: filled "website" field → no order created
 *  6. Invalid phone → 400
 *  7. Invalid governorate → 400
 *  8. Quantity abuse (>20 per item) → 400
 *  9. Unknown product id → 400
 * 10. Rate limit: burst of orders → 429
 * 11. Track the created order (orderNumber + phone)
 * 12. UTM params persisted on the order
 *
 * Usage: bun run scripts/e2e-orders-test.ts [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:3000';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function api(path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `5.10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, data };
}

async function getProducts(limit = 3) {
  const r = await fetch(`${BASE}/api/products?limit=${limit}`);
  const d = await r.json();
  const list = Array.isArray(d) ? d : d.items || d.products || [];
  return list.map((p: any) => ({
    productId: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    salePrice: p.salePrice,
  }));
}

function effPrice(p: { price: number; salePrice: number }) {
  return p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

const GOV = 'محافظة العاصمة';

async function main() {
  console.log(`\n🧪 E2E ORDER HARDENING TEST — ${BASE}\n`);

  // ---------- fetch real products ----------
  const products = await getProducts(3);
  if (products.length < 2) {
    console.log('❌ need at least 2 products from /api/products — abort');
    process.exit(1);
  }
  const [p1, p2] = products;
  console.log(`   products: ${p1.name} (${p1.price} KWD) · ${p2.name} (${p2.price} KWD)\n`);

  // ---------- 1. normal order ----------
  console.log('1) إنشاء طلب سليم');
  const phone1 = `5${Date.now().toString().slice(-7)}`;
  const r1 = await api('/api/orders', {
    customerName: 'اختبار آلي',
    phone: phone1,
    governorate: GOV,
    area: 'الشهرا',
    address: 'شارع الاختبار 1 مبنى 2',
    paymentMethod: 'cod',
    items: [{ productId: p1.productId, quantity: 2 }],
    utmSource: 'facebook',
    utmMedium: 'paid_social',
    utmCampaign: 'ramadan_launch',
  });
  ok('status 201', r1.status === 201, `got ${r1.status}`);
  ok('رقم طلب مولّد', !!r1.data?.order?.orderNumber, r1.data?.order?.orderNumber);
  const expectedSubtotal = Math.round(effPrice(p1) * 2 * 1000) / 1000;
  ok(
    'subtotal من قاعدة البيانات',
    Math.abs(r1.data.order.subtotal - expectedSubtotal) < 0.001,
    `${r1.data.order.subtotal} (متوقع ${expectedSubtotal})`
  );
  const shipping1 = r1.data.order.shipping;
  ok('شحن 1 د.ك (تحت الحد)', shipping1 === 1, `${shipping1}`);
  ok(
    'الإجمالي = فرعي + شحن',
    Math.abs(r1.data.order.total - (r1.data.order.subtotal + shipping1)) < 0.001,
    `${r1.data.order.total}`
  );
  ok('UTM محفوظ على الطلب', r1.data.order.utmSource === 'facebook', r1.data.order.utmCampaign);
  ok('حساب تلقائي أنشئ', r1.data.accountCreated === true);
  const orderNum = r1.data.order.orderNumber;

  // ---------- 2. forged prices ----------
  console.log('\n2) محاولة تلاعب بالسعر (price=0.001 من العميل)');
  const phone2 = `6${Date.now().toString().slice(-7)}`;
  const r2 = await api('/api/orders', {
    customerName: 'مخادع',
    phone: phone2,
    governorate: GOV,
    address: 'شارع التلاعب 9',
    items: [{ productId: p1.productId, quantity: 1, price: 0.001, name: 'تزييف' }],
  });
  ok(
    'السيرفر تجاهل سعر العميل',
    r2.data?.order?.items?.[0]?.price === effPrice(p1),
    `DB price=${r2.data?.order?.items?.[0]?.price}`
  );
  ok(
    'الاسم من قاعدة البيانات',
    r2.data?.order?.items?.[0]?.name === p1.name
  );

  // ---------- 3. free shipping threshold ----------
  console.log('\n3) الشحن المجاني عند 50 د.ك');
  const qtyNeeded = Math.max(1, Math.ceil(50 / effPrice(p1)));
  if (qtyNeeded <= 20) {
    const phone3 = `9${Date.now().toString().slice(-7)}`;
    const r3 = await api('/api/orders', {
      customerName: 'طلب كبير',
      phone: phone3,
      governorate: GOV,
      address: 'شارع المجاني 5',
      items: [{ productId: p1.productId, quantity: qtyNeeded }],
    });
    const sub3 = r3.data?.order?.subtotal || 0;
    ok(
      `شحن مجاني (${sub3.toFixed(2)} د.ك ≥ 50)`,
      r3.data?.order?.shipping === 0 && sub3 >= 50,
      `shipping=${r3.data?.order?.shipping}`
    );
  } else {
    console.log(`   ⏭️ skipped — يحتاج ${qtyNeeded} قطعة (>20 حد السلة)`);
  }

  // ---------- 4. duplicate guard ----------
  console.log('\n4) منع الطلب المكرر (نفس الهاتف خلال 90 ثانية)');
  const r4 = await api('/api/orders', {
    customerName: 'اختبار آلي',
    phone: phone1,
    governorate: GOV,
    area: 'الشهرا',
    address: 'شارع الاختبار 1 مبنى 2',
    items: [{ productId: p1.productId, quantity: 2 }],
  });
  ok('نفس الطلب رجع (duplicate)', r4.data?.duplicate === true && r4.data?.order?.orderNumber === orderNum);

  // ---------- 5. honeypot ----------
  console.log('\n5) مصيدة السبام (honeypot)');
  const r5 = await api('/api/orders', {
    customerName: 'بوت',
    phone: `5${Date.now().toString().slice(-7)}`,
    governorate: GOV,
    address: 'شارع البوت 7',
    website: 'http://spam.example',
    items: [{ productId: p1.productId, quantity: 1 }],
  });
  ok('البوت استُقبل صامتاً بدون طلب', r5.data?.spam === true && !r5.data?.order);

  // ---------- 6. invalid phone ----------
  console.log('\n6) هاتف غير كويتي');
  const r6 = await api('/api/orders', {
    customerName: 'هاتف خاطئ',
    phone: '12345',
    governorate: GOV,
    address: 'شارع 1',
    items: [{ productId: p1.productId, quantity: 1 }],
  });
  ok('مرفوض 400', r6.status === 400, r6.data?.error);

  // ---------- 7. invalid governorate ----------
  console.log('\n7) محافظة غير موجودة');
  const r7 = await api('/api/orders', {
    customerName: 'محافظة وهمية',
    phone: `5${Date.now().toString().slice(-7)}`,
    governorate: 'دبي',
    address: 'شارع 1',
    items: [{ productId: p1.productId, quantity: 1 }],
  });
  ok('مرفوض 400', r7.status === 400, r7.data?.error);

  // ---------- 8. quantity abuse ----------
  console.log('\n8) كمية مبالغ فيها (99 قطعة)');
  const r8 = await api('/api/orders', {
    customerName: 'جامح',
    phone: `5${Date.now().toString().slice(-7)}`,
    governorate: GOV,
    address: 'شارع 1',
    items: [{ productId: p1.productId, quantity: 99 }],
  });
  ok('مرفوض 400', r8.status === 400, r8.data?.error);

  // ---------- 9. unknown product ----------
  console.log('\n9) منتج غير موجود');
  const r9 = await api('/api/orders', {
    customerName: 'مخترع',
    phone: `5${Date.now().toString().slice(-7)}`,
    governorate: GOV,
    address: 'شارع 1',
    items: [{ productId: 'nonexistent-id-xyz', quantity: 1 }],
  });
  ok('مرفوض 400', r9.status === 400, r9.data?.error);

  // ---------- 10. rate limit ----------
  console.log('\n10) حظر السبام (rate limit: 6 طلبات/15 دقيقة لكل IP)');
  const burstIp = '5.99.77.55';
  let got429 = false;
  let lastStatus = 0;
  for (let i = 0; i < 8; i++) {
    const r = await api(
      '/api/orders',
      {
        customerName: `دفعة ${i}`,
        phone: `9${(Date.now() + i).toString().slice(-7)}`,
        governorate: GOV,
        address: `شارع الدفعة ${i}`,
        items: [{ productId: p2.productId, quantity: 1 }],
      },
      { 'x-forwarded-for': burstIp }
    );
    lastStatus = r.status;
    if (r.status === 429) {
      got429 = true;
      break;
    }
  }
  ok('الطلبات الزائدة حُظرت 429', got429, `last=${lastStatus}`);

  // ---------- 11. track ----------
  console.log('\n11) تتبع الطلب الأول');
  const r11 = await api('/api/orders/track', { orderNumber: orderNum, phone: phone1 });
  ok('التتبع يعيد الطلب', r11.status === 200 && !!r11.data?.order, r11.data?.order?.orderNumber);
  // wrong phone must NOT reveal the order (privacy)
  const r11b = await api('/api/orders/track', { orderNumber: orderNum, phone: '50000000' });
  ok('هاتف مختلف لا يكشف الطلب (خصوصية)', r11b.status === 404);

  // ---------- summary ----------
  console.log(`\n════════ النتيجة: ${pass} نجح · ${fail} فشل ══════\n`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('💥', e);
  process.exit(1);
});
