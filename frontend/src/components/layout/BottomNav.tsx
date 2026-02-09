'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigation } from '../../hooks/useNavigation';
import { ROUTES } from '../../lib/routes';

export const BottomNav: React.FC = () => {
  const { navigateWithAuth, currentPath } = useNavigation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: ROUTES.HOME, exact: true },
    { id: 'explore', label: 'Explore', icon: Search, path: ROUTES.CATEGORIES, exact: false },
    { id: 'sell', label: 'Sell', icon: PlusCircle, isPrimary: true, path: ROUTES.SELL, requireAuth: true },
    { id: 'messages', label: 'Chat', icon: MessageCircle, path: ROUTES.MESSAGES, requireAuth: true },
    { id: 'profile', label: 'Profile', icon: User, path: ROUTES.PROFILE, requireAuth: true },
  ];

  const handleNav = (e: React.MouseEvent, path: string, requireAuth?: boolean) => {
    if (requireAuth) {
      e.preventDefault();
      navigateWithAuth(path);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-lg border-t border-app-color pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          // Determine active state
          let isActive = false;
          if (item.exact) {
            isActive = currentPath === item.path;
          } else {
            isActive = currentPath.startsWith(item.path);
          }

          // Specific override for profile vs login
          if (item.id === 'profile' && (currentPath === ROUTES.LOGIN || currentPath === ROUTES.REGISTER)) {
            isActive = true;
          }

          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={(e) => handleNav(e, item.path, item.requireAuth)}
                className="flex flex-col items-center justify-center -mt-8"
              >
                <div className="w-14 h-14 bg-primary-600 rounded-2xl shadow flex items-center justify-center text-white transform active:scale-95 transition-transform rotate-3 hover:rotate-0 duration-300">
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-neutral-600 dark:text-neutral-400">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              onClick={(e) => handleNav(e, item.path, item.requireAuth)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50",
                isActive ? "text-primary-600 dark:text-primary-400" : "text-neutral-400 dark:text-neutral-500"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
