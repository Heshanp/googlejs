'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SITE_CONFIG, constructTitle, constructCanonical } from '../../lib/seo';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noindex?: boolean;
  children?: React.ReactNode;
}

export const Seo: React.FC<SeoProps> = ({
  title,
  description = SITE_CONFIG.defaultDescription,
  image,
  type = 'website',
  noindex = false,
  children
}) => {
  const pathname = usePathname();
  const fullTitle = constructTitle(title);
  const canonicalUrl = constructCanonical(pathname);
  const ogImage = image || `${SITE_CONFIG.domain}/og-default.jpg`;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, attr = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update link tag
    const setLink = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Basic Meta
    setMeta('description', description);
    if (noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow');
    }

    // Canonical
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:site_name', SITE_CONFIG.name, 'property');
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', type, 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:image', ogImage, 'property');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

  }, [fullTitle, description, canonicalUrl, ogImage, type, noindex]);

  return <>{children}</>; // Render children (like JsonLd) if any
};