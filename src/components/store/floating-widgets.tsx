'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Store, WhatsAppIcon, PackageSearch, Trash2 } from '@/components/store/icons';
import { useAppStore } from '@/lib/stores/app-store';
import { useBrand, waHref } from '@/components/store/header';
import { formatKwd } from '@/lib/utils/format';
import { useT } from '@/lib/i18n';

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

/** order draft the AI agent builds with the customer (travels with every request) */
interface AgentDraft {
  items: { productId: string; qty: number }[];
  name?: string;
  phone?: string;
  governorate?: string;
  area?: string;
  address?: string;
  notes?: string;
  placedOrder?: {
    orderNumber: string;
    total: number;
    phone: string;
    itemCount: number;
  } | null;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  /** receipt card rendered inside the chat after a successful AI order */
  placedOrder?: AgentDraft['placedOrder'];
}

export function FloatingWidgets() {
  const brand = useBrand();
  const { t, lang } = useT();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: t('ch.agentWelcome') },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** agent order draft — server re-validates it on every turn */
  const draftRef = useRef<AgentDraft>({ items: [] });
  const scrollRef = useRef<HTMLDivElement>(null);
  const openProduct = useAppStore((s) => s.openProduct);
  const setView = useAppStore((s) => s.setView);
  const setTrackPrefill = useAppStore((s) => s.setTrackPrefill);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chatOpen, busy]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          messages: next
            .slice(1)
            .map((m) => ({ role: m.role, content: m.content })),
          draft: draftRef.current,
          customerConfirmed: /^(نعم|ايوا|أيوا|اكد|أكد|تأكيد|موافق|ok|yes|confirm)/i.test(q),
          /** chips from the previous assistant reply — lets the agent add
           *  them to the order when the customer says "أبغيه" next turn */
          lastOfferedIds: [...next]
            .reverse()
            .find((m) => m.role === 'assistant' && m.products?.length)
            ?.products?.map((p) => p.id) || [],
        }),
      });
      const data = await res.json();
      // server is the source of truth for the draft
      if (data.draft) draftRef.current = data.draft;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          products: data.products || [],
          placedOrder: data.placedOrder || null,
        },
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

  /** remove a product from the agent draft (customer edits the order in-chat) */
  function removeDraftItem(id: string) {
    draftRef.current = {
      ...draftRef.current,
      items: draftRef.current.items.filter((i) => i.productId !== id),
    };
    const summary = draftRef.current.items
      .map((i) => `• ${i.productId} × ${i.qty}`)
      .join('\n');
    send(
      lang === 'en'
        ? `(remove product ${id} from my order draft. Current draft:\n${summary})`
        : `(احذف المنتج ${id} من مسودة طلبي. المسودة الحالية:\n${summary})`
    );
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
          {/* header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full btn-gold">
                <Store className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-sm leading-tight">{t('ch.agentTitle')}</p>
                <p className="text-[11px] text-primary-foreground/70 leading-tight flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('ch.agentSub')}
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

                  {/* order receipt card — order link + account + tracking */}
                  {m.placedOrder && (
                    <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-2.5">
                      <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <PackageSearch className="h-4 w-4" />
                        {lang === 'en' ? 'Order placed' : 'تم تسجيل طلبك'} — {m.placedOrder.orderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {lang === 'en'
                          ? `${m.placedOrder.itemCount} item(s) · ${formatKwd(m.placedOrder.total)} · COD`
                          : `${m.placedOrder.itemCount} منتج · ${formatKwd(m.placedOrder.total)} · دفع عند الاستلام`}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setTrackPrefill({
                              orderNumber: m.placedOrder!.orderNumber,
                              phone: m.placedOrder!.phone,
                            });
                            setView('track-order');
                            setChatOpen(false);
                          }}
                          className="btn-gold rounded-lg px-2 py-2 text-[11px] font-bold cursor-pointer"
                        >
                          {lang === 'en' ? 'Track order' : 'تتبع طلبك'}
                        </button>
                        <button
                          onClick={() => {
                            setView('account');
                            setChatOpen(false);
                          }}
                          className="rounded-lg px-2 py-2 text-[11px] font-bold border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          {lang === 'en' ? 'My account' : 'حسابي'}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {lang === 'en'
                          ? `Login: phone ${m.placedOrder.phone} · password = same number`
                          : `الدخول: هاتف ${m.placedOrder.phone} · كلمة المرور نفس الرقم`}
                      </p>
                    </div>
                  )}

                  {/* product chips */}
                  {m.products && m.products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2">
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
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={p.image} alt={p.name} className="h-full w-full img-contain p-1" loading="lazy" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Store className="h-6 w-6 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5">
                            <p className="text-[11px] font-medium line-clamp-1 text-foreground">{p.name}</p>
                            <p className="text-[11px] font-bold text-gold-deep">{formatKwd(p.price)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* agent draft summary — the order being built in-chat */}
                  {m.role === 'assistant' && i === messages.length - 1 && draftRef.current.items.length > 0 && !m.placedOrder && (
                    <div className="mt-2 rounded-xl border bg-muted/40 p-2.5 space-y-1.5">
                      <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                        <PackageSearch className="h-3.5 w-3.5" />
                        {lang === 'en' ? 'Your order (in progress)' : 'طلبك (قيد الإعداد)'}
                      </p>
                      {draftRef.current.items.map((it) => (
                        <div key={it.productId} className="flex items-center justify-between gap-2">
                          <span className="text-[11px] truncate">
                            {m.products?.find((p) => p.id === it.productId)?.name ||
                              (lang === 'en' ? `Product ${it.productId}` : `منتج ${it.productId}`)}
                            <span className="text-muted-foreground"> × {it.qty}</span>
                          </span>
                          <button
                            onClick={() => removeDraftItem(it.productId)}
                            className="text-muted-foreground/60 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                            aria-label={lang === 'en' ? 'Remove' : 'حذف'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
              {[t('ch.sug1'), t('ch.sug2'), t('ch.sug3'), t('ch.sug4'), t('ch.sugOrder')].map((s) => (
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
              placeholder={t('ch.agentPlaceholder')}
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
          aria-label={t('ch.agentTitle')}
          title={t('ch.agentSub')}
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
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
