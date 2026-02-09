import { describe, it, expect } from 'vitest';
import { computeMessageToasts } from './message-toast';
import { ROUTES } from '../routes';

const makeConversation = (overrides: Partial<any> = {}) => ({
  id: 'c1',
  participants: [{ id: 'u2', name: 'Alex' }],
  unreadCount: 1,
  updatedAt: '2026-02-04T10:00:00Z',
  lastMessage: { id: 'm1', conversationId: 'c1', senderId: 'u2', content: 'hi', type: 'text', createdAt: '2026-02-04T10:00:00Z', isRead: false },
  ...overrides,
});

describe('computeMessageToasts', () => {
  it('suppresses toasts when suppressToasts=true but still updates next state', () => {
    const { toasts, nextLastNotifiedAt } = computeMessageToasts({
      conversations: [makeConversation()],
      pathname: '/',
      previousLastNotifiedAt: {},
      suppressToasts: true,
    });

    expect(toasts).toHaveLength(0);
    expect(nextLastNotifiedAt.c1).toBe('2026-02-04T10:00:00Z');
  });

  it('does not toast when the conversation is currently open', () => {
    const { toasts, nextLastNotifiedAt } = computeMessageToasts({
      conversations: [makeConversation()],
      pathname: ROUTES.CONVERSATION('c1'),
      previousLastNotifiedAt: { c1: '2026-02-04T09:00:00Z' },
    });

    expect(toasts).toHaveLength(0);
    expect(nextLastNotifiedAt.c1).toBe('2026-02-04T10:00:00Z');
  });

  it('does not toast when there is no unread message', () => {
    const { toasts } = computeMessageToasts({
      conversations: [makeConversation({ unreadCount: 0 })],
      pathname: '/',
      previousLastNotifiedAt: { c1: '2026-02-04T09:00:00Z' },
    });

    expect(toasts).toHaveLength(0);
  });

  it('toasts for a new conversation with unread messages (prevAt undefined)', () => {
    const { toasts } = computeMessageToasts({
      conversations: [makeConversation()],
      pathname: '/',
      previousLastNotifiedAt: {},
    });

    expect(toasts).toHaveLength(1);
    expect(toasts[0].conversationId).toBe('c1');
    expect(toasts[0].title).toBe('Alex');
    expect(toasts[0].message).toBe('hi');
    expect(toasts[0].href).toBe(ROUTES.CONVERSATION('c1'));
  });

  it('does not toast if updatedAt has not advanced since last notification', () => {
    const { toasts } = computeMessageToasts({
      conversations: [makeConversation({ updatedAt: '2026-02-04T10:00:00Z' })],
      pathname: '/',
      previousLastNotifiedAt: { c1: '2026-02-04T10:00:00Z' },
    });

    expect(toasts).toHaveLength(0);
  });

  it('toasts again when updatedAt advances and messages are still unread', () => {
    const { toasts } = computeMessageToasts({
      conversations: [makeConversation({ updatedAt: '2026-02-04T10:01:00Z', lastMessage: { content: 'new msg' } })],
      pathname: '/',
      previousLastNotifiedAt: { c1: '2026-02-04T10:00:00Z' },
    });

    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('new msg');
  });

  it('sorts multiple toasts by updatedAt desc', () => {
    const c1 = makeConversation({ id: 'c1', updatedAt: '2026-02-04T10:00:00Z' });
    const c2 = makeConversation({ id: 'c2', updatedAt: '2026-02-04T11:00:00Z', participants: [{ id: 'u3', name: 'Sam' }] });

    const { toasts } = computeMessageToasts({
      conversations: [c1, c2],
      pathname: '/',
      previousLastNotifiedAt: {},
    });

    expect(toasts).toHaveLength(2);
    expect(toasts[0].conversationId).toBe('c2');
    expect(toasts[1].conversationId).toBe('c1');
  });
});

