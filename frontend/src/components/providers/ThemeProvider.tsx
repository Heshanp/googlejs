'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { Theme, useStore } from '../../store/useStore';

const THEME_STORAGE_KEY = 'theme';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    return null;
  } catch {
    return null;
  }
}

function getPreferredSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getPreferredSystemTheme() : theme;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const didHydrate = useRef(false);

  useLayoutEffect(() => {
    const storedTheme = getStoredTheme();
    let mediaQuery: MediaQueryList | null = null;
    let handleChange: ((event: MediaQueryListEvent) => void) | null = null;

    // Hydrate once from storage (light is default) without clobbering saved values.
    if (!didHydrate.current) {
      didHydrate.current = true;
      const initialTheme = storedTheme ?? 'light';
      if (initialTheme !== theme) {
        setTheme(initialTheme);
        applyTheme(initialTheme);
        return () => undefined;
      }
    }

    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore write errors (private mode, disabled storage, etc.)
    }

    if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      handleChange = () => applyTheme('system');
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }
    }

    return () => {
      if (mediaQuery && handleChange) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      }
    };
  }, [theme, setTheme]);

  return <>{children}</>;
}
