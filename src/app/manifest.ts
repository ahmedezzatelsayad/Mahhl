import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'محل شوب — منصة دروب شيبنج في الكويت',
    short_name: 'محل شوب',
    description:
      'منصة دروب شيبنج في الكويت: سوّق أكثر من 2600 منتج بعمولة مقترحة من 1 إلى 10 د.ك على كل منتج وإنت تختار عمولتك — توصيل سريع لكل المحافظات ودفع عند الاستلام.',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar-KW',
    background_color: '#FAFAF9',
    theme_color: '#1C1917',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
