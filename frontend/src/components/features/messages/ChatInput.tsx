import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, DollarSign } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import { MakeOfferModal } from '../listings/MakeOfferModal';
import { Listing } from '../../../types';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendOffer?: (amount: number) => void;
  listing?: Listing;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendOffer,
  listing,
  disabled
}) => {
  const [message, setMessage] = useState('');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    setMessage(target.value);
  };

  return (
    <div className="p-3 sm:p-4 border-t border-app-color bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-safe">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-app-color text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>

          {listing && onSendOffer && (
            <button
              type="button"
              onClick={() => setIsOfferModalOpen(true)}
              className="h-11 w-11 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center justify-center"
              title="Make Offer"
            >
              <DollarSign className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-neutral-900 rounded-2xl px-4 py-2 flex items-center border border-transparent focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 max-h-32 focus-visible:outline-none"
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className={cn(
            "rounded-xl h-11 w-11 shrink-0 transition-all bg-primary-600 hover:bg-primary-700",
            message.trim() ? "opacity-100 scale-100" : "opacity-50 scale-95"
          )}
        >
          <Send className="w-4 h-4 ml-0.5" />
        </Button>
      </form>

      {listing && onSendOffer && (
        <MakeOfferModal
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          listing={listing}
          onSubmit={(amount) => onSendOffer(amount)}
        />
      )}
    </div>
  );
};
