import React from 'react';
import { Modal } from '../../ui/Modal';
import { ReviewForm } from './ReviewForm';
import { PendingReview } from '../../../types';
import { Star, CheckCircle } from 'lucide-react';

interface ReviewPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingReview: PendingReview;
    onSuccess?: () => void;
}

export const ReviewPromptModal: React.FC<ReviewPromptModalProps> = ({
    isOpen,
    onClose,
    pendingReview,
    onSuccess,
}) => {
    const handleSuccess = () => {
        onSuccess?.();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Leave a Review">
            <div className="space-y-6">
                {/* Transaction summary */}
                <div className="bg-gray-50 dark:bg-neutral-900 rounded-xl p-4 flex items-center gap-4">
                    {pendingReview.listingImage ? (
                        <img
                            src={pendingReview.listingImage}
                            alt={pendingReview.listingTitle}
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider mb-1">
                            {pendingReview.role === 'seller' ? 'Sale Complete' : 'Purchase Complete'}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                            {pendingReview.listingTitle}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Transaction with {pendingReview.otherPartyName}
                        </p>
                    </div>
                </div>

                {/* Info text */}
                <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <Star className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p>
                        Your feedback helps build trust in the marketplace.
                        Reviews are public and help other users make informed decisions.
                    </p>
                </div>

                {/* Review form */}
                <ReviewForm
                    listingId={pendingReview.listingId}
                    revieweeId={pendingReview.otherPartyId}
                    revieweeName={pendingReview.otherPartyName}
                    revieweeAvatar={pendingReview.otherPartyAvatar}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
};
