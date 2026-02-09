import { User } from './user.types';
import { Listing } from './listing.types';

export type MessageType = 'text' | 'image' | 'offer';

// Enhanced offer status for bidirectional negotiation
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

// Full offer type matching backend model
export interface Offer {
  id: string;
  listingId: number;
  conversationId: string;
  senderId: string;
  recipientId: string;
  amount: number;          // Price in cents
  status: OfferStatus;
  message?: string;
  parentOfferId?: string;  // For counter-offer chains
  expiresAt?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields from backend
  senderName?: string;
  listingTitle?: string;
  listingPrice?: number;
}

// Simplified offer for message display (backwards compatible)
export interface MessageOffer {
  amount: number;
  status: OfferStatus;
  offerId?: string;        // Reference to full offer
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  offer?: MessageOffer;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  listing?: Listing;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  // Active offer in conversation
  pendingOffer?: Offer;
}