'use client';

/**
 * FloatingWidgets — زرارين عائمين (واتساب + الشات الذكي).
 * الشات له وضعين:
 *   • «مساعد المتجر» — وكيل المبيعات: يدوّر منتجات ويسجّل طلبات العملاء (/api/ai/agent)
 *   • «مساعد المسوقين» — خبير الدروب شيبنج: يرشح منتجات بالعمولة والدراسة،
 *     يجاوب عن المحفظة والسحب ويعطي خطط دعاية لسوق الكويت (/api/ai/marketer)
 * الوضع يفتح تلقائياً على «المسوقين» لو المستخدم مسوّق مسجّل.
 * يُصدَّر أيضاً MarketerChatWidget للبوابة الخاصة بالمسوقين.
 */
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Store, WhatsAppIcon, Bot, Handshake } from '@/components/store/icons';
import { useAppStore } from '@/lib/stores/app-store';
import { useBrand, waHref } from '@/components/store/header';
import { formatKwd } from '@/lib/utils/format';
import { useT } from '@/lib/i18n';
import { readLang } from '@/lib/stores/lang-store';

type ChatMode = 'store' | 'marketer';

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  /** marketer-mode extras */
  commission?: number;
  suggestedPrice?: number | null;
  demandTier?: string | null;
  adChannel?: string | null;
}

interface MktLink {
  label: string;
  action: 'guide-ads' | 'guide-campaigns' | 'affiliate-products' | 'affiliate-commissions';
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  /** action links suggested by the assistant (marketer pitch / guides) */
  links?: MktLink[];
}

const DEMAND_BADGE: Record<string, string> = { hot: '🔥', warm: '⚖️', cold: '💎' };

export function useChatActions() {
  const openProduct = useAppStore((s) => s.openProduct);
  const setView = useAppStore((s) => s.setView);
  const openInfo = useAppStore((s) => s.openInfo);
  const setTrackPrefill = useAppStore((s) => s.setTrackPrefill);
  return { openProduct, setView, openInfo, setTrackPrefill };
}

/** action links the marketer assistant suggests (open view / guide / portal tab) */
export function MktLinks({ links, onDone }: { links?: MktLink[]; onDone: () => void }) {
  const { setView, openInfo } = useChatActions();
  if (!links?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((l) => (
        <button
          key={l.action + l.label}
          onClick={() => {
            if (l.action === 'guide-ads' || l.action === 'guide-campaigns') openInfo(l.action);
            else setView(l.action);
            onDone();
          }}
          className="text-[11px] font-bold rounded-full border border-accent/50 text-gold-deep px-3 py-1.5 hover:bg-accent/10 transition-colors cursor-pointer"
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ==========================================================================
 * MarketerChatWidget — الشات بوضع المسوقين فقط (يُركَّب داخل بوابة المسوقين)
 * ========================================================================== */
export function MarketerChatWidget() {
  const { t } = useT();
  const lang = readLang();
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: t('mkt.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openProduct } = useChatActions();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/marketer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(affiliateToken ? { Authorization: `Bearer ${affiliateToken}` } : {}),
        },
        body: JSON.stringify({
          lang,
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, products: data.products || [], links: data.links || [] },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ch.error') }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 left-3 sm:left-4 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col"
          role="dialog"
          aria-label={t('mkt.title')}
          style={{ height: 'min(560px, calc(100vh - 120px))' }}
        >
          {/* header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full btn-gold">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-sm leading-tight">{t('mkt.title')}</p>
                <p className="text-[11px] text-primary-foreground/70 leading-tight flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('mkt.sub')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-primary-foreground/10 cursor-pointer"
              aria-label={t('r.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
                <div className="max-w-[88%]">
                  <div
                    className={
                      m.role === 'user'
                        ? 'chat-text-sm rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 whitespace-pre-line'
                        : 'chat-text-sm rounded-2xl rounded-tl-sm bg-card border px-3.5 py-2 text-card-foreground whitespace-pre-line shadow-sm'
                    }
                  >
                    {m.content}
                  </div>

                  {/* product chips with commission + study */}
                  {m.products && m.products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1">
                      {m.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            openProduct(p.slug);
                            setOpen(false);
                          }}
                          className="shrink-0 w-32 rounded-xl border bg-card overflow-hidden text-right hover:border-accent transition-colors cursor-pointer"
                        >
                          <div className="h-20 bg-white">
                            {p.image ? (
                               
                              <img src={p.image} alt={p.name} className="h-full w-full img-contain p-1" loading="lazy" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Store className="h-6 w-6 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 space-y-0.5">
                            <p className="text-[11px] font-medium line-clamp-1 text-foreground">{p.name}</p>
                            <p className="text-[11px] font-bold text-gold-deep">
                              {lang === 'en' ? 'Your commission' : 'عمولتك'}: {formatKwd(p.commission ?? 0)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {DEMAND_BADGE[p.demandTier ?? ''] ?? ''} {formatKwd(p.price)}
                              {p.suggestedPrice ? ` · ${lang === 'en' ? 'sugg.' : 'مقترح'} ${formatKwd(p.suggestedPrice)}` : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <MktLinks links={m.links} onDone={() => setOpen(false)} />
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="chat-text-sm rounded-2xl bg-card border px-4 py-2 text-muted-foreground">
                  {t('ch.searching')}
                </div>
              </div>
            )}
          </div>

          {/* quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {[t('mkt.sug1'), t('mkt.sug2'), t('mkt.sug3'), t('mkt.sug4')].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-[11px] border rounded-full px-3 py-1 bg-card hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-2.5 border-t flex gap-2 bg-card shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('mkt.placeholder')}
              className="flex-1 text-base px-3 py-2 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-gold rounded-xl px-3 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              aria-label={t('ch.send')}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-3 sm:left-4 z-50 h-[52px] w-[52px] rounded-full btn-gold shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
        aria-label={t('mkt.title')}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 px-1 flex items-center">
            AI
          </span>
        )}
      </button>
    </>
  );
}

/* ==========================================================================
 * FloatingWidgets — أزرار المتجر العائمة (واتساب + شات بوضعين)
 * ========================================================================== */
export function FloatingWidgets() {
  const brand = useBrand();
  const { t, lang } = useT();
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const [mode, setMode] = useState<ChatMode>(() => (useAppStore.getState().affiliateToken ? 'marketer' : 'store'));
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: useAppStore.getState().affiliateToken ? t('mkt.welcome') : t('ch.agentWelcome') },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openProduct, setView, openInfo } = useChatActions();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chatOpen, busy]);

  /** switch mode → fresh welcome so the user knows who they're talking to */
  function switchMode(next: ChatMode) {
    if (next === mode) return;
    setMode(next);
    setMessages([{ role: 'assistant', content: next === 'marketer' ? t('mkt.welcome') : t('ch.agentWelcome') }]);
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      // الوضعان يفوّضان لنفس العقل: مساعد المسوقين (منتجات + عمولات + دعاية)
      // منصة افلييت: لا مسار طلبات مباشرة إطلاقاً
      const res = await fetch('/api/ai/marketer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(affiliateToken ? { Authorization: `Bearer ${affiliateToken}` } : {}),
        },
        body: JSON.stringify({
          lang,
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, products: data.products || [], links: data.links || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('ch.error'),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ===== Chat panel ===== */}
      {chatOpen && (
        <div
          className="fixed bottom-20 left-3 sm:left-4 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col"
          role="dialog"
          aria-label={t('ch.title')}
          style={{ height: 'min(560px, calc(100vh - 120px))' }}
        >
          {/* header + mode tabs */}
          <div className="bg-primary text-primary-foreground shrink-0">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full btn-gold">
                  {mode === 'marketer' ? <Handshake className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-bold text-sm leading-tight">
                    {mode === 'marketer' ? t('mkt.title') : t('ch.agentTitle')}
                  </p>
                  <p className="text-[11px] text-primary-foreground/70 leading-tight flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {mode === 'marketer' ? t('mkt.sub') : t('ch.agentSub')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/10 cursor-pointer"
                aria-label={t('r.cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* mode switcher */}
            <div className="px-3 pb-2 flex gap-1.5">
              <button
                onClick={() => switchMode('store')}
                className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 transition-colors cursor-pointer ${
                  mode === 'store' ? 'btn-gold text-primary-foreground' : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                }`}
              >
                🛍️ {t('mkt.tabStore')}
              </button>
              <button
                onClick={() => switchMode('marketer')}
                className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 transition-colors cursor-pointer ${
                  mode === 'marketer' ? 'btn-gold text-primary-foreground' : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                }`}
              >
                💰 {t('mkt.tabMarketer')}
              </button>
            </div>
          </div>

          {/* messages — small clear font */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
                <div className="max-w-[88%]">
                  <div
                    className={
                      m.role === 'user'
                        ? 'chat-text-sm rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 whitespace-pre-line'
                        : 'chat-text-sm rounded-2xl rounded-tl-sm bg-card border px-3.5 py-2 text-card-foreground whitespace-pre-line shadow-sm'
                    }
                  >
                    {m.content}
                  </div>

                  {/* product chips */}
                  {m.products && m.products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1">
                      {m.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            openProduct(p.slug);
                            setChatOpen(false);
                          }}
                          className="shrink-0 w-28 rounded-xl border bg-card overflow-hidden text-right hover:border-accent transition-colors cursor-pointer"
                        >
                          <div className="h-20 bg-white">
                            {p.image ? (
                               
                              <img src={p.image} alt={p.name} className="h-full w-full img-contain p-1" loading="lazy" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Store className="h-6 w-6 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 space-y-0.5">
                            <p className="text-[11px] font-medium line-clamp-1 text-foreground">{p.name}</p>
                            <p className="text-[11px] font-bold text-gold-deep">
                              {lang === 'en' ? 'Commission' : 'العمولة'}: {formatKwd(p.commission ?? 0)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {DEMAND_BADGE[p.demandTier ?? ''] ?? ''} {formatKwd(p.price)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* action links suggested by the assistant (both modes) */}
                  <MktLinks links={m.links} onDone={() => setChatOpen(false)} />
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="chat-text-sm rounded-2xl bg-card border px-4 py-2 text-muted-foreground">
                  {t('ch.searching')}
                </div>
              </div>
            )}
          </div>

          {/* quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {(mode === 'marketer'
                ? [t('mkt.sug1'), t('mkt.sug2'), t('mkt.sug3'), t('mkt.sug4')]
                : [t('ch.sug1'), t('ch.sug2'), t('ch.sug3'), t('ch.sug4'), t('ch.sugOrder')]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-[11px] border rounded-full px-3 py-1 bg-card hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-2.5 border-t flex gap-2 bg-card shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'marketer' ? t('mkt.placeholder') : t('ch.agentPlaceholder')}
              className="flex-1 text-base px-3 py-2 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-gold rounded-xl px-3 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              aria-label={t('ch.send')}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* ===== Floating stack (left) — WhatsApp ABOVE the AI bubble ===== */}
      <div className="float-stack fixed bottom-4 left-3 sm:left-4 z-50 flex flex-col gap-2.5 transition-transform duration-200">
        {/* WhatsApp — founder-requested: sits above the AI bubble */}
        <a
          href={waHref(brand.whatsapp, lang === 'en' ? 'Hi Mahal Shop, I have a question 🙏' : 'هلا محل شوب، عندي استفسار 🙏')}
          target="_blank"
          rel="noopener noreferrer"
          className="h-[52px] w-[52px] rounded-full bg-green-600 hover:bg-green-500 shadow-lg flex items-center justify-center transition-colors"
          aria-label={lang === 'en' ? 'Chat on WhatsApp' : 'تواصل معنا على واتساب'}
          title="WhatsApp"
        >
          <WhatsAppIcon className="h-7 w-7 text-white" />
        </a>

        <button
          onClick={() => setChatOpen((v) => !v)}
          className="relative h-[52px] w-[52px] rounded-full btn-gold shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          aria-label={mode === 'marketer' ? t('mkt.title') : t('ch.agentTitle')}
          title={mode === 'marketer' ? t('mkt.sub') : t('ch.agentSub')}
        >
          {chatOpen ? <X className="h-6 w-6" /> : mode === 'marketer' ? <Bot className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          {!chatOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 px-1 flex items-center">
              AI
            </span>
          )}
        </button>
      </div>
    </>
  );
}
