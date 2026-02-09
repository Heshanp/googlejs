import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '../../../types';

const navigationMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const notificationStoreMocks = vi.hoisted(() => ({
  markAsRead: vi.fn(),
}));

vi.mock('../../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigate: navigationMocks.navigate,
  }),
}));

vi.mock('../../../store/notifications.store', () => ({
  useNotificationsStore: () => ({
    markAsRead: notificationStoreMocks.markAsRead,
  }),
}));

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: '42',
  userId: 'user-1',
  type: 'system',
  title: 'Listing pending review',
  body: 'Publishing is taking longer than usual.',
  isRead: false,
  createdAt: '2026-02-09T08:00:00.000Z',
  ...overrides,
});

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the canonical listing route and marks unread notifications as read', () => {
    const notification = createNotification({ listingId: 352 });
    render(<NotificationItem notification={notification} />);

    fireEvent.click(screen.getByText('Listing pending review'));

    expect(notificationStoreMocks.markAsRead).toHaveBeenCalledWith('42');
    expect(navigationMocks.navigate).toHaveBeenCalledWith('/listing/352');
  });

  it('prefers listing public ID when available', () => {
    const notification = createNotification({
      listingId: 352,
      listingPublicId: '00000000-0000-0000-0000-000000000352',
    });
    render(<NotificationItem notification={notification} />);

    fireEvent.click(screen.getByText('Listing pending review'));

    expect(navigationMocks.navigate).toHaveBeenCalledWith('/listing/00000000-0000-0000-0000-000000000352');
  });

  it('navigates to a conversation when a conversation ID is present', () => {
    const notification = createNotification({ isRead: true, conversationId: 'conv-123' });
    render(<NotificationItem notification={notification} />);

    fireEvent.click(screen.getByText('Listing pending review'));

    expect(notificationStoreMocks.markAsRead).not.toHaveBeenCalled();
    expect(navigationMocks.navigate).toHaveBeenCalledWith('/messages/conv-123');
  });
});
