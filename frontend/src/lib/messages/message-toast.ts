import { Conversation } from '../../types';
import { ROUTES } from '../routes';

export interface MessageToast {
  conversationId: string;
  title: string;
  message: string;
  updatedAt: string;
  href: string;
}

export function isConversationRoute(pathname: string, conversationId: string): boolean {
  return pathname === ROUTES.CONVERSATION(conversationId);
}

export function computeMessageToasts(params: {
  conversations: Conversation[];
  pathname: string;
  previousLastNotifiedAt: Record<string, string | undefined>;
  suppressToasts?: boolean;
}): { toasts: MessageToast[]; nextLastNotifiedAt: Record<string, string> } {
  const { conversations, pathname, previousLastNotifiedAt, suppressToasts = false } = params;

  const nextLastNotifiedAt: Record<string, string> = {};
  for (const [conversationId, lastNotifiedAt] of Object.entries(previousLastNotifiedAt)) {
    if (lastNotifiedAt) nextLastNotifiedAt[conversationId] = lastNotifiedAt;
  }
  const toasts: MessageToast[] = [];

  for (const conversation of conversations) {
    const updatedAt = conversation.updatedAt;
    if (!updatedAt) continue;

    const prevAt = previousLastNotifiedAt[conversation.id];
    const isOpen = isConversationRoute(pathname, conversation.id);

    // Always track the latest timestamp we have seen for this conversation.
    if (!prevAt || updatedAt > prevAt) {
      nextLastNotifiedAt[conversation.id] = updatedAt;
    } else if (!nextLastNotifiedAt[conversation.id]) {
      nextLastNotifiedAt[conversation.id] = prevAt;
    }

    if (suppressToasts || isOpen) continue;

    const hasUnread = (conversation.unreadCount || 0) > 0;
    const isNewOrUpdated = !prevAt || updatedAt > prevAt;

    if (!hasUnread || !isNewOrUpdated) continue;

    const otherParticipantName = conversation.participants?.[0]?.name || 'New message';
    const lastMessageText = conversation.lastMessage?.content?.trim() || 'You have a new message';

    toasts.push({
      conversationId: conversation.id,
      title: otherParticipantName,
      message: lastMessageText,
      updatedAt,
      href: ROUTES.CONVERSATION(conversation.id),
    });
  }

  // Show newest toasts first (helps when multiple arrive at once).
  toasts.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

  return { toasts, nextLastNotifiedAt };
}
