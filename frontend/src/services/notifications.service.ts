import { Notification } from '../types';
import { apiClient } from './api.client';

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface UnreadCountResponse {
  unreadCount: number;
}

export const NotificationsService = {
  async getNotifications(limit = 20, offset = 0): Promise<NotificationsResponse> {
    return apiClient.get<NotificationsResponse>(
      `/api/notifications?limit=${limit}&offset=${offset}`
    );
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/api/notifications/unread-count');
    return response.unreadCount;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.post(`/api/notifications/${id}/read`, {});
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/api/notifications/read-all', {});
  },

  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/api/notifications/${id}`);
  }
};
