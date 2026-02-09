import React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '../../ui/Button';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAllAsRead, isLoading } = useNotifications();
  
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-app-color overflow-hidden flex flex-col max-h-[80vh]">
      <div className="p-4 border-b border-app-color flex justify-between items-center shrink-0 bg-white dark:bg-neutral-900 sticky top-0 z-10">
        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
        <button 
          onClick={() => markAllAsRead()}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          title="Mark all as read"
        >
          <CheckCheck className="w-3 h-3" /> Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : recentNotifications.length > 0 ? (
          <div>
            {recentNotifications.map(notification => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onClose={onClose}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center text-gray-500">
            <Bell className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-app-color bg-gray-50 dark:bg-neutral-900/50 shrink-0">
        <Link href="/notifications" onClick={onClose}>
          <Button variant="ghost" fullWidth size="sm" className="text-primary-600">
            View All Notifications
          </Button>
        </Link>
      </div>
    </div>
  );
};