import { describe, it, expect } from 'vitest';
import { applyReadReceiptToMessages } from './read-receipts';

const makeMessage = (overrides: Partial<any> = {}) => ({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u1',
  content: 'hi',
  type: 'text',
  createdAt: '2026-02-04T10:00:00Z',
  isRead: false,
  ...overrides,
});

describe('applyReadReceiptToMessages', () => {
  it('marks own messages as read up to the receipt messageId', () => {
    const messages = [
      makeMessage({ id: 'm1', createdAt: '2026-02-04T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2026-02-04T10:01:00Z' }),
      makeMessage({ id: 'm3', createdAt: '2026-02-04T10:02:00Z' }),
    ];

    const result = applyReadReceiptToMessages(messages, { messageId: 'm2' }, 'u1');

    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(true);
    expect(result[2].isRead).toBe(false);
  });

  it('marks all own messages as read when messageId is missing', () => {
    const messages = [
      makeMessage({ id: 'm1', createdAt: '2026-02-04T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2026-02-04T10:01:00Z' }),
      makeMessage({ id: 'm3', createdAt: '2026-02-04T10:02:00Z' }),
    ];

    const result = applyReadReceiptToMessages(messages, {}, 'u1');

    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(true);
    expect(result[2].isRead).toBe(true);
  });

  it('returns the same array when the receipt is from the current user', () => {
    const messages = [
      makeMessage({ id: 'm1', createdAt: '2026-02-04T10:00:00Z' }),
    ];

    const result = applyReadReceiptToMessages(messages, { userId: 'u1' }, 'u1');

    expect(result).toBe(messages);
  });

  it('does not change messages from other senders', () => {
    const messages = [
      makeMessage({ id: 'm1', senderId: 'u2', createdAt: '2026-02-04T10:00:00Z' }),
    ];

    const result = applyReadReceiptToMessages(messages, { timestamp: '2026-02-04T10:05:00Z' }, 'u1');

    expect(result).toBe(messages);
    expect(result[0].isRead).toBe(false);
  });
});
