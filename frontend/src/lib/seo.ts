export const SITE_CONFIG = {
  name: 'Justsell',
  domain: 'https://justsell.co.nz',
  defaultTitle: 'Justsell.co.nz - Buy and Sell in New Zealand',
  defaultDescription: "New Zealand's marketplace for buying and selling. Find great deals on electronics, vehicles, fashion and more in your local area.",
  separator: '|',
  themeColor: '#0d9488', // primary-600
};

export function constructTitle(title?: string): string {
  if (!title) return SITE_CONFIG.defaultTitle;
  return `${title} ${SITE_CONFIG.separator} ${SITE_CONFIG.name}`;
}

export function constructCanonical(path: string): string {
  const cleanPath = path.split('?')[0];
  return `${SITE_CONFIG.domain}${cleanPath}`;
}

export function truncateDescription(desc: string, length = 160): string {
  if (!desc) return '';
  return desc.length > length ? `${desc.substring(0, length).trim()}...` : desc;
}
