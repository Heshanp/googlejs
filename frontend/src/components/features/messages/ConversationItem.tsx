import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Conversation } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';
import { cn, formatCurrency } from '../../../lib/utils';
import { differenceInHours, differenceInMinutes, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../../../hooks/useAuth';
import { getConversationRole } from '../../../lib/messages/conversation-utils';

interface ConversationItemProps {
  conversation: Conversation;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { user } = useAuth();
  const pathname = usePathname();

  const otherParticipant = conversation.participants.find(p => p.id !== user?.id) || conversation.participants[0];
  const isActive = pathname === `/messages/${conversation.id}`;
  const lastMessage = conversation.lastMessage;

  const timeAgo = React.useMemo(() => {
    if (!conversation.updatedAt) return '';
    const updated = new Date(conversation.updatedAt);
    const now = new Date();

    if (isToday(updated)) {
      const minutes = Math.max(0, differenceInMinutes(now, updated));
      if (minutes < 60) return `${Math.max(1, minutes)}m`;
      const hours = Math.max(1, differenceInHours(now, updated));
      return `${hours}h`;
    }

    if (isYesterday(updated)) {
      return 'Yesterday';
    }

    return format(updated, 'MMM d');
  }, [conversation.updatedAt]);

  const role = getConversationRole(conversation, user?.id);
  const roleLabel = role === 'unknown' ? null : role === 'selling' ? 'Selling' : 'Buying';

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 py-3 rounded-2xl border border-transparent transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900/60",
        isActive ? "bg-gray-50 dark:bg-neutral-900/80 border-app-color" : ""
      )}
    >
      <div className="relative">
        <Avatar src={otherParticipant?.avatar} fallback={otherParticipant?.name?.[0] || 'U'} size="md" />
        {/* Optional: Online indicator */}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {otherParticipant?.name}
          </h4>
          <span className={cn(
            "text-[10px] shrink-0 ml-2",
            conversation.unreadCount > 0 ? "text-primary-500" : "text-gray-400"
          )}>
            {timeAgo}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <p className={cn(
            "text-xs truncate max-w-[180px]",
            conversation.unreadCount > 0 ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
          )}>
            {lastMessage?.type === 'offer'
              ? `Offer: ${formatCurrency(lastMessage.offer?.amount || 0)}`
              : (lastMessage?.content || 'No messages yet')}
          </p>
        </div>

        {roleLabel && (
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant="neutral"
              className={cn(
                "uppercase tracking-[0.12em] text-[9px] px-2 py-0.5",
                role === 'selling'
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "border-sky-500/40 text-sky-600 dark:text-sky-400"
              )}
            >
              {roleLabel}
            </Badge>
          </div>
        )}
      </div>

      {conversation.unreadCount > 0 && (
        <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
      )}
    </Link>
  );
};
