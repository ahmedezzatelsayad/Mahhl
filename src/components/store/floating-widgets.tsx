'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Store, WhatsAppIcon } from '@/components/store/icons';
import { useAppStore } from '@/lib/stores/app-store';
import { useBrand, waHref } from '@/components/store/header';
import { formatKwd } from '@/lib/utils/format';

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
}

const WELCOME: Msg = {
  role: 'assistant',
  content:
    'هلا والله! 👋 أنا «المحل» — مساعدك الذكي في محل شوب.\nاكتب لي شنو تدور عليه (مثلاً: ساعة رجالية، لعبة للأطفال، عطر) وأجيبه لك بأحسن سعر 🛒',
};

export function FloatingWidgets() {
  const brand = useBrand();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openProduct = useAppStore((s) => s.openProduct);

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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next
            .filter((m) => m !== WELCOME)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, products: data.products || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'صار خطأ بسيط بالاتصال.. جرّب مرة ثانية بعد شوي 🙏',
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
          aria-label="تحدث مع المحل"
          style={{ height: 'min(520px, calc(100vh - 120px))' }}
        >
          {/* header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full btn-gold">
                <Store className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-sm leading-tight">تحدث مع المحل</p>
                <p className="text-[11px] text-primary-foreground/60 leading-tight">
                  اكتب اللي تدور عليه — نجيبه لك
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 rounded-lg hover:bg-primary-foreground/10 cursor-pointer"
              aria-label="إغلاق المحادثة"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* messages — small clear font */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
                <div className="max-w-[85%]">
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
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="chat-text-sm rounded-2xl bg-card border px-4 py-2 text-muted-foreground">
                  أدور لك... ⏳
                </div>
              </div>
            )}
          </div>

          {/* quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {['عطور', 'ساعات', 'لعبة أطفال', 'إكسسوارات موبايل'].map((s) => (
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
              placeholder="اكتب اللي تدور عليه..."
              className="flex-1 text-base px-3 py-2 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-gold rounded-xl px-3 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              aria-label="إرسال"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* ===== Floating buttons ===== */}
      <div className="float-stack fixed bottom-4 left-3 sm:left-4 z-50 flex flex-col gap-2.5 transition-transform duration-200">
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="relative h-[52px] w-[52px] rounded-full btn-gold shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          aria-label="تحدث مع المحل"
          title="تحدث مع المحل — تلقى اللي تدور عليه"
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          {!chatOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 px-1 flex items-center">
              AI
            </span>
          )}
        </button>
      </div>

      <div className="float-stack fixed bottom-4 right-3 sm:right-4 z-50 transition-transform duration-200">
        <a
          href={waHref(brand.whatsapp, 'هلا محل شوب، عندي استفسار 🙏')}
          target="_blank"
          rel="noopener noreferrer"
          className="h-[52px] w-[52px] rounded-full bg-green-600 hover:bg-green-500 shadow-lg flex items-center justify-center transition-colors"
          aria-label="تواصل معنا على واتساب"
          title="تواصل واتساب"
        >
          <WhatsAppIcon className="h-7 w-7 text-white" />
        </a>
      </div>
    </>
  );
}
