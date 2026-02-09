import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Star, ShieldCheck, Settings, Edit2, MessageCircle, Share2 } from 'lucide-react';
import { User, UserProfile } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../../lib/utils';

interface ProfileHeaderProps {
  user: User | UserProfile;
  isOwnProfile?: boolean;
  className?: string;
  stats?: {
    listingsCount: number;
    soldCount: number;
    responseRate?: string;
  };
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, isOwnProfile, stats, className }) => {
  const memberSince = user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '';
  const locationStr = user.location ? `${user.location.suburb}, ${user.location.city}` : 'Unknown';

  return (
    <div className={cn(
      'bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-app-color mb-6',
      className
    )}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Avatar Section */}
        <div className="shrink-0 relative mx-auto md:mx-0">
          <div className="relative">
            <Avatar src={user.avatar} fallback={user.name?.[0] || '?'} size="xl" className="w-24 h-24 md:w-32 md:h-32 text-2xl" />
            {user.isVerified && (
              <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1.5 rounded-full border-4 border-white dark:border-neutral-800 shadow-sm" title="Verified">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 text-center md:text-left w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {locationStr}
                </span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Joined {memberSince}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              {isOwnProfile ? (
                <>
                  <Link href="/profile/settings">
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/profile/edit">
                    <Button variant="outline" className="gap-2 rounded-full">
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button className="gap-2 rounded-full shadow">
                    <MessageCircle className="w-4 h-4" /> Chat
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {(user as UserProfile).bio && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {(user as UserProfile).bio}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 border-t border-app-color pt-6">
            <div className="text-center md:text-left">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{stats?.listingsCount || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Listings</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-1">
                {user.rating} <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{user.reviewCount} Reviews</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl font-bold text-green-600 dark:text-green-500">{stats?.soldCount || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Sold</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
