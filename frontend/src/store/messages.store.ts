import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { MessagesService } from '../services';

type RefreshOptions = {
  reason?: string;
  force?: boolean;
};

type ApplyMessageOptions = {
  conversationId: string;
  message: Message;
  currentUserId?: string | null;
  isConversationOpen?: boolean;
};

function computeUnreadTotal(conversations: Conversation[]): number {
  return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
}

let refreshDebounceId: number | undefined;

interface MessagesState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  unreadCountTotal: number;

  inFlightRefresh: Promise<void> | null;
  refreshConversations: (options?: RefreshOptions) => Promise<void>;

  applyNewMessageEvent: (options: ApplyMessageOptions) => void;
  markConversationReadLocal: (conversationId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  isLoading: false,
  error: null,
  unreadCountTotal: 0,

  inFlightRefresh: null,
  refreshConversations: async (options = {}) => {
    const { force = false } = options;
    const existing = get().inFlightRefresh;
    if (existing && !force) return existing;

    const promise = (async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await MessagesService.getConversations();
        const conversations = res.data.data || [];
        set({
          conversations,
          unreadCountTotal: computeUnreadTotal(conversations),
          error: null,
        });
      } catch (err: any) {
        set({ error: err?.message || 'Failed to fetch conversations' });
      } finally {
        set({ isLoading: false, inFlightRefresh: null });
      }
    })();

    set({ inFlightRefresh: promise });
    return promise;
  },

  applyNewMessageEvent: ({ conversationId, message, currentUserId, isConversationOpen }) => {
    const { conversations } = get();
    const idx = conversations.findIndex((c) => c.id === conversationId);

    if (idx === -1) {
      if (typeof window !== 'undefined') {
        if (refreshDebounceId !== undefined) window.clearTimeout(refreshDebounceId);
        refreshDebounceId = window.setTimeout(() => {
          void get().refreshConversations({ reason: 'ws-miss' });
        }, 500);
      }
      return;
    }

    const existing = conversations[idx];
    const shouldIncrementUnread =
      !isConversationOpen &&
      !!currentUserId &&
      message.senderId !== currentUserId;

    const updated: Conversation = {
      ...existing,
      lastMessage: message,
      updatedAt: message.createdAt,
      unreadCount: shouldIncrementUnread ? (existing.unreadCount || 0) + 1 : existing.unreadCount || 0,
    };

    const next = [updated, ...conversations.slice(0, idx), ...conversations.slice(idx + 1)];
    set({ conversations: next, unreadCountTotal: computeUnreadTotal(next) });
  },

  markConversationReadLocal: (conversationId: string) => {
    const { conversations } = get();
    const idx = conversations.findIndex((c) => c.id === conversationId);
    if (idx === -1) return;

    const existing = conversations[idx];
    if ((existing.unreadCount || 0) === 0) return;

    const updated: Conversation = { ...existing, unreadCount: 0 };
    const next = [...conversations];
    next[idx] = updated;
    set({ conversations: next, unreadCountTotal: computeUnreadTotal(next) });
  },
}));

