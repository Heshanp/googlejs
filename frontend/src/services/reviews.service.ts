import { Review, ReviewStats, PendingReview, CreateReviewInput } from '../types';
import { apiClient } from './api.client';

interface ReviewsResponse {
  reviews: Review[];
  stats?: ReviewStats;
}

interface PendingReviewsResponse {
  pending: PendingReview[];
  total: number;
}

export const ReviewsService = {
  /**
   * Get all reviews for a user
   */
  async getReviewsForUser(userId: string): Promise<{ reviews: Review[]; stats: ReviewStats }> {
    const response = await apiClient.get<ReviewsResponse>(`/api/users/${userId}/reviews`);
    return {
      reviews: response.reviews || [],
      stats: response.stats || {
        averageRating: 0,
        totalReviews: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    };
  },

  /**
   * Get reviews for a specific listing/transaction
   */
  async getReviewsForListing(listingId: string): Promise<Review[]> {
    const response = await apiClient.get<{ reviews: Review[] }>(`/api/listings/${listingId}/reviews`);
    return response.reviews || [];
  },

  /**
   * Create a new review
   */
  async createReview(data: CreateReviewInput): Promise<Review> {
    return apiClient.post<Review>('/api/reviews', data);
  },

  /**
   * Get pending reviews (transactions where user can still leave a review)
   */
  async getPendingReviews(): Promise<PendingReview[]> {
    const response = await apiClient.get<PendingReviewsResponse>('/api/reviews/pending');
    return response.pending || [];
  },

  /**
   * Get review summary/stats for a user
   */
  async getReviewSummary(userId: string): Promise<ReviewStats> {
    const response = await apiClient.get<ReviewsResponse>(`/api/users/${userId}/reviews`);
    return response.stats || {
      averageRating: 0,
      totalReviews: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};
