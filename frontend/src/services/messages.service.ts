import { Conversation, Message } from '../types';
import { apiClient } from './api.client';
import { AuthService } from './auth.service';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Backend response type (different from frontend Conversation type)
interface BackendConversation {
  id: string;
  listingId: number;
  listingPublicId?: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  createdAt: string;
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  listingStatus?: string;
  listingReservationExpiresAt?: string;
  listingReservedFor?: string;
  listingSellerId?: string;
  otherUserName?: string;
  otherUserImage?: string;
  unreadCount?: number;
  lastMessage?: string;
  // Single conversation fetch fields
  buyerName?: string;
  sellerName?: string;
  buyerAvatar?: string;
  sellerAvatar?: string;
}

interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

// Helper to get full image URL
function getFullImageUrl(imagePath?: string): string {
  if (!imagePath) return '';
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Prefix with API base for relative paths
  return `${API_BASE}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

// Convert backend conversation to frontend format
function mapConversation(conv: BackendConversation, currentUserId?: string): Conversation {
  const isCurrentUserBuyer = conv.buyerId === currentUserId;
  const listingImageUrl = getFullImageUrl(conv.listingImage);

  // Determine other participant's info
  // For list endpoint: otherUserName/otherUserImage is set
  // For single conversation: use buyerName/sellerName based on who the current user is
  const otherParticipantId = isCurrentUserBuyer ? conv.sellerId : conv.buyerId;
  const otherParticipantName = conv.otherUserName ||
    (isCurrentUserBuyer ? conv.sellerName : conv.buyerName) ||
    'User';
  const otherParticipantAvatar = conv.otherUserImage ||
    (isCurrentUserBuyer ? conv.sellerAvatar : conv.buyerAvatar) ||
    '';

  return {
    id: conv.id,
    participants: [
      {
        id: otherParticipantId,
        name: otherParticipantName,
        email: '',
        avatar: otherParticipantAvatar,
        createdAt: conv.createdAt,
        isVerified: false,
        rating: 0,
        reviewCount: 0,
      }
    ],
    listing: conv.listingId ? {
      id: conv.listingId.toString(),
      publicId: conv.listingPublicId,
      title: conv.listingTitle || 'Listing',
      description: '',
      price: conv.listingPrice || 0,
      currency: 'NZD',
      category: '',
      subcategory: '',
      condition: 'Good',
      location: { suburb: '', city: '', region: '' },
      images: listingImageUrl ? [{ id: '1', url: listingImageUrl, order: 0, isThumbnail: true }] : [],
      sellerId: conv.listingSellerId || conv.sellerId,
      seller: { id: conv.listingSellerId || conv.sellerId, name: '', email: '', avatar: '', createdAt: '', isVerified: false, rating: 0, reviewCount: 0 },
      createdAt: conv.createdAt,
      updatedAt: conv.lastMessageAt,
      status: (conv.listingStatus || 'active') as 'active' | 'sold' | 'reserved' | 'deleted' | 'expired',
      reservationExpiresAt: conv.listingReservationExpiresAt,
      reservedFor: conv.listingReservedFor,
      viewCount: 0,
      likeCount: 0,
      isLiked: false,
    } : undefined,
    lastMessage: conv.lastMessage ? {
      id: 'last',
      conversationId: conv.id,
      senderId: '',
      content: conv.lastMessage,
      type: 'text',
      createdAt: conv.lastMessageAt,
      isRead: true,
    } : undefined,
    unreadCount: conv.unreadCount || 0,
    updatedAt: conv.lastMessageAt,
  };
}

// Convert backend message to frontend format
function mapMessage(msg: BackendMessage): Message {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    content: msg.content,
    type: 'text',
    createdAt: msg.createdAt,
    // Backend uses omitempty, so readAt is undefined (not null) when unread
    isRead: !!msg.readAt,
  };
}

export const MessagesService = {
  async getConversations() {
    const token = AuthService.getStoredToken();
    if (!token) {
      return { data: { data: [] as Conversation[] } };
    }

    try {
      const response = await fetch(`${API_BASE}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const currentUserId = AuthService.getCurrentUserId?.();
      const conversations = (data.conversations || []).map((c: BackendConversation) =>
        mapConversation(c, currentUserId)
      );

      return { data: { data: conversations } };
    } catch (error) {
      return { data: { data: [] as Conversation[] } };
    }
  },

  async getConversation(id: string) {
    const token = AuthService.getStoredToken();
    if (!token) {
      return { data: { data: {} as Conversation } };
    }

    try {
      const response = await fetch(`${API_BASE}/api/conversations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      const currentUserId = AuthService.getCurrentUserId?.();
      const conversation = mapConversation(data, currentUserId);

      return { data: { data: conversation } };
    } catch (error) {
      return { data: { data: {} as Conversation } };
    }
  },

  async getMessages(conversationId: string, pagination?: { page: number; limit: number }) {
    const token = AuthService.getStoredToken();
    if (!token) {
      return { data: { data: [] as Message[] } };
    }

    try {
      const limit = pagination?.limit || 50;
      const offset = pagination?.page ? (pagination.page - 1) * limit : 0;

      const response = await fetch(
        `${API_BASE}/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      const messages = (data.messages || []).map(mapMessage);

      return { data: { data: messages } };
    } catch (error) {
      return { data: { data: [] as Message[] } };
    }
  },

  async sendMessage(conversationId: string, content: string) {
    const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthService.getStoredToken()}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return { data: { data: mapMessage(data) } };
  },

  async createConversation(listingId: string) {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthService.getStoredToken()}`,
      },
      body: JSON.stringify({ listingId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create conversation');
    }

    const data = await response.json();
    const currentUserId = AuthService.getCurrentUserId?.();
    const conversation = mapConversation(data, currentUserId);

    return { data: { data: conversation } };
  },

  async markAsRead(conversationId: string) {
    const token = AuthService.getStoredToken();
    if (!token) {
      return { data: { data: false } };
    }

    try {
      const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }

      return { data: { data: true } };
    } catch (error) {
      return { data: { data: false } };
    }
  },

  async sendOffer(conversationId: string, amount: number) {
    // Offers would be sent via WebSocket
    return {
      data: {
        data: {} as Message
      }
    };
  },

  async respondToOffer(messageId: string, accept: boolean) {
    return {
      data: {
        data: {} as Message
      }
    };
  },

  async getUnreadCount() {
    const token = AuthService.getStoredToken();
    if (!token) {
      return { data: { data: 0 } };
    }

    try {
      // Fetch conversations and sum up unread counts
      const response = await fetch(`${API_BASE}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { data: { data: 0 } };
      }

      const data = await response.json();
      const conversations = data.conversations || [];
      const totalUnread = conversations.reduce(
        (sum: number, conv: BackendConversation) => sum + (conv.unreadCount || 0),
        0
      );

      return { data: { data: totalUnread } };
    } catch (error) {
      return { data: { data: 0 } };
    }
  }
};
