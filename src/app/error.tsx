'use client';

/**
 * Root error boundary (App Router) — AR/EN graceful recovery UI.
 * Prevents the scary Next.js "Application error: a client-side exception
 * has occurred" screen: the visitor gets a friendly Arabic/English card
 * with retry + back-to-home actions instead of a dead page.
 */
import { useEffect } from 'react';
import { readLang } from '@/lib/stores/lang-store';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = readLang();
  const en = lang === 'en';

  useEffect(() => {
    // Surface the digest in console for debugging (never to the customer UI)
    console.error('[mahhl] view error boundary:', error?.digest || error?.message);
  }, [error]);

  return (
    <div
      dir={en ? 'ltr' : 'rtl'}
      lang={lang}
      className="min-h-screen flex items-center justify-center bg-background px-4"
    >
      <div className="max-w-md w-full text-center space-y-6 card-lift rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-amber-600"
            aria-hidden
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold">
            {en ? 'Something went wrong' : 'حدث خلل بسيط'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {en
              ? 'The page hit an unexpected issue. Your cart and data are safe — try again or head back to the homepage.'
              : 'الصفحة واجهت مشكلة غير متوقعة. سلتك وبياناتك بأمان — جرّب مرة أخرى أو ارجع للرئيسية.'}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-gold px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
          >
            {en ? 'Try again' : 'إعادة المحاولة'}
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg text-sm font-bold border bg-background hover:bg-muted/50 transition-colors"
          >
            {en ? 'Homepage' : 'الرئيسية'}
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          {en ? ' محل شوب — Mahhl Shop ' : ' محل شوب — Mahhl Shop '}
        </p>
      </div>
    </div>
  );
}
