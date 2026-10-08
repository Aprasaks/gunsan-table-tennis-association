import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '군산시탁구협회',
    short_name: '군산시탁구협회',
    description: '군산시탁구협회 공식 홈페이지',
    lang: 'ko',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#092944',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
