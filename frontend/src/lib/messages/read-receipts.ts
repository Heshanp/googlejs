import { Message } from '../../types';

type ReadReceiptPayload = {
  userId?: string;
  messageId?: string;
};

export function applyReadReceiptToMessages(
  messages: Message[],
  payload: ReadReceiptPayload,
  currentUserId?: string | null
): Message[] {
  if (!currentUserId) return messages;
  if (payload.userId && payload.userId === currentUserId) return messages;

  const cutoffFromMessageId = payload.messageId
    ? messages.find((m) => m.id === payload.messageId)?.createdAt
    : undefined;
  const cutoffTime = cutoffFromMessageId ? new Date(cutoffFromMessageId).getTime() : null;

  let changed = false;
  const next = messages.map((m) => {
    if (m.senderId !== currentUserId || m.isRead) return m;

    if (cutoffTime !== null) {
      const msgTime = new Date(m.createdAt).getTime();
      if (msgTime > cutoffTime) return m;
    }

    changed = true;
    return { ...m, isRead: true };
  });

  return changed ? next : messages;
}
