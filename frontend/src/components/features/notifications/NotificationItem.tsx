import React from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import { Notification } from '../../../types';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Tag, Heart, Star, Info, CheckCircle, TrendingDown } from 'lucide-react';
import { useNotificationsStore } from '../../../store/notifications.store';
import { ROUTES } from '../../../lib/routes';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
  compact?: boolean;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'message': return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'offer': return <Tag className="w-5 h-5 text-green-500" />;
    case 'like': return <Heart className="w-5 h-5 text-red-500" />;
    case 'review': return <Star className="w-5 h-5 text-yellow-500" />;
    case 'price_drop': return <TrendingDown className="w-5 h-5 text-purple-500" />;
    case 'listing_sold': return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'offer_accepted': return <CheckCircle className="w-5 h-5 text-green-600" />;
    default: return <Info className="w-5 h-5 text-gray-500" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose, compact }) => {
  const { navigate } = useNavigation();
  const { markAsRead } = useNotificationsStore();
  
  const handleClick = () => {
    // Mark as read
    if (!notification.isRead) {
       markAsRead(notification.id);
    }

    // Navigate based on notification type and associated IDs
    const listingRouteId = notification.listingPublicId || (notification.listingId != null ? String(notification.listingId) : null);
    if (listingRouteId) {
      navigate(ROUTES.LISTING(listingRouteId));
    } else if (notification.conversationId) {
      navigate(ROUTES.CONVERSATION(notification.conversationId));
    }

    if (onClose) onClose();
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "flex gap-4 p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 relative group",
        !notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-neutral-900",
        compact ? "py-3 px-4" : "border-b border-app-color rounded-xl mb-2 border"
      )}
    >
      <div className="shrink-0 mt-1">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          !notification.isRead ? "bg-white dark:bg-neutral-800 shadow-sm" : "bg-gray-100 dark:bg-neutral-800"
        )}>
          {getIcon(notification.type)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h4 className={cn("text-sm font-medium truncate pr-2", !notification.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>
        <p className={cn("text-sm text-gray-500 dark:text-gray-400 line-clamp-2", compact && "line-clamp-1")}>
          {notification.body}
        </p>
      </div>
      
      {!notification.isRead && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-2 h-2 bg-primary-600 rounded-full" />
      )}
    </div>
  );
};
