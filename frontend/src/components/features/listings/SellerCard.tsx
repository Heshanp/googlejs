import React from 'react';
import { User, MessageCircle, Star, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { User as UserType } from '../../../types';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../hooks/useNavigation';
import { MessagesService } from '../../../services';
import { useToast } from '../../ui/Toast';
import { ROUTES } from '../../../lib/routes';

interface SellerCardProps {
  user: UserType;
  className?: string;
  listingId?: string;
  listingUrlId?: string;
}

export const SellerCard: React.FC<SellerCardProps> = ({ user, className, listingId, listingUrlId }) => {
  const { isAuthenticated, user: authUser } = useAuth();
  const { navigate, navigateWithAuth } = useNavigation();
  const { error } = useToast();
  const isOwner = authUser?.id === user.id;

  const memberSince = user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'a while ago';

  // Handle legacy/variable location format
  const locationStr = typeof user.location === 'string'
    ? user.location
    : user.location
      ? `${user.location.suburb}, ${user.location.city}`
      : 'Unknown location';

  const handleChat = async () => {
    if (!isAuthenticated) {
      const returnPath = listingUrlId
        ? ROUTES.LISTING(listingUrlId)
        : ROUTES.USER_PROFILE(user.id);
      navigateWithAuth(returnPath);
      return;
    }

    if (!listingId) {
      error('Listing is missing an ID');
      return;
    }

    try {
      // Use listingId to create conversation - backend determines seller from listing
      const response = await MessagesService.createConversation(listingId);
      navigate(ROUTES.CONVERSATION(response.data.data.id));
    } catch (err) {
      error('Failed to start conversation');
    }
  };

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-2xl border border-app-color p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <Link href={`/profile/${user.id}`}>
          <div className="relative">
            <Avatar
              src={user.avatar}
              fallback={user.name?.[0] || '?'}
              size="lg"
              className="w-14 h-14"
            />
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full border-2 border-white dark:border-neutral-800" title="Verified Member">
                <ShieldCheck className="w-3 h-3" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.id}`} className="hover:underline decoration-gray-400 underline-offset-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {user.name}
            </h3>
          </Link>

          <div className="flex items-center gap-1 text-yellow-500 mt-0.5">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.rating}</span>
            <span className="text-gray-400 text-sm">({user.reviewCount} reviews)</span>
          </div>

          <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{locationStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Joined {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" className="w-full gap-2" onClick={handleChat}>
            <MessageCircle className="w-4 h-4" /> Chat
          </Button>
        </div>
      )}


    </div>
  );
};
