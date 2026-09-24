/**
 * المرحلة 2 (Agent Engine): POST /api/webhooks/erp/provision-store
 *
 * استقبال طلب «تجهيز متجر» من وكيل Garfix ERP (server-to-server):
 *  - الوكيل (في ERP) ينشئ/يربط شركة ERP ثم يستدعي هذا المسار لتجهيز
 *    متجر حقيقي هنا: حساب مسوّق + متجر (Storefront) بمنتجاته لاحقاً.
 *  - التوقيع إلزامي: X-Garfix-Signature: sha256=HMAC_SHA256(rawBody, GARFIX_WEBHOOK_SECRET)
 *    (نفس سر webhooks المرحلة 1 — timing-safe).
 *  - Idempotent: إعادة نفس الطلب لا تنشئ مكرراً (المتجر يُعاد كما هو).
 *
 * body: {
 *   store:  { slug*, name*, tagline?, whatsapp? },
 *   owner:  { name*, email?, phone? },
 *   sentAt: ISO
 * }
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateAffiliateCode } from '@/lib/affiliate-auth';
import { normalizeSlug, cleanField } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

function verifySignature(raw: string, header: string | null): boolean {
  const secret = process.env.GARFIX_WEBHOOK_SECRET || '';
  if (!secret || !header) return false;
  const provided = header.replace(/^sha256=/, '').trim();
  const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

const emailOk = (v: unknown): string | null => {
  const s = cleanField(v, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s.toLowerCase() : null;
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-garfix-signature');
  if (!verifySignature(raw, signature)) {
    return NextResponse.json({ error: 'توقيع غير صالح' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 });
  }

  const store = (body.store && typeof body.store === 'object' ? body.store : {}) as Record<string, unknown>;
  const owner = (body.owner && typeof body.owner === 'object' ? body.owner : {}) as Record<string, unknown>;

  const slug = normalizeSlug(store.slug);
  const name = cleanField(store.name, 60);
  const tagline = cleanField(store.tagline, 120) || null;
  const whatsapp = cleanField(store.whatsapp, 20) || null;
  const ownerName = cleanField(owner.name, 80);
  const ownerEmail = emailOk(owner.email);
  const ownerPhone = cleanField(owner.phone, 20) || null;

  if (!slug) {
    return NextResponse.json(
      { error: 'معرف المتجر غير صالح: 3–30 حرف إنجليزي صغير/أرقام/شرطات، وممنوع الكلمات المحجوزة' },
      { status: 400 }
    );
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'اسم المتجر مطلوب (حرفان على الأقل)' }, { status: 400 });
  }
  if (!ownerName && !ownerEmail) {
    return NextResponse.json({ error: 'هوية المالك مطلوبة (owner.name أو owner.email)' }, { status: 400 });
  }

  try {
    // ——— 1) المالك: مسوّق موجود (بالبريد) أو جديد يُنشأ بكلمة مرور عشوائية ———
    let affiliate = ownerEmail ? await db.affiliate.findUnique({ where: { email: ownerEmail } }) : null;

    if (!affiliate) {
      // هاتف اصطناعي فريد (حساب مُجهز آلياً — المطالبة بكلمة المرور لاحقاً عبر الإدارة)
      let phone = ownerPhone || `ERP-${slug.toUpperCase().slice(0, 24)}`;
      if (await db.affiliate.findUnique({ where: { phone } })) {
        phone = `ERP-${slug.toUpperCase().slice(0, 18)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      }
      const passwordHash = await bcrypt.hash(randomBytes(18).toString('base64url'), 10);
      const code = await generateAffiliateCode();
      affiliate = await db.affiliate.create({
        data: {
          name: ownerName || ownerEmail || `مالك متجر ${slug}`,
          phone,
          email: ownerEmail,
          passwordHash,
          code,
          // متاجر ERP تُنشأ مفعّلة مباشرة — الوكيل يعمل نيابة عن مستخدم موثّق جلسةً
          status: 'active',
          notes: `أُنشئ تلقائياً بواسطة وكيل Garfix ERP (${new Date().toISOString().slice(0, 16).replace('T', ' ')}) — كلمة المرور عشوائية، المطالبة بالحساب عبر الإدارة.`,
        },
      });
    } else if (affiliate.status === 'suspended') {
      return NextResponse.json({ error: 'حساب المالك موقوف — راجع إدارة المنصة' }, { status: 403 });
    }

    // ——— 2) المتجر: idempotent بالمعرّف ———
    const existing = await db.storefront.findUnique({ where: { slug } });
    if (existing) {
      if (existing.ownerId === affiliate.id) {
        return NextResponse.json({
          ok: true,
          created: false,
          store: { slug: existing.slug, name: existing.name, url: `/store/${existing.slug}` },
          affiliate: { code: affiliate.code },
          note: 'المتجر موجود أصلاً لهذا المالك — أُعيد كما هو (idempotent).',
        });
      }
      return NextResponse.json(
        { error: `المعرف «${slug}» محجوز لمالك آخر — جرّب معرفاً آخر`, conflict: true },
        { status: 409 }
      );
    }

    const created = await db.storefront.create({
      data: {
        ownerId: affiliate.id,
        slug,
        name,
        tagline,
        whatsapp,
        primaryColor: '#0f766e',
        defaultMarkup: 2.0,
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      created: true,
      store: { slug: created.slug, name: created.name, url: `/store/${created.slug}` },
      affiliate: { code: affiliate.code },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'فشل تجهيز المتجر' }, { status: 500 });
  }
}
