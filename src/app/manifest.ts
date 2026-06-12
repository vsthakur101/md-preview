import type { MetadataRoute } from 'next';

/**
 * Installable web-app manifest. Offline reading is handled by public/sw.js
 * (network-first; previously-visited articles work offline).
 * Colors mirror the warm design tokens in globals.css.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'md-preview — reading platform',
    short_name: 'md-preview',
    description:
      'Upload markdown, build a library, and read long-form in a retention-optimized reader.',
    start_url: '/library',
    display: 'standalone',
    background_color: '#faf8f2',
    theme_color: '#b87a2e',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
