'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, Palette, Settings, ShieldCheck, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ROUTES } from '../../lib/routes';
import { PageShell } from './PageShell';

export type NavItemId = 'profile' | 'general' | 'notifications' | 'appearance' | 'privacy';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AccountLayoutProps {
  title: string;
  description?: string;
  activeNav: NavItemId;
  breadcrumb?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const navSections = [
  {
    title: 'Account',
    items: [
      { id: 'profile' as const, label: 'Profile', href: ROUTES.PROFILE, icon: User },
    ],
  },
  {
    title: 'App Settings',
    items: [
      { id: 'general' as const, label: 'General', href: ROUTES.PROFILE_SETTINGS, icon: Settings },
      { id: 'notifications' as const, label: 'Notifications', href: `${ROUTES.PROFILE_SETTINGS}#notifications`, icon: Bell },
      { id: 'appearance' as const, label: 'Appearance', href: `${ROUTES.PROFILE_SETTINGS}#appearance`, icon: Palette },
      { id: 'privacy' as const, label: 'Privacy & Security', href: `${ROUTES.PROFILE_SETTINGS}#privacy`, icon: ShieldCheck },
    ],
  },
];

export function AccountLayout({
  title,
  description,
  activeNav,
  breadcrumb,
  showBreadcrumbs = true,
  children,
  footer,
}: AccountLayoutProps) {
  const crumbs = breadcrumb ?? [
    { label: 'Home', href: ROUTES.HOME },
    { label: title },
  ];

  return (
    <PageShell className="bg-gray-50 dark:bg-neutral-950">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 right-[-10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%)]" />
          <div className="absolute bottom-[-20%] left-[-10%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.14),_transparent_65%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.12),_transparent_60%)]" />
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-4 relative">
          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-5 lg:sticky lg:top-[calc(var(--app-header-offset)+24px)] lg:self-start lg:max-h-[calc(100vh-var(--app-header-offset)-48px)] lg:overflow-auto">
              <div data-account-sidebar className="rounded-3xl border border-app-color bg-white dark:bg-neutral-900 p-4 shadow">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-5 last:mb-0">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                      {section.title}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 md:flex-col">
                      {section.items.map((item) => {
                        const isActive = activeNav === item.id;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition',
                              isActive
                                ? 'bg-neutral-900 text-white shadow dark:bg-white/10 dark:text-white'
                                : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-neutral-800/60'
                            )}
                          >
                            <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400')} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="space-y-6 pt-2">
              <div className="space-y-3">
                {showBreadcrumbs && (
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                    {crumbs.map((item, index) => (
                      <React.Fragment key={`${item.label}-${index}`}>
                        {item.href ? (
                          <Link href={item.href} className="hover:text-gray-600 dark:hover:text-gray-300 transition">
                            {item.label}
                          </Link>
                        ) : (
                          <span>{item.label}</span>
                        )}
                        {index < crumbs.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {description && (
                  <p className="text-base text-gray-500 dark:text-gray-400 max-w-2xl">
                    {description}
                  </p>
                )}
              </div>

              {children}

              {footer && (
                <div className="pt-6 border-t border-app-color">
                  {footer}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
