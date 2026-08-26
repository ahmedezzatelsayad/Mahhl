/**
 * Currency formatter for KWD
 */
export function formatKwd(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} د.ك`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function truncate(s: string, n: number = 60): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trim() + '...';
}
