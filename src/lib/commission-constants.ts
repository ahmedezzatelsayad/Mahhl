'use client';

/**
 * Small client-safe constants extracted from create-order.ts (which imports
 * server-only modules). Keep in sync if the governorates list changes.
 */
export const KUWAIT_GOVERNORATES = [
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
] as const;
