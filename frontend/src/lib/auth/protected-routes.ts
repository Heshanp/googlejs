const EXACT_PROTECTED_PATHS = new Set([
  '/sell',
  '/messages',
  '/notifications',
  '/profile',
  '/profile/edit',
  '/profile/settings',
  '/admin/moderation',
]);

const PREFIX_PROTECTED_PATHS = [
  '/messages/',
  '/admin/moderation/',
];

const PATTERN_PROTECTED_PATHS = [
  /^\/listing\/[^/]+\/edit$/,
];

export const normalizePathname = (pathname: string): string => {
  if (!pathname) return '/';
  if (pathname === '/') return pathname;
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

export const isPathProtected = (pathname: string): boolean => {
  const normalizedPath = normalizePathname(pathname);

  if (EXACT_PROTECTED_PATHS.has(normalizedPath)) {
    return true;
  }

  if (PREFIX_PROTECTED_PATHS.some((prefix) => normalizedPath.startsWith(prefix))) {
    return true;
  }

  return PATTERN_PROTECTED_PATHS.some((pattern) => pattern.test(normalizedPath));
};

export const isAdminPath = (pathname: string): boolean => {
  const normalizedPath = normalizePathname(pathname);
  return normalizedPath === '/admin/moderation' || normalizedPath.startsWith('/admin/moderation/');
};
