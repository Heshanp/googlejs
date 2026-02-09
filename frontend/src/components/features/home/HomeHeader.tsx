'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../../../store/useStore';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../hooks/useNavigation';
import { Avatar } from '../../ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '../../ui/Dropdown';
import { cn } from '../../../lib/utils';
import { ROUTES } from '../../../lib/routes';

export const HomeHeader: React.FC = () => {
  const { openAuthModal } = useStore();
  const { isAuthenticated, user, logout } = useAuth();
  const { navigate, navigateWithAuth } = useNavigation();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const navItems = [
    { label: 'Marketplace', icon: 'solar:home-smile-bold-duotone', path: ROUTES.HOME, activeColor: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' },
    { label: 'Properties', icon: 'solar:buildings-2-bold-duotone', path: ROUTES.PROPERTIES, activeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Vehicles', icon: 'solar:wheel-bold-duotone', path: ROUTES.VEHICLES, activeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10">
              <div className="absolute w-8 h-8 bg-neutral-800 dark:bg-white rounded-full opacity-20 group-hover:scale-110 transition-transform" />
              <div className="absolute w-6 h-6 bg-neutral-900 dark:bg-white rounded-full opacity-40 -translate-x-1 translate-y-1" />
              <div className="relative w-8 h-8 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-neutral-900 shadow-lg">
                <Icon icon="solar:widget-2-bold-duotone" className="w-4 h-4" />
              </div>
            </div>
            <span className="font-bold text-2xl tracking-tight text-neutral-900 dark:text-white">
              Justsell
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="hidden md:flex bg-white dark:bg-neutral-900 rounded-full p-1.5 shadow-sm border border-app-color">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                href={item.path}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
                  isActive
                    ? item.activeColor
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                <Icon icon={item.icon} className={cn("w-4 h-4", isActive && "text-current")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* List Item Button */}
          <Link
            href={ROUTES.SELL}
            onClick={(event) => {
              event.preventDefault();
              navigateWithAuth(ROUTES.SELL);
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2 mr-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-bold text-sm hover:opacity-90 transition-opacity shadow"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
            List item
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mr-2">
            <button
              aria-label="Messages"
              onClick={() => navigateWithAuth(ROUTES.MESSAGES)}
              className="w-11 h-11 rounded-full bg-white dark:bg-neutral-900 border border-app-color flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm group"
            >
              <Icon icon="solar:chat-line-bold-duotone" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              aria-label="Notifications"
              onClick={() => navigateWithAuth(ROUTES.NOTIFICATIONS)}
              className="w-11 h-11 rounded-full bg-white dark:bg-neutral-900 border border-app-color flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm group relative"
            >
              <Icon icon="solar:bell-bing-bold-duotone" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-3 right-3.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900" />
            </button>
          </div>

          {/* Profile Section */}
          {isAuthenticated && user ? (
            <Dropdown
              trigger={
                <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                  <div className="relative">
                    <Avatar
                      src={user.avatar}
                      fallback={user.name?.[0] || '?'}
                      className="w-11 h-11 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none group-hover:text-primary-600 transition-colors">{user.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">{user.email}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-down-bold-duotone" className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors hidden lg:block" />
                </div>
              }
            >
              <div className="p-1">
                <DropdownItem onClick={() => navigate(ROUTES.PROFILE)}>
                  <Icon icon="solar:user-circle-bold-duotone" className="w-4 h-4 mr-2" /> Profile
                </DropdownItem>
                <DropdownItem onClick={() => navigate(ROUTES.PROFILE + '?tab=favorites')}>
                  <Icon icon="solar:heart-bold-duotone" className="w-4 h-4 mr-2" /> Liked
                </DropdownItem>
                <DropdownItem onClick={() => navigate(ROUTES.PROFILE_SETTINGS)}>
                  <Icon icon="solar:settings-bold-duotone" className="w-4 h-4 mr-2" /> Settings
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={handleLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Icon icon="solar:logout-2-bold-duotone" className="w-4 h-4 mr-2" /> Logout
                </DropdownItem>
              </div>
            </Dropdown>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal({ tab: 'login' })}
                className="px-5 py-2.5 rounded-full font-bold text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal({ tab: 'register' })}
                className="px-6 py-2.5 rounded-full font-bold text-sm bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity shadow"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
