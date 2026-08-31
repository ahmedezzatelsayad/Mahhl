/**
 * Currency formatter for KWD — Kuwaiti convention: 3 decimal places (fils)
 * Every major Kuwaiti store (Talabat, Carrefour KW, Xcite, Ubuy) shows 3 decimals.
 */
export function formatKwd(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.ك`;
}

/** plain number only (server-side strings, no JSX) */
export function formatKwdPlain(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function truncate(s: string, n: number = 60): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trim() + '...';
}
