import { Offer } from '../types';
import { AuthService } from './auth.service';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Backend offer response type
interface BackendOffer {
    id: string;
    listingId: number;
    conversationId: string;
    senderId: string;
    recipientId: string;
    amount: number;
    status: string;
    message?: string;
    parentOfferId?: string;
    expiresAt?: string;
    respondedAt?: string;
    createdAt: string;
    updatedAt: string;
    senderName?: string;
    listingTitle?: string;
    listingPrice?: number;
}

// Convert backend offer to frontend format
function mapOffer(offer: BackendOffer): Offer {
    return {
        id: offer.id,
        listingId: offer.listingId,
        conversationId: offer.conversationId,
        senderId: offer.senderId,
        recipientId: offer.recipientId,
        amount: offer.amount,
        status: offer.status as Offer['status'],
        message: offer.message,
        parentOfferId: offer.parentOfferId,
        expiresAt: offer.expiresAt,
        respondedAt: offer.respondedAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        senderName: offer.senderName,
        listingTitle: offer.listingTitle,
        listingPrice: offer.listingPrice,
    };
}

export const OffersService = {
    /**
     * Create a new offer in a conversation
     */
    async createOffer(conversationId: string, amount: number, message?: string): Promise<Offer> {
        const token = AuthService.getStoredToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE}/api/offers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                conversationId,
                amount,
                message: message || undefined,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to create offer');
        }

        const data = await response.json();
        return mapOffer(data);
    },

    /**
     * Get all offers for a conversation
     */
    async getOffersForConversation(conversationId: string): Promise<Offer[]> {
        const token = AuthService.getStoredToken();
        if (!token) {
            return [];
        }

        const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/offers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return (data.offers || []).map(mapOffer);
    },

    /**
     * Get a single offer by ID
     */
    async getOfferById(offerId: string): Promise<Offer | null> {
        const token = AuthService.getStoredToken();
        if (!token) {
            return null;
        }

        const response = await fetch(`${API_BASE}/api/offers/${offerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return mapOffer(data);
    },

    /**
     * Respond to an offer (accept or reject)
     */
    async respondToOffer(offerId: string, accept: boolean): Promise<Offer> {
        const token = AuthService.getStoredToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE}/api/offers/${offerId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ accept }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to respond to offer');
        }

        const data = await response.json();
        return mapOffer(data);
    },

    /**
     * Make a counter-offer
     */
    async counterOffer(offerId: string, amount: number, message?: string): Promise<Offer> {
        const token = AuthService.getStoredToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE}/api/offers/${offerId}/counter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                amount,
                message: message || undefined,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to create counter-offer');
        }

        const data = await response.json();
        return mapOffer(data);
    },

    /**
     * Withdraw a pending offer (only sender can do this)
     */
    async withdrawOffer(offerId: string): Promise<boolean> {
        const token = AuthService.getStoredToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE}/api/offers/${offerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to withdraw offer');
        }

        return true;
    },
};
