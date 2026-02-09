import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { TextArea } from '../../ui/TextArea';
import { formatCurrency } from '../../../lib/utils';
import { Offer } from '../../../types';
import { ArrowLeftRight } from 'lucide-react';

interface CounterOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalOffer: Offer;
    onSubmit: (amount: number, message?: string) => Promise<void>;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
    isOpen,
    onClose,
    originalOffer,
    onSubmit
}) => {
    const [amount, setAmount] = useState<string>('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const counterAmount = parseFloat(amount);

        if (isNaN(counterAmount) || counterAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Counter-offer should be different from original
        if (counterAmount === originalOffer.amount / 100) {
            setError('Counter-offer must be different from the original offer');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(Math.round(counterAmount * 100), message || undefined);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to send counter-offer');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick counter options relative to original offer
    const setQuickCounter = (multiplier: number) => {
        const val = Math.round((originalOffer.amount / 100) * multiplier);
        setAmount(val.toString());
        setError(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Counter Offer"
            description={`Original offer: ${formatCurrency(originalOffer.amount / 100)}`}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Counter Offer
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError(null);
                            }}
                            placeholder="0.00"
                            className="pl-8 text-lg font-bold"
                            error={error || undefined}
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setQuickCounter(1.05)}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors whitespace-nowrap"
                        >
                            +5% ({formatCurrency((originalOffer.amount / 100) * 1.05)})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickCounter(1.1)}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors whitespace-nowrap"
                        >
                            +10% ({formatCurrency((originalOffer.amount / 100) * 1.1)})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickCounter(1.15)}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors whitespace-nowrap"
                        >
                            +15% ({formatCurrency((originalOffer.amount / 100) * 1.15)})
                        </button>
                    </div>
                </div>

                <div>
                    <TextArea
                        label="Message (Optional)"
                        placeholder="Explain your counter-offer..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex gap-3 items-start">
                    <ArrowLeftRight className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        A counter-offer will replace the original offer. The other party can accept, reject, or counter again.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} disabled={!amount}>
                        Send Counter Offer
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
