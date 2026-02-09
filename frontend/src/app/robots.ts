import { MetadataRoute } from 'next';
import { SITE_CONFIG } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/messages/',
        '/profile/edit/',
        '/profile/settings/',
        '/api/',
      ],
    },
    sitemap: `${SITE_CONFIG.domain}/sitemap.xml`,
  };
}