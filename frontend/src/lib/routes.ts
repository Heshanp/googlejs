export const ROUTES = {
  // Public routes
  HOME: '/',
  SEARCH: '/search',
  CATEGORIES: '/categories',
  CATEGORY: (slug: string) => `/category/${slug}`,
  LISTING: (id: string) => `/listing/${id}`,
  USER_PROFILE: (id: string) => `/profile/${id}`, // Public profile path

  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_EMAIL: '/verify-email',

  // Protected routes
  SELL: '/sell',
  EDIT_LISTING: (id: string) => `/listing/${id}/edit`,
  MESSAGES: '/messages',
  CONVERSATION: (id: string) => `/messages/${id}`,
  NOTIFICATIONS: '/notifications',

  // Profile routes
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  PROFILE_SETTINGS: '/profile/settings',
  ADMIN_MODERATION: '/admin/moderation',

  // Static pages
  ABOUT: '/about',
  HELP: '/help',
  SAFETY: '/safety',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  CONTACT: '/contact',
  PROPERTIES: '/properties',
  VEHICLES: '/vehicles',
};
