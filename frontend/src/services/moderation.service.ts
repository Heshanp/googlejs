import { apiClient } from './api.client';
import { ModerationQueueItem, ModerationUserSummary, ModerationViolationItem } from '../types';

interface QueueResponse {
  data: ModerationQueueItem[];
  total: number;
}

interface ViolationsResponse {
  user: ModerationUserSummary;
  violations: ModerationViolationItem[];
  total: number;
}

export const ModerationService = {
  async getQueue(status: string = 'pending_review,blocked', limit = 50, offset = 0) {
    const query = new URLSearchParams({
      status,
      limit: String(limit),
      offset: String(offset),
    });
    return apiClient.get<QueueResponse>(`/api/admin/moderation/listings?${query.toString()}`);
  },

  async approveListing(listingId: string, summary?: string) {
    return apiClient.post<{ success: boolean }>(
      `/api/admin/moderation/listings/${listingId}/approve`,
      { summary: summary || '' }
    );
  },

  async rejectListing(listingId: string, summary?: string) {
    return apiClient.post<{ success: boolean }>(
      `/api/admin/moderation/listings/${listingId}/reject`,
      { summary: summary || '' }
    );
  },

  async getUserViolations(userId: string, limit = 50, offset = 0) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return apiClient.get<ViolationsResponse>(`/api/admin/moderation/users/${userId}/violations?${query.toString()}`);
  },

  async unflagUser(userId: string) {
    return apiClient.post<{ success: boolean }>(`/api/admin/moderation/users/${userId}/unflag`, {});
  },
};
