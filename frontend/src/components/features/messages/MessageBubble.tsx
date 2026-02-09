import React from 'react';
import { Message, User } from '../../../types';
import { cn } from '../../../lib/utils';
import { OfferCard } from './OfferCard';
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar } from '../../ui/Avatar';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User;
  previousMessage?: Message;
  onRespondToOffer?: (id: string, accept: boolean) => void;
}

// WhatsApp-style date formatting: Today, Yesterday, or date
function formatDateSeparator(date: Date): string {
  const day = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
  return `${day}, ${format(date, 'h:mm a')}`;
}

// Check if we should show date separator (different day from previous message)
function shouldShowDateSeparator(current: Date, previous?: Date): boolean {
  if (!previous) return true;
  return format(current, 'yyyy-MM-dd') !== format(previous, 'yyyy-MM-dd');
}

function getInitials(value?: string): string {
  if (!value) return '';
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  sender,
  previousMessage,
  onRespondToOffer
}) => {
  const messageDate = new Date(message.createdAt);
  const previousDate = previousMessage ? new Date(previousMessage.createdAt) : undefined;
  const showDateSeparator = shouldShowDateSeparator(messageDate, previousDate);
  const fallbackLabel = isOwn ? 'Me' : getInitials(sender?.name) || 'U';
  const avatarSrc = isOwn ? undefined : sender?.avatar;

  if (message.senderId === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col mb-3", isOwn ? "items-end" : "items-start")}>
      {/* WhatsApp-style date separator */}
      {showDateSeparator && (
        <div className="flex justify-center w-full my-3">
          <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-full shadow-sm">
            {formatDateSeparator(messageDate)}
          </span>
        </div>
      )}

      <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
        <Avatar
          src={avatarSrc}
          fallback={fallbackLabel}
          size="sm"
        />

        <div className={cn(
          "max-w-[80%] sm:max-w-[70%]",
          message.type === 'offer' ? "w-72" : "px-4 py-2 rounded-2xl",
          isOwn
            ? message.type === 'offer' ? "" : "bg-primary-600 text-white rounded-tr-sm"
            : message.type === 'offer' ? "" : "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-tl-sm"
        )}>
          {message.type === 'offer' ? (
            <OfferCard
              offer={{
                id: message.offer?.offerId || 'unknown',
                amount: message.offer?.amount || 0,
                status: message.offer?.status || 'pending',
                conversationId: message.conversationId,
                senderId: message.senderId,
                recipientId: 'unknown',
                listingId: 0,
                createdAt: message.createdAt,
                updatedAt: message.createdAt,
                message: message.content
              }}
              isOwnOffer={isOwn}
              onRespond={onRespondToOffer}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
              {message.content}
            </p>
          )}
        </div>
      </div>

      <span className={cn(
        "text-[11px] mt-1",
        isOwn ? "text-gray-500" : "text-gray-400"
      )}>
        {format(messageDate, 'h:mm a')}
      </span>
    </div>
  );
};
