/**
 * E2E test for the commission & accounting system (نظام العمولات والمحاسبة).
 * Full lifecycle: register → admin activate → browse products → place order →
 * admin delivers → commission earned → withdrawal request → admin pays →
 * balances verified at every step.
 *
 * Run: bunx tsx scripts/commission/e2e-test.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// fresh unique phone per run
const AFF_PHONE = `5${String(Date.now()).slice(-7)}`;
const AFF_PASSWORD = 'TestPass123';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name} ${detail ? `— ${detail}` : ''}`);
  }
}

async function api(path: string, opts: any = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function main() {
  console.log('=== E2E: نظام العمولات والمحاسبة ===\n');

  // ---- 0. admin login ----
  console.log('0) Admin login');
  const adminLogin = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ahmedezzatelsayad@gmail.com', password: 'Ahmed2050A@' }),
  });
  check('admin login ok', adminLogin.status === 200 && adminLogin.body?.token, `status=${adminLogin.status}`);
  const adminAuth = { Authorization: `Bearer ${adminLogin.body?.token}` };

  // ---- 1. set commission on 2 products (founder workflow) ----
  console.log('\n1) Set commission on products');
  const products = await api('/api/products?perPage=2');
  const twoProducts = (products.body?.items || products.body?.products || []).slice(0, 2);
  check('two products found', twoProducts.length === 2, `got ${twoProducts.length}`);
  const commissions = [1.5, 2];
  for (let i = 0; i < twoProducts.length; i++) {
    const r = await api(`/api/admin/products/${twoProducts[i].id}`, {
      method: 'PUT', headers: adminAuth, body: JSON.stringify({ commission: commissions[i] }),
    });
    check(`product ${i} commission = ${commissions[i]} KWD`, r.status === 200);
  }

  // ---- 2. affiliate register ----
  console.log('\n2) Affiliate registration (pending state)');
  const reg = await api('/api/affiliate/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'مسوق تجريبي', phone: AFF_PHONE, password: AFF_PASSWORD }),
  });
  check('register ok', reg.status === 200 && reg.body?.affiliate?.status === 'pending', JSON.stringify(reg.body));
  const affCode = reg.body?.affiliate?.code;
  check('code generated', !!affCode, String(affCode));

  // ---- 3. admin activates ----
  console.log('\n3) Admin activation');
  const list = await api('/api/admin/affiliates?status=pending', { headers: adminAuth });
  const pendingRow = (list.body || []).find((a: any) => a.code === affCode);
  check('pending affiliate visible in admin list', !!pendingRow);
  const activate = await api(`/api/admin/affiliates/${pendingRow.id}`, {
    method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'active' }),
  });
  check('activated', activate.status === 200);

  // ---- 4. affiliate login ----
  console.log('\n4) Affiliate login');
  const login = await api('/api/affiliate/login', {
    method: 'POST', body: JSON.stringify({ phone: AFF_PHONE, password: AFF_PASSWORD }),
  });
  check('login ok', login.status === 200 && login.body?.token);
  const affAuth = { Authorization: `Bearer ${login.body?.token}` };

  // pending affiliate could NOT place orders (test before activation would be
  // redundant now) — verify orders are blocked only for pending:
  // (registered after activation, so place order directly)

  // ---- 5. affiliate portal order (اضف طلب) ----
  console.log('\n5) Affiliate places order for customer');
  const order = await api('/api/affiliate/orders', {
    method: 'POST', headers: affAuth,
    body: JSON.stringify({
      customerName: 'عميل المسوق',
      phone: '55123999',
      governorate: 'محافظة حولي',
      area: 'السالمية',
      address: 'شارع المطاعم، بناية 12، الأرضي',
      items: [
        { productId: twoProducts[0].id, quantity: 2 },
        { productId: twoProducts[1].id, quantity: 1 },
      ],
    }),
  });
  check('order created', order.status === 200 && order.body?.order?.orderNumber, JSON.stringify(order.body));
  const orderId = order.body?.order?.id;
  const expectedCommission = 2 * commissions[0] + commissions[1];
  check(
    `commissionTotal = ${expectedCommission}`,
    Math.abs((order.body?.order?.commissionTotal || 0) - expectedCommission) < 0.001,
    `got ${order.body?.order?.commissionTotal}`
  );

  // ---- 6. buckets: expected, not available ----
  console.log('\n6) Commission buckets before delivery');
  let me = await api('/api/affiliate/me', { headers: affAuth });
  check('expected = commissionTotal', Math.abs(me.body?.buckets?.expected - expectedCommission) < 0.001, `got ${me.body?.buckets?.expected}`);
  check('available = 0 (not delivered yet)', (me.body?.buckets?.available || 0) === 0, `got ${me.body?.buckets?.available}`);

  // ---- 7. withdrawal BEFORE delivery must fail ----
  console.log('\n7) Withdrawal blocked before delivery');
  const earlyWd = await api('/api/affiliate/withdrawals', {
    method: 'POST', headers: affAuth,
    body: JSON.stringify({ orderIds: [orderId], method: 'knet' }),
  });
  check('withdrawal rejected (order not delivered)', earlyWd.status === 400);

  // ---- 8. admin sets delivered → earned entry ----
  console.log('\n8) Admin marks order delivered');
  const del = await api(`/api/admin/orders/${orderId}`, {
    method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'delivered' }),
  });
  check('order delivered', del.status === 200);
  me = await api('/api/affiliate/me', { headers: affAuth });
  check('available = commissionTotal after delivery', Math.abs((me.body?.buckets?.available || 0) - expectedCommission) < 0.001, `got ${me.body?.buckets?.available}`);

  // ---- 9. affiliate requests withdrawal ----
  console.log('\n9) Withdrawal request');
  const wd = await api('/api/affiliate/withdrawals', {
    method: 'POST', headers: affAuth,
    body: JSON.stringify({ orderIds: [orderId], method: 'knet', accountInfo: 'KW81XXXX0000' }),
  });
  check('withdrawal created', wd.status === 200 && wd.body?.withdrawal?.amount, JSON.stringify(wd.body));
  const wdId = wd.body?.withdrawal?.id;
  check('withdrawal amount = commission', Math.abs((wd.body?.withdrawal?.amount || 0) - expectedCommission) < 0.001);
  me = await api('/api/affiliate/me', { headers: affAuth });
  check('available = 0 (locked in payout)', (me.body?.buckets?.available || 0) === 0, `got ${me.body?.buckets?.available}`);
  check('inPayout = commission', Math.abs((me.body?.buckets?.inPayout || 0) - expectedCommission) < 0.001);

  // ---- 10. double-booking the same order must fail ----
  console.log('\n10) Double withdrawal blocked');
  const dupWd = await api('/api/affiliate/withdrawals', {
    method: 'POST', headers: affAuth,
    body: JSON.stringify({ orderIds: [orderId], method: 'knet' }),
  });
  check('second request on same order rejected', dupWd.status === 400);

  // ---- 11. admin pays ----
  console.log('\n11) Admin processes payment');
  const pay = await api(`/api/admin/withdrawals/${wdId}`, {
    method: 'PATCH', headers: adminAuth,
    body: JSON.stringify({ action: 'pay', paymentRef: 'TEST-REF-001' }),
  });
  check('withdrawal paid', pay.status === 200 && pay.body?.status === 'paid', JSON.stringify(pay.body));
  me = await api('/api/affiliate/me', { headers: affAuth });
  check('paid = commission', Math.abs((me.body?.buckets?.paid || 0) - expectedCommission) < 0.001, `got ${me.body?.buckets?.paid}`);
  check('balance now 0', (me.body?.buckets?.available || 0) === 0 && (me.body?.buckets?.inPayout || 0) === 0);

  // ---- 12. order marked commission_received ----
  console.log('\n12) Order final status');
  const orders = await api('/api/affiliate/orders?status=commission_received', { headers: affAuth });
  check(
    'order marked تم استلام العمولة',
    (orders.body?.orders || []).some((o: any) => o.id === orderId),
  );

  // ---- 13. return reversal ----
  console.log('\n13) Reversal on returned order');
  const order2 = await api('/api/affiliate/orders', {
    method: 'POST', headers: affAuth,
    body: JSON.stringify({
      customerName: 'عميل ثاني',
      phone: '55123888',
      governorate: 'محافظة العاصمة',
      address: 'القصور، شارع الخليج، منزل 4',
      items: [{ productId: twoProducts[0].id, quantity: 1 }],
    }),
  });
  const orderId2 = order2.body?.order?.id;
  await api(`/api/admin/orders/${orderId2}`, {
    method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'delivered' }),
  });
  me = await api('/api/affiliate/me', { headers: affAuth });
  check('2nd delivery earned', Math.abs((me.body?.buckets?.available || 0) - commissions[0]) < 0.001, `got ${me.body?.buckets?.available}`);
  await api(`/api/admin/orders/${orderId2}`, {
    method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'returned' }),
  });
  me = await api('/api/affiliate/me', { headers: affAuth });
  check('reversal works — available back to 0', (me.body?.buckets?.available || 0) === 0, `got ${me.body?.buckets?.available}`);

  // ---- 14. checkout with affiliate code ----
  console.log('\n14) Store checkout with marketer code');
  const co = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'عميل من الكود',
      phone: '55123777',
      governorate: 'محافظة حولي',
      address: 'السالمية، شارع 5، مجمع 9',
      paymentMethod: 'cod',
      affiliateCode: affCode,
      items: [{ productId: twoProducts[1].id, quantity: 1 }],
    }),
  });
  const coBody = await co.json();
  check('checkout order created', co.status === 201 && coBody?.order?.orderNumber, JSON.stringify(coBody).slice(0, 120));
  check(
    'checkout order attributed to affiliate',
    Math.abs((coBody?.order?.commissionTotal || 0) - commissions[1]) < 0.001,
    `got ${coBody?.order?.commissionTotal}`
  );

  // ---- 15. admin commissions ledger ----
  console.log('\n15) Admin ledger & buckets');
  const ledger = await api('/api/admin/commissions', { headers: adminAuth });
  check('global buckets present', !!ledger.body?.buckets);
  check('entries exist', (ledger.body?.entries?.length || 0) >= 3, `got ${ledger.body?.entries?.length}`);

  console.log('\n=== RESULT:', failures === 0 ? 'ALL PASSED ✅' : `${failures} FAILURES ❌`, '===');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
