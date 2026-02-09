import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '../../ui/Button';
import { TextArea } from '../../ui/TextArea';
import { ReviewsService } from '../../../services/reviews.service';
import { useToast } from '../../ui/Toast';

interface ReviewFormProps {
    listingId: number;
    revieweeId: string;
    revieweeName: string;
    revieweeAvatar?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
    listingId,
    revieweeId,
    revieweeName,
    revieweeAvatar,
    onSuccess,
    onCancel,
}) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { success, error } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await ReviewsService.createReview({
                listingId,
                revieweeId,
                rating,
                comment: comment.trim() || undefined,
            });
            success('Review submitted successfully!');
            onSuccess?.();
        } catch (err) {
            error('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRatingLabel = (r: number) => {
        switch (r) {
            case 1: return 'Poor';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Very Good';
            case 5: return 'Excellent';
            default: return 'Select rating';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reviewer Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-app-color">
                {revieweeAvatar ? (
                    <img
                        src={revieweeAvatar}
                        alt={revieweeName}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-lg">
                        {revieweeName?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rate your experience with</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{revieweeName}</p>
                </div>
            </div>

            {/* Star Rating */}
            <div className="text-center">
                <div className="flex justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                        >
                            <Star
                                className={`w-10 h-10 transition-colors ${star <= (hoveredRating || rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-neutral-600'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {getRatingLabel(hoveredRating || rating)}
                </p>
            </div>

            {/* Comment */}
            <TextArea
                label="Comment (optional)"
                placeholder="Share your experience with this user..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right -mt-4">
                {comment.length}/500
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Skip for now
                    </Button>
                )}
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={rating === 0 || isSubmitting}
                    isLoading={isSubmitting}
                >
                    Submit Review
                </Button>
            </div>
        </form>
    );
};
