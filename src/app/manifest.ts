import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'محل شوب — متجر إلكتروني في الكويت',
    short_name: 'محل شوب',
    description:
      'أكثر من 2600 منتج بأسعار بالدينار الكويتي، دفع عند الاستلام، وتوصيل سريع لجميع محافظات الكويت.',
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
