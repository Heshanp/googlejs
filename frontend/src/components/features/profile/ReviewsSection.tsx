import React from 'react';
import { Star } from 'lucide-react';
import { Review, ReviewSummary, ReviewStats } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsSectionProps {
  reviews: Review[];
  summary?: ReviewSummary;
  stats?: ReviewStats;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews, summary, stats }) => {
  // Use stats if provided, otherwise use summary for backwards compatibility
  const displayStats = stats || (summary ? {
    averageRating: summary.averageRating,
    totalReviews: summary.totalReviews,
    breakdown: summary.breakdown as Record<number, number>
  } : null);

  return (
    <div className="space-y-8">
      {/* Summary */}
      {displayStats && displayStats.totalReviews > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-8 border border-yellow-100 dark:border-yellow-900/30">
          <div className="text-center shrink-0">
            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">
              {displayStats.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(displayStats.averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                    }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500">{displayStats.totalReviews} reviews</div>
          </div>

          <div className="flex-1 w-full space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = displayStats.breakdown[star] || 0;
              const percentage = displayStats.totalReviews ? (count / displayStats.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 w-12 shrink-0 font-medium text-gray-700 dark:text-gray-300">
                    {star} <Star className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-gray-500 shrink-0">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => {
          // Support both nested reviewer object (old) and flat fields (new API)
          const reviewerName = review.reviewerName || review.reviewer?.name || 'Anonymous';
          const reviewerAvatar = review.reviewerAvatar || review.reviewer?.avatar;

          return (
            <div key={review.id} className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-app-color">
              <div className="flex items-start gap-4">
                <Avatar src={reviewerAvatar} fallback={reviewerName?.[0] || '?'} />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">{reviewerName}</h4>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                          }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                  {review.listingTitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      For: {review.listingTitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {reviews.length === 0 && (
          <div className="text-center py-10 text-gray-500">No reviews yet.</div>
        )}
      </div>
    </div>
  );
};