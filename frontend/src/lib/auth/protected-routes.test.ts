import { describe, expect, it } from 'vitest';
import { isAdminPath, isPathProtected, normalizePathname } from './protected-routes';

describe('protected-routes', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizePathname('/sell/')).toBe('/sell');
    expect(normalizePathname('/')).toBe('/');
  });

  it('matches exact protected paths', () => {
    expect(isPathProtected('/sell')).toBe(true);
    expect(isPathProtected('/profile')).toBe(true);
    expect(isPathProtected('/notifications')).toBe(true);
  });

  it('matches nested protected paths', () => {
    expect(isPathProtected('/messages/123')).toBe(true);
    expect(isPathProtected('/admin/moderation/users')).toBe(true);
    expect(isPathProtected('/listing/abc123/edit')).toBe(true);
  });

  it('does not match public paths', () => {
    expect(isPathProtected('/')).toBe(false);
    expect(isPathProtected('/profile/123')).toBe(false);
    expect(isPathProtected('/listing/abc123')).toBe(false);
    expect(isPathProtected('/search')).toBe(false);
  });

  it('matches admin paths only', () => {
    expect(isAdminPath('/admin/moderation')).toBe(true);
    expect(isAdminPath('/admin/moderation/users')).toBe(true);
    expect(isAdminPath('/messages')).toBe(false);
  });
});
