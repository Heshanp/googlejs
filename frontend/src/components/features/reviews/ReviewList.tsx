import React from 'react';
import { Star, User } from 'lucide-react';
import { Review } from '../../../types';
import { formatDistanceToNow } from 'date-fns';

interface ReviewListProps {
    reviews: Review[];
    emptyMessage?: string;
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews, emptyMessage = 'No reviews yet' }) => {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const timeAgo = review.createdAt
        ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
        : '';

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-app-color">
            <div className="flex items-start gap-3">
                {/* Reviewer Avatar */}
                {review.reviewerAvatar ? (
                    <img
                        src={review.reviewerAvatar}
                        alt={review.reviewerName || 'Reviewer'}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {review.reviewerName?.[0]?.toUpperCase() || '?'}
                        </span>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                            {review.reviewerName || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {timeAgo}
                        </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300 dark:text-neutral-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            {review.comment}
                        </p>
                    )}

                    {/* Listing reference */}
                    {review.listingTitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            For: {review.listingTitle}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
