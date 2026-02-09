import { describe, it, expect } from 'vitest';
import { filterConversations, getConversationRole } from './conversation-utils';
import { Conversation, Listing, User } from '../../types';

const makeUser = (id: string, name: string): User => ({
  id,
  name,
  email: '',
  avatar: '',
  createdAt: '',
  isVerified: false,
  rating: 0,
  reviewCount: 0,
});

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 'l1',
  publicId: 'listing-1',
  title: 'Vintage Jacket',
  description: '',
  price: 120,
  currency: 'USD',
  images: [],
  category: '',
  condition: 'Good',
  location: { suburb: '', city: '', region: '' },
  sellerId: 'u1',
  createdAt: '',
  updatedAt: '',
  status: 'active',
  viewCount: 0,
  likeCount: 0,
  ...overrides,
});

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'c1',
  participants: [makeUser('u1', 'Alice'), makeUser('u2', 'Bob')],
  listing: makeListing(),
  unreadCount: 0,
  updatedAt: '2026-02-08T10:00:00Z',
  ...overrides,
});

describe('getConversationRole', () => {
  it('returns selling when current user is the seller', () => {
    const conversation = makeConversation({ listing: makeListing({ sellerId: 'u1' }) });
    expect(getConversationRole(conversation, 'u1')).toBe('selling');
  });

  it('returns buying when current user is not the seller', () => {
    const conversation = makeConversation({ listing: makeListing({ sellerId: 'u2' }) });
    expect(getConversationRole(conversation, 'u1')).toBe('buying');
  });

  it('returns unknown when listing or user is missing', () => {
    const conversation = makeConversation({ listing: undefined });
    expect(getConversationRole(conversation, 'u1')).toBe('unknown');
    expect(getConversationRole(makeConversation(), undefined)).toBe('unknown');
  });
});

describe('filterConversations', () => {
  it('filters by role and search term', () => {
    const selling = makeConversation({
      id: 'c1',
      listing: makeListing({ sellerId: 'u1', title: 'Vintage Jacket' }),
      participants: [makeUser('u1', 'Alice'), makeUser('u2', 'James Smith')],
    });
    const buying = makeConversation({
      id: 'c2',
      listing: makeListing({ sellerId: 'u3', title: 'Road Bike' }),
      participants: [makeUser('u1', 'Alice'), makeUser('u3', 'Sarah Connor')],
    });

    const filtered = filterConversations([selling, buying], {
      search: 'james',
      filter: 'selling',
      currentUserId: 'u1',
    });

    expect(filtered).toEqual([selling]);
  });

  it('returns all when filter is all and search is empty', () => {
    const conversations = [makeConversation({ id: 'c1' }), makeConversation({ id: 'c2' })];
    const filtered = filterConversations(conversations, { search: '', filter: 'all', currentUserId: 'u1' });
    expect(filtered).toEqual(conversations);
  });
});
