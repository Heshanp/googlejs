'use client';

import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationItem } from '../../components/features/notifications/NotificationItem';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { CheckCheck, BellOff } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { PageShell } from '../../components/layout/PageShell';
import { PageHeader } from '../../components/layout/PageHeader';

export default function NotificationsPage() {
  const { notifications, markAllAsRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const groupNotifications = (notifs: typeof notifications) => {
    const groups = {
      today: [] as typeof notifications,
      yesterday: [] as typeof notifications,
      thisWeek: [] as typeof notifications,
      earlier: [] as typeof notifications
    };

    notifs.forEach(n => {
      const date = new Date(n.createdAt);
      if (isToday(date)) groups.today.push(n);
      else if (isYesterday(date)) groups.yesterday.push(n);
      else if (isThisWeek(date)) groups.thisWeek.push(n);
      else groups.earlier.push(n);
    });

    return groups;
  };

  const groups = groupNotifications(filteredNotifications);

  const GroupSection = ({ title, items }: { title: string, items: typeof notifications }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 ml-1">{title}</h3>
        <div className="space-y-0">
          {items.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        right={unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            onClick={() => markAllAsRead()}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        ) : null}
        belowTitle={
          <Tabs
            activeTab={filter}
            onChange={setFilter}
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread', count: unreadCount > 0 ? unreadCount : undefined }
            ]}
          />
        }
      />

      <div className="container mx-auto max-w-2xl px-4 py-6">
        {filteredNotifications.length > 0 ? (
          <div className="animate-in fade-in duration-300">
            <GroupSection title="Today" items={groups.today} />
            <GroupSection title="Yesterday" items={groups.yesterday} />
            <GroupSection title="This Week" items={groups.thisWeek} />
            <GroupSection title="Earlier" items={groups.earlier} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <BellOff className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500 max-w-xs">
              We'll let you know when something important happens with your account or listings.
            </p>
            {filter === 'unread' && (
              <Button variant="outline" className="mt-6" onClick={() => setFilter('all')}>
                View all notifications
              </Button>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
