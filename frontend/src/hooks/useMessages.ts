import { useState, useEffect, useCallback, useRef } from 'react';
import { MessagesService, OffersService } from '../services';
import { Conversation, Message, Offer } from '../types';
import { useToast } from '../components/ui/Toast';
import { useMessagesStore } from '../store/messages.store';
import { useWebSocket } from '../components/providers/WebSocketProvider';
import { AuthService } from '../services/auth.service';
import { applyReadReceiptToMessages } from '../lib/messages/read-receipts';

export const useConversations = () => {
  const conversations = useMessagesStore((s) => s.conversations);
  const loading = useMessagesStore((s) => s.isLoading);
  const error = useMessagesStore((s) => s.error);
  const refresh = useMessagesStore((s) => s.refreshConversations);

  useEffect(() => {
    void refresh({ reason: 'useConversations' });
  }, [refresh]);

  return { conversations, loading, error, refresh };
};

export const useChat = (conversationId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { error: toastError, success: toastSuccess } = useToast();
  const { subscribe, status: wsStatus } = useWebSocket();
  const markConversationReadLocal = useMessagesStore((s) => s.markConversationReadLocal);

  const markReadDebounceRef = useRef<number | undefined>(undefined);

  const mapWsMessage = useCallback((raw: any): Message | null => {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.conversationId) return null;
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      senderId: raw.senderId,
      content: raw.content || '',
      type: 'text',
      createdAt: raw.createdAt,
      isRead: !!raw.readAt,
    };
  }, []);

  const mapWsOffer = useCallback((raw: any): Offer | null => {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.conversationId) return null;
    return {
      id: raw.id,
      listingId: raw.listingId,
      conversationId: raw.conversationId,
      senderId: raw.senderId,
      recipientId: raw.recipientId,
      amount: raw.amount,
      status: raw.status,
      message: raw.message ?? undefined,
      parentOfferId: raw.parentOfferId ?? undefined,
      expiresAt: raw.expiresAt ?? undefined,
      respondedAt: raw.respondedAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      senderName: raw.senderName ?? undefined,
      listingTitle: raw.listingTitle ?? undefined,
      listingPrice: raw.listingPrice ?? undefined,
    };
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const [msgsRes, convRes] = await Promise.all([
        MessagesService.getMessages(conversationId),
        MessagesService.getConversation(conversationId)
      ]);
      setMessages(msgsRes.data.data);
      setConversation(convRes.data.data);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchOffers = useCallback(async () => {
    if (!conversationId) return;
    try {
      const offersData = await OffersService.getOffersForConversation(conversationId);
      setOffers(offersData);
    } catch (err: any) {
    }
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchMessages();
    fetchOffers();
  }, [fetchMessages, fetchOffers]);

  // Realtime updates via WebSocket
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribe((event) => {
      if (!event || typeof event !== 'object') return;

      if (event.type === 'new_message' && event.conversationId === conversationId && event.message) {
        const mapped = mapWsMessage(event.message);
        if (!mapped) return;

        setMessages((prev) => (prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped]));

        const currentUserId = AuthService.getCurrentUserId?.();
        const isFromOtherUser = !!currentUserId && mapped.senderId !== currentUserId;

        if (isFromOtherUser && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          // Keep backend unread counts accurate while the chat is open.
          if (markReadDebounceRef.current !== undefined) {
            window.clearTimeout(markReadDebounceRef.current);
          }
          markReadDebounceRef.current = window.setTimeout(() => {
            void MessagesService.markAsRead(conversationId);
            markConversationReadLocal(conversationId);
          }, 300);
        }
      }

      if (event.type === 'read_receipt' && event.conversationId === conversationId) {
        const currentUserId = AuthService.getCurrentUserId?.();
        if (!currentUserId) return;

        // Ignore receipts emitted by this user (can happen with multiple tabs).
        if (event.userId && event.userId === currentUserId) return;

        setMessages((prev) =>
          applyReadReceiptToMessages(prev, { userId: event.userId, messageId: event.messageId }, currentUserId)
        );
      }

      if ((event.type === 'new_offer' || event.type === 'offer_update') && event.conversationId === conversationId && event.offer) {
        const mapped = mapWsOffer(event.offer);
        if (!mapped) return;

        setOffers((prev) => {
          const idx = prev.findIndex((o) => o.id === mapped.id);
          const next = idx === -1 ? [mapped, ...prev] : prev.map((o) => (o.id === mapped.id ? { ...o, ...mapped } : o));
          return next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
        });
      }
    });

    return () => {
      unsubscribe();
      if (markReadDebounceRef.current !== undefined) {
        window.clearTimeout(markReadDebounceRef.current);
        markReadDebounceRef.current = undefined;
      }
    };
  }, [conversationId, subscribe, mapWsMessage, mapWsOffer, markConversationReadLocal]);

  // Fallback resync when returning to the tab and WS is disconnected.
  useEffect(() => {
    if (!conversationId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (wsStatus !== 'connected') {
        void fetchMessages();
        void fetchOffers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [conversationId, wsStatus, fetchMessages, fetchOffers]);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;
    try {
      const res = await MessagesService.sendMessage(conversationId, content);
      // WS echo can arrive before the REST response; dedupe by id to avoid duplicate keys.
      const sent = res.data.data;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      return true;
    } catch (err: any) {
      toastError('Failed to send message');
      return false;
    }
  };

  const sendOffer = async (amount: number, message?: string) => {
    if (!conversationId) return false;
    try {
      // Convert dollars to cents for the backend
      const amountInCents = Math.round(amount * 100);
      const offer = await OffersService.createOffer(conversationId, amountInCents, message);
      // WS echo can arrive before the REST response; dedupe by id.
      setOffers((prev) => (prev.some((o) => o.id === offer.id) ? prev : [offer, ...prev]));
      toastSuccess('Offer sent successfully');
      return true;
    } catch (err: any) {
      toastError(err.message || 'Failed to send offer');
      return false;
    }
  };

  const respondToOffer = async (offerId: string, accept: boolean) => {
    try {
      const updatedOffer = await OffersService.respondToOffer(offerId, accept);
      setOffers(prev => prev.map(o => o.id === offerId ? updatedOffer : o));
      toastSuccess(accept ? 'Offer accepted!' : 'Offer declined');
      return true;
    } catch (err: any) {
      toastError(err.message || 'Failed to update offer');
      return false;
    }
  };

  const counterOffer = async (offerId: string, amount: number, message?: string) => {
    try {
      const newOffer = await OffersService.counterOffer(offerId, amount, message);
      setOffers((prev) => {
        const next = prev.map((o) => (o.id === offerId ? { ...o, status: 'countered' as const } : o));
        return next.some((o) => o.id === newOffer.id) ? next : [newOffer, ...next];
      });
      toastSuccess('Counter-offer sent');
      return true;
    } catch (err: any) {
      toastError(err.message || 'Failed to send counter-offer');
      return false;
    }
  };

  const withdrawOffer = async (offerId: string) => {
    try {
      await OffersService.withdrawOffer(offerId);
      setOffers(prev => prev.map(o =>
        o.id === offerId ? { ...o, status: 'withdrawn' as const } : o
      ));
      toastSuccess('Offer withdrawn');
      return true;
    } catch (err: any) {
      toastError(err.message || 'Failed to withdraw offer');
      return false;
    }
  };

  // Get the current pending offer (most recent pending)
  const pendingOffer = offers.find(o => o.status === 'pending');

  // Get the most recent offer regardless of status (for display after accept/reject)
  const latestOffer = offers.length > 0 ? offers[0] : null;

  return {
    messages,
    offers,
    pendingOffer,
    latestOffer,
    conversation,
    loading,
    sendMessage,
    sendOffer,
    respondToOffer,
    counterOffer,
    withdrawOffer,
    refresh: fetchMessages
  };
};

export const useUnreadCount = () => {
  return useMessagesStore((s) => s.unreadCountTotal);
};
