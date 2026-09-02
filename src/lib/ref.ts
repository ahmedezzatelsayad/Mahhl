/**
 * ref.ts — إسناد الروابط التسويقية للمسوقين (?ref=CODE).
 *
 * كل مسوق يأخذ رابط ش Form:
 *     https://site/?ref=MH-7K3F           (رابط المتجر العام)
 *     https://site/?p=<slug>&ref=MH-7K3F  (رابط منتج مباشر)
 *
 * عند أول هبوط يُحفظ الكود في localStorage لمدة 30 يوم (نافذة إسناد)،
 * وعند إتمام الطلب يُعبّأ حقل «كود المسوق» تلقائياً في الـ checkout
 * (يمكن للمستخدم مسحه) — فتصلك العمولة لصاحب الرابط تلقائياً.
 */

const REF_KEY = 'mktg_aff_ref';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days attribution window

/** كود المسوق: 3-20 حرف/رقم/شرطة/شرطة سفلية (مثل MH-7K3F) */
function cleanRef(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase().slice(0, 20);
  return /^[A-Z0-9_-]{3,20}$/.test(v) ? v : null;
}

/** يُستدعى مرة عند تحميل التطبيق — يلتقط ?ref= ويخزنه 30 يوم. */
export function captureRef() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(location.search);
    const code = cleanRef(params.get('ref'));
    if (!code) return;
    localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** كود المسوق المخزّن (إن كان ضمن نافذة 30 يوم) أو null. */
export function getStoredRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.code || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > REF_TTL_MS) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return cleanRef(parsed.code);
  } catch {
    return null;
  }
}

/** بناء رابط تسويقي كامل لمنتج (يُستخدم في بوابة المسوقين). */
export function buildRefLink(origin: string, slug: string | null, code: string): string {
  const base = (origin || '').replace(/\/$/, '');
  return slug ? `${base}/?p=${encodeURIComponent(slug)}&ref=${code}` : `${base}/?ref=${code}`;
}
