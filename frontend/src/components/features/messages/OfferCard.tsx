import React from 'react';
import { Offer, OfferStatus } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { Check, X, Clock, ArrowLeftRight, Trash2, Star, DollarSign } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CountdownTimer } from '../../ui/CountdownTimer';
import { Button } from '../../ui/Button';

interface OfferCardProps {
  offer: Offer;
  isOwnOffer: boolean;
  onRespond?: (offerId: string, accept: boolean) => void;
  onCounter?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
  onLeaveReview?: () => void;
  hasReviewed?: boolean; // Whether the current user has already reviewed
  reservationExpiresAt?: string; // 48-hour deadline for accepted offers
  listingStatus?: string; // 'active' | 'reserved' | 'sold'
}

const getStatusConfig = (status: OfferStatus) => {
  switch (status) {
    case 'accepted':
      return { icon: Check, text: 'Accepted', color: 'text-green-500' };
    case 'rejected':
      return { icon: X, text: 'Declined', color: 'text-red-500' };
    case 'countered':
      return { icon: ArrowLeftRight, text: 'Countered', color: 'text-amber-500' };
    case 'expired':
      return { icon: Clock, text: 'Expired', color: 'text-gray-400' };
    case 'withdrawn':
      return { icon: Trash2, text: 'Withdrawn', color: 'text-gray-400' };
    default:
      return null;
  }
};

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  isOwnOffer,
  onRespond,
  onCounter,
  onWithdraw,
  onLeaveReview,
  hasReviewed,
  reservationExpiresAt,
  listingStatus
}) => {
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';
  const isSold = listingStatus === 'sold';
  const statusConfig = getStatusConfig(offer.status);

  // Calculate time until expiration
  const expiresAt = offer.expiresAt ? new Date(offer.expiresAt) : null;
  const now = new Date();
  const hoursRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : null;

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border shadow-sm",
      isOwnOffer
        ? "bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700"
        : "bg-gray-50 border-app-color text-gray-900 dark:bg-neutral-900 dark:text-white"
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center border",
            isOwnOffer
              ? "bg-primary-100 border-primary-200 text-primary-600 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300"
              : "bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300"
          )}>
            <DollarSign className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {isOwnOffer ? 'You offered' : `${offer.senderName || 'Buyer'} offered`}{' '}
              <span className="text-emerald-600 dark:text-emerald-300">
                {formatCurrency(offer.amount / 100)}
              </span>
            </div>
            {offer.listingPrice !== undefined && offer.listingPrice !== null && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Original price: {formatCurrency(offer.listingPrice)}
              </div>
            )}
          </div>

          {isPending && hoursRemaining !== null && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {hoursRemaining}h left
            </div>
          )}
        </div>

        {offer.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
            "{offer.message}"
          </p>
        )}

        {statusConfig && (
          <div className={cn("text-sm mt-3 flex items-center gap-1 font-medium", statusConfig.color)}>
            <statusConfig.icon className="w-4 h-4" />
            {statusConfig.text}
          </div>
        )}

        {/* Show Sale Complete for sold listings, or 48-hour countdown for accepted offers */}
        {isAccepted && isSold && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Sale Complete!
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              This transaction has been completed successfully.
            </div>
            {onLeaveReview && !hasReviewed && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                onClick={onLeaveReview}
                leftIcon={<Star className="w-4 h-4" />}
              >
                Leave a Review
              </Button>
            )}
            {hasReviewed && (
              <div className="mt-3 text-center text-xs text-green-600 dark:text-green-400">
                ✓ You've left a review
              </div>
            )}
          </div>
        )}
        {isAccepted && !isSold && reservationExpiresAt && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1.5">
              ⏱️ RESERVATION EXPIRES
            </div>
            <CountdownTimer
              expiresAt={reservationExpiresAt}
              size="md"
              variant="warning"
              showIcon={true}
            />
            <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
              {isOwnOffer
                ? "Complete payment within 48 hours or reservation will be released"
                : "Buyer has 48 hours to complete purchase or item will be released"}
            </div>
          </div>
        )}

        {isPending && isOwnOffer && (
          <div className="text-sm italic text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Waiting for response...
          </div>
        )}
      </div>

      {/* Actions for recipient */}
      {isPending && !isOwnOffer && (onRespond || onCounter) && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-app-color bg-white/70 dark:bg-neutral-950/40">
          {onRespond && (
            <button
              onClick={() => onRespond(offer.id, true)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Accept
            </button>
          )}
          {onCounter && (
            <button
              onClick={() => onCounter(offer.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 border border-app-color hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
            >
              Counter
            </button>
          )}
          {onRespond && (
            <button
              onClick={() => onRespond(offer.id, false)}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
            >
              Decline
            </button>
          )}
        </div>
      )}

      {/* Withdraw button for sender */}
      {isPending && isOwnOffer && onWithdraw && (
        <div className="border-t border-app-color">
          <button
            onClick={() => onWithdraw(offer.id)}
            className="w-full p-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Withdraw Offer
          </button>
        </div>
      )}
    </div>
  );
};
