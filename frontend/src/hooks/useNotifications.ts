import { useEffect } from 'react';
import { useNotificationsStore } from '../store/notifications.store';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const store = useNotificationsStore();

  useEffect(() => {
    if (user) {
      store.fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        store.fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]); // Only refetch if user changes (login/logout)

  return store;
};