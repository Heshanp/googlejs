import { User } from './user.types';

export interface Review {
  id: string;
  reviewerId: string;
  reviewer?: User;
  reviewerName?: string;
  reviewerAvatar?: string;
  revieweeId: string;
  listingId?: number;
  listingTitle?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface ReviewSummary {
  userId: string;
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
}

export interface PendingReview {
  listingId: number;
  listingTitle: string;
  listingImage?: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyAvatar?: string;
  role: 'buyer' | 'seller';
  soldAt: string;
}

export interface CreateReviewInput {
  listingId: number;
  revieweeId: string;
  rating: number;
  comment?: string;
}