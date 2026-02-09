import { create } from 'zustand';
import { Notification } from '../types';
import { NotificationsService } from '../services';

interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  isLoading: false,
  unreadCount: 0,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { notifications, unreadCount } = await NotificationsService.getNotifications();
      set({ notifications: notifications || [], unreadCount, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    const currentNotifications = get().notifications;
    const updatedNotifications = currentNotifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
    
    set({ notifications: updatedNotifications, unreadCount });

    try {
      await NotificationsService.markAsRead(id);
    } catch (error) {
      // Revert on error (optional, keeping simple for now)
    }
  },

  markAllAsRead: async () => {
    const currentNotifications = get().notifications;
    const updatedNotifications = currentNotifications.map(n => ({ ...n, isRead: true }));
    
    set({ notifications: updatedNotifications, unreadCount: 0 });

    try {
      await NotificationsService.markAllAsRead();
    } catch (error) {
    }
  },

  addNotification: (notification: Notification) => {
    set(state => {
      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1)
      };
    });
  }
}));