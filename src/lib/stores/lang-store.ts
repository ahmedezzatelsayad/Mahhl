'use client';

/**
 * Language store — AR (default) / EN, persisted.
 * Switching performs a controlled reload so every view + API refetches
 * in the new language and <html dir> flips RTL/LTR atomically.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'ar' | 'en';

interface LangState {
  lang: Lang;
  /** switch language, persist, then reload so all data refetches localized */
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'ar',
      setLang: (l) => {
        // zustand persist already writes the storage atom on set() —
        // do NOT write a raw value here: it would corrupt the JSON and
        // the rehydrate after reload would silently fall back to Arabic.
        set({ lang: l });
        try {
          // belt-and-braces: make sure the persisted JSON is in place
          localStorage.setItem(
            'mahhl-lang',
            JSON.stringify({ state: { lang: l }, version: 0 })
          );
          window.location.reload();
        } catch {
          /* noop */
        }
      },
    }),
    { name: 'mahhl-lang' }
  )
);

/** server-safe read of the persisted language (default ar) */
export function readLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const raw = localStorage.getItem('mahhl-lang');
    if (!raw) return 'ar';
    if (raw === 'en' || raw === 'ar') return raw; // legacy raw format
    const parsed = JSON.parse(raw) as { state?: { lang?: Lang } };
    return parsed?.state?.lang === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

/** append &lang=en to an API url when the visitor browses in English */
export function langParam(): string {
  return readLang() === 'en' ? '&lang=en' : '';
}
