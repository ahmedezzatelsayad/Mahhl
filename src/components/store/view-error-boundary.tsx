'use client';

/**
 * ViewErrorBoundary — recovers from a crash in a single storefront view
 * WITHOUT killing the whole app shell (header/cart/footer stay alive).
 * Shows a friendly AR/EN card with retry + back-home, and auto-resets
 * the route to the homepage so the visitor is never stuck.
 */
import { Component, type ReactNode } from 'react';
import { readLang } from '@/lib/stores/lang-store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[mahhl] view crashed, recovering:', error?.message);
  }

  private goHome() {
    // hard navigation clears all client state safely
    window.location.href = '/';
  }

  private retry() {
    this.setState({ hasError: false });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const en = readLang() === 'en';
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="max-w-sm w-full text-center space-y-5 card-lift rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl" aria-hidden>
            ⚠️
          </div>
          <h2 className="text-lg font-extrabold">
            {en ? 'This section hit a snag' : 'واجه هذا القسم مشكلة'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {en
              ? 'Your cart is safe. Try again or continue shopping from the homepage.'
              : 'سلتك بأمان. جرّب مرة أخرى أو أكمل التسوق من الرئيسية.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.retry()}
              className="btn-gold px-4 py-2 rounded-lg text-sm font-bold cursor-pointer"
            >
              {en ? 'Try again' : 'إعادة المحاولة'}
            </button>
            <button
              onClick={() => this.goHome()}
              className="px-4 py-2 rounded-lg text-sm font-bold border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {en ? 'Homepage' : 'الرئيسية'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
