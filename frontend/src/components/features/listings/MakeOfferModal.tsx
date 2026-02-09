import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { TextArea } from '../../ui/TextArea';
import { formatCurrency } from '../../../lib/utils';
import { Listing } from '../../../types';
import { Tag } from 'lucide-react';

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSubmit: (amount: number, message?: string) => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSubmit
}) => {
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const offerAmount = parseFloat(amount);

    if (isNaN(offerAmount) || offerAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (offerAmount < listing.price * 0.5) {
      setError('Offer is too low (minimum 50% of asking price)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(offerAmount, message || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetOffer = (percent: number) => {
    const val = Math.floor(listing.price * percent);
    setAmount(val.toString());
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make an Offer"
      description={`Asking price: ${formatCurrency(listing.price)}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Offer
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
              onClick={() => setPresetOffer(0.9)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors whitespace-nowrap"
            >
              10% off ({formatCurrency(listing.price * 0.9)})
            </button>
            <button
              type="button"
              onClick={() => setPresetOffer(0.85)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors whitespace-nowrap"
            >
              15% off ({formatCurrency(listing.price * 0.85)})
            </button>
            <button
              type="button"
              onClick={() => setPresetOffer(0.8)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors whitespace-nowrap"
            >
              20% off ({formatCurrency(listing.price * 0.8)})
            </button>
          </div>
        </div>

        <div>
          <TextArea
            label="Message (Optional)"
            placeholder={`Hi ${listing.seller?.name || 'seller'}, I'm interested in this item...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex gap-3 items-start">
          <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Making an offer is not binding until accepted. The seller can accept, reject, or counter your offer.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!amount}>
            Send Offer
          </Button>
        </div>
      </form>
    </Modal>
  );
};