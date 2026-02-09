import { describe, it, expect, beforeEach } from 'vitest';
import { useMessagesStore } from './messages.store';
import { Conversation, Message } from '../types';

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    participants: [
      {
        id: 'u2',
        name: 'Alex',
        email: '',
        avatar: '',
        createdAt: '2026-02-04T10:00:00Z',
        isVerified: false,
        rating: 0,
        reviewCount: 0,
      },
    ],
    unreadCount: 0,
    updatedAt: '2026-02-04T10:00:00Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u2',
    content: 'hi',
    type: 'text',
    createdAt: '2026-02-04T10:01:00Z',
    isRead: false,
    ...overrides,
  };
}

describe('messages.store', () => {
  beforeEach(() => {
    useMessagesStore.setState({
      conversations: [],
      isLoading: false,
      error: null,
      unreadCountTotal: 0,
      inFlightRefresh: null,
    });
  });

  it('applyNewMessageEvent moves conversation to top and increments unread', () => {
    const c1 = makeConversation({ id: 'c1', unreadCount: 0 });
    const c2 = makeConversation({ id: 'c2', unreadCount: 0, updatedAt: '2026-02-04T09:00:00Z' });

    useMessagesStore.setState({ conversations: [c1, c2], unreadCountTotal: 0 });

    const msg = makeMessage({ id: 'm2', conversationId: 'c2', senderId: 'u2', createdAt: '2026-02-04T11:00:00Z' });
    useMessagesStore.getState().applyNewMessageEvent({
      conversationId: 'c2',
      message: msg,
      currentUserId: 'u1',
      isConversationOpen: false,
    });

    const next = useMessagesStore.getState();
    expect(next.conversations[0].id).toBe('c2');
    expect(next.conversations[0].lastMessage?.id).toBe('m2');
    expect(next.conversations[0].unreadCount).toBe(1);
    expect(next.unreadCountTotal).toBe(1);
  });

  it('does not increment unread for own messages', () => {
    const c1 = makeConversation({ id: 'c1', unreadCount: 0 });
    useMessagesStore.setState({ conversations: [c1], unreadCountTotal: 0 });

    const msg = makeMessage({ id: 'm2', conversationId: 'c1', senderId: 'u1' });
    useMessagesStore.getState().applyNewMessageEvent({
      conversationId: 'c1',
      message: msg,
      currentUserId: 'u1',
      isConversationOpen: false,
    });

    const next = useMessagesStore.getState();
    expect(next.conversations[0].unreadCount).toBe(0);
    expect(next.unreadCountTotal).toBe(0);
  });

  it('does not increment unread when the conversation is open', () => {
    const c1 = makeConversation({ id: 'c1', unreadCount: 0 });
    useMessagesStore.setState({ conversations: [c1], unreadCountTotal: 0 });

    const msg = makeMessage({ id: 'm2', conversationId: 'c1', senderId: 'u2' });
    useMessagesStore.getState().applyNewMessageEvent({
      conversationId: 'c1',
      message: msg,
      currentUserId: 'u1',
      isConversationOpen: true,
    });

    const next = useMessagesStore.getState();
    expect(next.conversations[0].unreadCount).toBe(0);
    expect(next.unreadCountTotal).toBe(0);
  });

  it('markConversationReadLocal clears unread and updates totals', () => {
    const c1 = makeConversation({ id: 'c1', unreadCount: 2 });
    useMessagesStore.setState({ conversations: [c1], unreadCountTotal: 2 });

    useMessagesStore.getState().markConversationReadLocal('c1');

    const next = useMessagesStore.getState();
    expect(next.conversations[0].unreadCount).toBe(0);
    expect(next.unreadCountTotal).toBe(0);
  });
});
