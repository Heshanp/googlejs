import { Conversation } from '../../types';

export type ConversationFilter = 'all' | 'buying' | 'selling';
export type ConversationRole = 'buying' | 'selling' | 'unknown';

export function getConversationRole(conversation: Conversation, currentUserId?: string): ConversationRole {
  if (!currentUserId || !conversation.listing) {
    return 'unknown';
  }

  return conversation.listing.sellerId === currentUserId ? 'selling' : 'buying';
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function filterConversations(
  conversations: Conversation[],
  options: { search: string; filter: ConversationFilter; currentUserId?: string }
): Conversation[] {
  const normalizedSearch = normalizeSearch(options.search);

  return conversations.filter((conversation) => {
    if (options.filter !== 'all') {
      const role = getConversationRole(conversation, options.currentUserId);
      if (role !== options.filter) {
        return false;
      }
    }

    if (!normalizedSearch) {
      return true;
    }

    const participantMatch = conversation.participants.some((participant) =>
      participant.name.toLowerCase().includes(normalizedSearch)
    );
    const listingMatch = conversation.listing?.title?.toLowerCase().includes(normalizedSearch);

    return participantMatch || Boolean(listingMatch);
  });
}
