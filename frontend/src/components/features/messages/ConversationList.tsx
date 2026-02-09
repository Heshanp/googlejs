import React, { useDeferredValue, useMemo } from 'react';
import { Conversation } from '../../../types';
import { ConversationItem } from './ConversationItem';
import { Search } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Skeleton } from '../../ui/Skeleton';
import { useAuth } from '../../../hooks/useAuth';
import { ConversationFilter, filterConversations } from '../../../lib/messages/conversation-utils';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  className?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, loading, className }) => {
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<ConversationFilter>('all');
  const deferredSearch = useDeferredValue(search);
  const { user } = useAuth();

  const filtered = useMemo(
    () => filterConversations(conversations, { search: deferredSearch, filter: activeFilter, currentUserId: user?.id }),
    [conversations, deferredSearch, activeFilter, user?.id]
  );

  if (loading) {
    return (
      <div className={className}>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={14} />
                <Skeleton width="90%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div data-header-align-start className="px-4 pt-5 pb-4 border-b border-app-color sticky top-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur z-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h2>
        <div className="mt-4">
          <Input
            placeholder="Filter messages..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-100 dark:bg-neutral-900 rounded-2xl border-transparent focus:border-primary-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm">
          {(['all', 'buying', 'selling'] as ConversationFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={filter === activeFilter
                ? 'text-gray-900 dark:text-white font-semibold relative'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
            >
              <span className="capitalize">{filter}</span>
              {filter === activeFilter && (
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 py-2 space-y-1 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map(conv => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 text-sm">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );
};
