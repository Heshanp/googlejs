import React from 'react';
import Link from 'next/link';
import { ROUTES } from '../../lib/routes';
import { Icon } from '@iconify/react';

const linkClasses =
  'inline-flex text-base leading-[1.8] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200 font-sans';

const headingClasses =
  'font-display text-sm font-semibold uppercase tracking-[0.08em] text-neutral-900 dark:text-neutral-100';

const sections: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: 'Platform',
    links: [
      { label: 'How it works', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Trust & Safety', href: '#' },
      { label: 'Sellers', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: ROUTES.ABOUT },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Press', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Centre', href: '#' },
      { label: 'Contact Us', href: ROUTES.CONTACT },
      { label: 'Privacy Policy', href: ROUTES.PRIVACY },
      { label: 'Terms of Service', href: ROUTES.TERMS },
    ],
  },
];

const socialLinks: Array<{ label: string; href: string; icon: string }> = [
  { label: 'Twitter', href: '#', icon: 'lucide:twitter' },
  { label: 'Instagram', href: '#', icon: 'lucide:instagram' },
  { label: 'LinkedIn', href: '#', icon: 'lucide:linkedin' },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-app-color bg-white dark:bg-neutral-950">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="py-4">
          <div className="mx-auto max-w-3xl text-center">
            <Link href={ROUTES.HOME} className="inline-flex items-center">
              <span className="font-display text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Justsell<span className="text-accent">.</span>
              </span>
            </Link>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400 font-sans font-normal">
              The search-first marketplace for curated goods. Find exactly what you want,
              when you want it.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-16">
            {sections.map((section, index) => (
              <div
                key={section.title}
                className={
                  index === 0
                    ? 'text-center lg:justify-self-start'
                    : index === 1
                      ? 'text-center lg:justify-self-center'
                      : 'text-center lg:justify-self-end'
                }
              >
                <h4 className={headingClasses}>{section.title}</h4>
                <ul className="mt-7 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={linkClasses}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="py-8 border-t border-app-color">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-sans">
              &copy; {currentYear} Justsell Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100 transition-colors duration-200"
                  aria-label={item.label}
                >
                  <Icon icon={item.icon} className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
