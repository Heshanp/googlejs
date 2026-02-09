'use client';

import React from 'react';
import { ConfirmationModal } from '../../ui/ConfirmationModal';

interface FreeListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmFree: () => void;
    onSetPrice: () => void;
}

export const FreeListingModal: React.FC<FreeListingModalProps> = ({
    isOpen,
    onClose,
    onConfirmFree,
    onSetPrice,
}) => {
    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirmFree}
            title="Is this item free?"
            description="If you're giving this item away for free, confirm below. Otherwise, go back and set a price."
            confirmLabel="Yes, It's Free"
            cancelLabel="Set a Price"
            variant="success"
        />
    );
};
