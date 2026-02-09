import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Copy, Facebook, Twitter, MessageCircle, Check } from 'lucide-react';
import { Listing } from '../../../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, listing }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href; // In real app, might be a canonical URL

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${listing.title} on Justsell`,
          text: listing.description.substring(0, 100),
          url: shareUrl,
        });
        onClose();
      } catch (err) {
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Listing" size="sm">
      <div className="space-y-6">
        {/* Social Buttons */}
        <div className="grid grid-cols-3 gap-4">
           <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
             <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center">
               <Facebook className="w-5 h-5" />
             </div>
             <span className="text-xs font-medium">Facebook</span>
           </button>
           
           <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
             <div className="w-10 h-10 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center">
               <Twitter className="w-5 h-5" />
             </div>
             <span className="text-xs font-medium">Twitter</span>
           </button>
           
           <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
             <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center">
               <MessageCircle className="w-5 h-5" />
             </div>
             <span className="text-xs font-medium">WhatsApp</span>
           </button>
        </div>

        {/* Copy Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Copy Link
          </label>
          <div className="flex gap-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="bg-gray-50 dark:bg-neutral-800"
            />
            <Button onClick={handleCopy} variant={copied ? "secondary" : "primary"} className="w-24 shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Native Share */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button variant="outline" fullWidth onClick={handleNativeShare}>
            More Options...
          </Button>
        )}
      </div>
    </Modal>
  );
};