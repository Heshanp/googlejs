import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { JsonLd } from './JsonLd';
import { SITE_CONFIG } from '../../lib/seo';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  // Generate JSON-LD structure
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_CONFIG.domain
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        "item": item.path ? `${SITE_CONFIG.domain}${item.path}` : undefined
      }))
    ]
  };

  return (
    <>
      <JsonLd data={structuredData} id="breadcrumbs-jsonld" />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex items-center text-xs md:text-sm text-gray-500 overflow-x-auto whitespace-nowrap no-scrollbar py-3.5">
          <li className="flex items-center first:pl-1">
            <Link href="/" className="hover:text-primary-600 flex items-center transition-colors">
              <Home className="w-3.5 h-3.5 mr-1" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              <ChevronRight className="w-3 h-3 mx-2 shrink-0 text-gray-400" />
              {item.path ? (
                <Link href={item.path} className="hover:text-primary-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-xs">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};