'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { AuthService } from '../../services/auth.service';
import { useToast } from '../ui/Toast';
import { useWebSocket } from './WebSocketProvider';
import { useMessagesStore } from '../../store/messages.store';
import { isConversationRoute } from '../../lib/messages/message-toast';
import { Conversation, Message } from '../../types';

const MAX_TOASTS_PER_POLL = 3;
const TOAST_BATCH_WINDOW_MS = 1000;

export function MessageToastListener() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const authUserId = useAuthStore((s) => s.user?.id);
  const { info } = useToast();
  const { subscribe } = useWebSocket();
  const refreshConversations = useMessagesStore((s) => s.refreshConversations);
  const applyNewMessageEvent = useMessagesStore((s) => s.applyNewMessageEvent);
  const conversations = useMessagesStore((s) => s.conversations);

  const pathnameRef = React.useRef(pathname);
  React.useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const conversationsRef = React.useRef<Conversation[]>([]);
  React.useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const pendingToastsRef = React.useRef<Array<{ conversationId: string; title: string; message: string }>>([]);
  const flushTimerRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    void refreshConversations({ reason: 'toast-baseline' });

    const flush = () => {
      const pending = pendingToastsRef.current;
      pendingToastsRef.current = [];
      if (flushTimerRef.current !== undefined) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = undefined;
      }

      if (pending.length === 0) return;

      if (pending.length > MAX_TOASTS_PER_POLL) {
        const uniqueChats = new Set(pending.map((t) => t.conversationId)).size;
        info(`You have new messages in ${uniqueChats} chats`, 'New messages');
        return;
      }

      for (const toast of pending) {
        info(toast.message, toast.title);
      }
    };

    const enqueueToast = (toast: { conversationId: string; title: string; message: string }) => {
      // Only show in-app toasts while the tab is visible.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      const existingIdx = pendingToastsRef.current.findIndex((t) => t.conversationId === toast.conversationId);
      if (existingIdx !== -1) {
        pendingToastsRef.current[existingIdx] = toast;
      } else {
        pendingToastsRef.current.push(toast);
      }

      if (flushTimerRef.current === undefined) {
        flushTimerRef.current = window.setTimeout(flush, TOAST_BATCH_WINDOW_MS);
      }
    };

    const unsubscribe = subscribe((event) => {
      if (!event || typeof event !== 'object') return;
      if (event.type !== 'new_message') return;
      if (!event.conversationId || !event.message) return;

      const currentUserId = authUserId || AuthService.getCurrentUserId?.();
      const isActiveConversation =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        isConversationRoute(pathnameRef.current, event.conversationId);

      const mapped: Message = {
        id: event.message.id,
        conversationId: event.message.conversationId,
        senderId: event.message.senderId,
        content: event.message.content || '',
        type: 'text',
        createdAt: event.message.createdAt,
        isRead: !!event.message.readAt,
      };

      applyNewMessageEvent({
        conversationId: event.conversationId,
        message: mapped,
        currentUserId,
        isConversationOpen: isActiveConversation,
      });

      // Never toast for your own messages or for the active conversation.
      if (currentUserId && mapped.senderId === currentUserId) return;
      if (isActiveConversation) return;

      const conv = conversationsRef.current.find((c) => c.id === event.conversationId);
      const title = conv?.participants?.[0]?.name || 'New message';
      const message = mapped.content.trim() || 'You have a new message';

      enqueueToast({ conversationId: event.conversationId, title, message });
    });

    return () => {
      unsubscribe();
      if (flushTimerRef.current !== undefined) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = undefined;
      }
      pendingToastsRef.current = [];
    };
  }, [hasHydrated, isAuthenticated, info, subscribe, refreshConversations, applyNewMessageEvent, authUserId]);

  return null;
}
