'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'info',
    isLoading = false,
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger':
            case 'warning':
                return <AlertTriangle className={`w-8 h-8 ${variant === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />;
            case 'success':
                return <CheckCircle className="w-8 h-8 text-green-500" />;
            default:
                return <Info className="w-8 h-8 text-blue-500" />;
        }
    };

    const getIconBg = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-100 dark:bg-red-900/30';
            case 'warning':
                return 'bg-amber-100 dark:bg-amber-900/30';
            case 'success':
                return 'bg-green-100 dark:bg-green-900/30';
            default:
                return 'bg-blue-100 dark:bg-blue-900/30';
        }
    };

    const getConfirmButtonClass = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 text-white';
            case 'success':
                return 'bg-green-600 hover:bg-green-700 text-white';
            default:
                return 'bg-indigo-600 hover:bg-indigo-700 text-white';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description=""
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none">
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 sm:flex-none ${getConfirmButtonClass()}`}
                    >
                        {isLoading ? 'Processing...' : confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="text-center py-4">
                <div className={`w-16 h-16 mx-auto mb-4 ${getIconBg()} rounded-full flex items-center justify-center`}>
                    {getIcon()}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    {description}
                </p>
            </div>
        </Modal>
    );
};
