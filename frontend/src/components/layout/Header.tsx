'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { useUnreadCount } from '../../hooks/useMessages';
import { useNotifications } from '../../hooks/useNotifications';
import { LocationsService, NZCity } from '../../services/locations.service';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown';
import { AuthModal } from '../features/auth/AuthModal';
import { ROUTES } from '../../lib/routes';
import { cn } from '../../lib/utils';
import { ALL_NZ_LOCATION_LABEL, HEADER_LOCATION_STORAGE_KEY } from '../../lib/search/location-preference';
import { buildSearchUrlFromQuery } from '../../lib/search/build-search-url';
import { VisionSearchButton } from '../features/search/VisionSearchButton';
import { Search, MapPin, Heart, Bell, Plus, User, LogOut, Settings, Shield, Check, ChevronDown, MessageCircle } from 'lucide-react';

const ALL_NZ_LABEL = ALL_NZ_LOCATION_LABEL;
const ALL_NZ_OPTION: NZCity = { name: ALL_NZ_LABEL, region: 'Nationwide', population: 0 };

export const Header: React.FC = () => {
  const { searchQuery: storeSearchQuery, isAuthModalOpen, closeAuthModal, openAuthModal } = useStore();
  const { isAuthenticated, user, logout } = useAuth();
  const { navigate, navigateWithAuth, searchParams } = useNavigation();
  const unreadCount = useUnreadCount();
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  // const [isSearchOpen, setIsSearchOpen] = useState(false); // Deprecated in favor of inline search
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState(storeSearchQuery || '');
  const [selectedCity, setSelectedCity] = useState(ALL_NZ_LABEL);
  const [cityOptions, setCityOptions] = useState<NZCity[]>([]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [accountSearchStyle, setAccountSearchStyle] = useState<React.CSSProperties | null>(null);
  const isSearchAligned = pathname?.startsWith('/profile') || pathname?.startsWith('/messages');

  // Hide header search on landing page and marketplace search page
  const showSearch = pathname !== '/' && pathname !== '/search';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedCity = window.localStorage.getItem(HEADER_LOCATION_STORAGE_KEY);
    if (storedCity) {
      setSelectedCity(storedCity);
      return;
    }

    if (user?.location?.city) {
      setSelectedCity(user.location.city);
    }
  }, [user?.location?.city]);

  useEffect(() => {
    const urlQuery = searchParams.get('original') || searchParams.get('q') || '';
    setSearchQuery(urlQuery);
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    LocationsService.getMajorCities(120)
      .then((cities) => {
        if (!isMounted) return;
        setCityOptions(cities);
      })
      .catch(() => {
        if (!isMounted) return;
        setCityOptions([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleCities = useMemo(() => {
    const fallbackCities: NZCity[] = selectedCity === ALL_NZ_LABEL
      ? [ALL_NZ_OPTION]
      : [ALL_NZ_OPTION, { name: selectedCity, region: 'New Zealand', population: 0 }];
    const sourceCities = cityOptions.length > 0 ? cityOptions : fallbackCities;
    const allCities = [ALL_NZ_OPTION, ...sourceCities];

    const dedupedMap = new Map<string, NZCity>();
    for (const city of allCities) {
      const key = city.name.trim().toLowerCase();
      if (!key) continue;
      if (!dedupedMap.has(key)) dedupedMap.set(key, city);
    }
    const dedupedCities = Array.from(dedupedMap.values());

    const q = locationSearchQuery.trim().toLowerCase();
    if (!q) return dedupedCities;

    const filtered = dedupedCities.filter((city) =>
      city.name.toLowerCase().includes(q) || city.region.toLowerCase().includes(q)
    );
    if (!filtered.some((city) => city.name === ALL_NZ_LABEL)) {
      filtered.unshift(ALL_NZ_OPTION);
    }
    return filtered;
  }, [cityOptions, locationSearchQuery, selectedCity]);

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setIsLocationOpen(false);
    setLocationSearchQuery('');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HEADER_LOCATION_STORAGE_KEY, cityName);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const runSearch = (rawQuery: string) => {
    const normalizedQuery = rawQuery.trim();
    if (!normalizedQuery) return;
    navigate(buildSearchUrlFromQuery(normalizedQuery));
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    runSearch(searchQuery);
  };

  const handleOpenFavorites = () => {
    const favoritesPath = `${ROUTES.PROFILE}?tab=favorites`;
    if (isAuthenticated) {
      navigate(favoritesPath);
      return;
    }
    openAuthModal({ tab: 'login', returnUrl: favoritesPath });
  };

  const brand = (
    <Link ref={brandRef} href={ROUTES.HOME} className="flex items-center gap-3 group">
      <span className="font-display font-bold text-2xl tracking-tight text-neutral-900 dark:text-white">
        Justsell<span className="text-accent">.</span>
      </span>
    </Link>
  );

  useEffect(() => {
    if (!isSearchAligned || !showSearch) {
      setAccountSearchStyle(null);
      return;
    }

    const updatePosition = () => {
      const brandEl = brandRef.current;
      if (!brandEl) return;

      // Both profile and messages pages use `container mx-auto max-w-7xl px-4`.
      // Content left = centering offset + 16px padding.
      const vw = document.documentElement.clientWidth;
      const contentLeft = Math.max(0, (vw - 1280) / 2) + 16;

      const brandRight = brandEl.getBoundingClientRect().right;
      const flexGap = 32; // gap-8
      const extraMargin = Math.max(0, contentLeft - (brandRight + flexGap));

      setAccountSearchStyle(prev => {
        if (prev && (prev as Record<string, number>).marginLeft === extraMargin) return prev;
        return { marginLeft: extraMargin };
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isSearchAligned, showSearch]);

  const searchBar = (
    <div
      className={cn(
        'hidden md:flex flex-1 max-w-2xl relative group transition-opacity duration-300',
        isSearchAligned && accountSearchStyle !== null && 'lg:max-w-none',
        showSearch ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={isSearchAligned ? accountSearchStyle ?? undefined : undefined}
    >
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-accent transition-colors" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearch}
        className="w-full rounded-full py-3.5 pl-12 pr-14 text-sm transition-all shadow focus:outline-none focus:ring-4 focus:ring-accent/10 bg-white/80 border border-app-color text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-accent/50 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/50"
        placeholder="Try 'vintage leather jacket' or 'cozy reading chair'..."
      />
      <div className="absolute inset-y-0 right-2 flex items-center">
        <VisionSearchButton
          size="sm"
          variant="default"
          onDetectedQuery={(query) => {
            setSearchQuery(query);
            runSearch(query);
          }}
        />
      </div>
    </div>
  );

  const actions = (
    <div ref={actionsRef} className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden lg:block" ref={locationMenuRef}>
              <button
                type="button"
                onClick={() => setIsLocationOpen((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100/60 dark:hover:bg-white/5"
              >
                <MapPin className="w-4 h-4 text-accent" />
                <span>{selectedCity === ALL_NZ_LABEL ? ALL_NZ_LABEL : `${selectedCity}, NZ`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLocationOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-app-color bg-white dark:bg-neutral-900 shadow p-2 z-50">
                  <div className="px-2 pb-2 border-b border-app-color">
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      placeholder="Search city..."
                      className="w-full rounded-lg bg-neutral-50 dark:bg-neutral-800 py-2 px-3 text-sm text-neutral-800 dark:text-neutral-200 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-accent/30"
                    />
                  </div>

                  <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
                    {visibleCities.map((city) => (
                      <button
                        key={city.name}
                        type="button"
                        onClick={() => handleCitySelect(city.name)}
                        className={`flex items-center justify-between w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedCity === city.name
                            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                            : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{city.name}</p>
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{city.region || 'New Zealand'}</p>
                        </div>
                        {selectedCity === city.name && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                      </button>
                    ))}

                    {visibleCities.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        No cities found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-neutral-200/60 dark:bg-white/10 hidden lg:block"></div>

            <button
              aria-label="Liked listings"
              onClick={handleOpenFavorites}
              className="relative p-3 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100/60 dark:hover:bg-white/5 transition-colors group"
            >
              <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button className="relative p-3 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100/60 dark:hover:bg-white/5 transition-colors group" onClick={() => navigateWithAuth(ROUTES.NOTIFICATIONS)}>
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-accent rounded-full ring-2 ring-white dark:ring-black"></span>
              )}
            </button>
            <button
              className="relative p-3 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100/60 dark:hover:bg-white/5 transition-colors group"
              onClick={() => navigateWithAuth(ROUTES.MESSAGES)}
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-accent rounded-full ring-2 ring-white dark:ring-black"></span>
              )}
            </button>

            <Link
              href={ROUTES.SELL}
              onClick={(event) => {
                event.preventDefault();
                navigateWithAuth(ROUTES.SELL);
              }}
              className="hidden sm:flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-full font-display font-bold text-sm hover:bg-neutral-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Sell Item</span>
            </Link>

            {isAuthenticated && user ? (
              <Dropdown
                trigger={
                  <button aria-label="Account menu" className="ml-2 w-10 h-10 rounded-full bg-white/80 dark:bg-zinc-800 border border-app-color flex items-center justify-center text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/30 transition-all hover:scale-105 group">
                    <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                }
              >
                <div className="p-1 min-w-[200px]">
                  <div className="px-3 py-2 border-b border-app-color mb-1">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                  </div>
                  <DropdownItem onClick={() => navigate(ROUTES.PROFILE)}>
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownItem>
                  <DropdownItem onClick={() => navigate(ROUTES.PROFILE_SETTINGS)}>
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownItem>
                  {user.isAdmin && (
                    <DropdownItem onClick={() => navigate(ROUTES.ADMIN_MODERATION)}>
                      <Shield className="w-4 h-4 mr-2" /> Moderation
                    </DropdownItem>
                  )}
                  <DropdownDivider />
                  <DropdownItem onClick={handleLogout} className="text-red-500 hover:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownItem>
                </div>
              </Dropdown>
            ) : (
              <button
                onClick={() => openAuthModal({ tab: 'login' })}
                className="ml-2 w-10 h-10 rounded-full bg-white/80 dark:bg-zinc-800 border border-app-color flex items-center justify-center text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/30 transition-all hover:scale-105 group"
              >
                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
  );

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 w-full z-50 backdrop-blur-xl border-b bg-white/70 dark:bg-black/60 border-app-color"
        id="navbar"
      >
        <div className="max-w-[1800px] mx-auto px-4 lg:px-8 h-[var(--app-header-height)] flex items-center justify-between gap-8">
          {brand}
          {searchBar}
          {actions}
        </div>
      </nav>

      {/* Keep AuthModal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
    </>
  );
};
