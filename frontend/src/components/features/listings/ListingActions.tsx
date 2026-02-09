import React, { useState } from 'react';
import { Share2, MessageCircle, Flag, MoreHorizontal, Tag, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Listing } from '../../../types';
import { cn } from '../../../lib/utils';
import { MakeOfferModal } from './MakeOfferModal';
import { ShareModal } from './ShareModal';
import { Dropdown, DropdownItem } from '../../ui/Dropdown';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { useToast } from '../../ui/Toast';
import { LikeButton } from '../favorites/LikeButton';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../hooks/useNavigation';
import { ListingsService, MessagesService, OffersService } from '../../../services';
import { ROUTES } from '../../../lib/routes';

interface ListingActionsProps {
  listing: Listing;
  className?: string;
  isSticky?: boolean;
}

export const ListingActions: React.FC<ListingActionsProps> = ({ listing, className, isSticky }) => {
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { success, info, error } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { navigate, navigateWithAuth } = useNavigation();

  const listingOwnerId = listing.sellerId || listing.seller?.id || (listing as any).userId;
  const isOwner = user?.id === listingOwnerId;
  const listingUrlId = listing.publicId;

  if (!listingUrlId) return null;

  const handleOfferSubmit = async (amount: number, message?: string) => {
    try {
      // First, create or get conversation for this listing
      const convResponse = await MessagesService.createConversation(listingUrlId);
      const conversationId = convResponse.data.data.id;

      // Convert amount from dollars to cents for the API
      const amountInCents = Math.round(amount * 100);

      // Create the offer
      await OffersService.createOffer(conversationId, amountInCents, message);
      success('Offer sent successfully!');

      // Navigate to the conversation to see the offer
      navigate(ROUTES.CONVERSATION(conversationId));
    } catch (err: any) {
      error(err.message || 'Failed to send offer');
      throw err; // Re-throw to show error in modal
    }
  };

  const handleReport = () => {
    info('Listing reported. We will review it shortly.');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await ListingsService.deleteListing(listingUrlId);
      success('Listing deleted');
      navigate(ROUTES.PROFILE);
    } catch (err: any) {
      error(err?.message || 'Failed to delete listing');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleChat = async () => {
    if (!isAuthenticated) {
      navigateWithAuth(ROUTES.LISTING(listingUrlId));
      return;
    }

    try {
      const response = await MessagesService.createConversation(listingUrlId);
      navigate(ROUTES.CONVERSATION(response.data.data.id));
    } catch (err) {
      error('Failed to start conversation');
    }
  };

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      navigateWithAuth(ROUTES.LISTING(listingUrlId));
      return;
    }
    setIsOfferOpen(true);
  };

  const ActionsContent = (
    <div className={cn("flex gap-3 items-center", isOwner && "justify-end")}>
      {/* Primary Actions */}
      {!isOwner && (
        <div className="flex-1 grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="w-full gap-2 rounded-full font-bold transition-transform active:scale-95 whitespace-nowrap"
            onClick={handleMakeOffer}
          >
            <Tag className="w-5 h-5" /> Make Offer
          </Button>
          <Button
            size="lg"
            className="w-full gap-2 shadow rounded-full font-bold transition-transform active:scale-95 whitespace-nowrap"
            onClick={handleChat}
          >
            <MessageCircle className="w-5 h-5" /> Chat
          </Button>
        </div>
      )}

      {/* Secondary Actions */}
      <div className="flex gap-2 shrink-0">
        {!isOwner && (
          <LikeButton
            listingId={listingUrlId}
            price={listing.price}
            variant="action"
            size="lg"
            className="h-12 w-12 rounded-full"
          />
        )}

        <button
          onClick={() => setIsShareOpen(true)}
          className="p-3 h-12 w-12 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-app-color text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:border-gray-300"
        >
          <Share2 className="w-6 h-6" />
        </button>

        <Dropdown
          trigger={
            <button className="p-3 h-12 w-12 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-app-color text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:border-gray-300">
              <MoreHorizontal className="w-6 h-6" />
            </button>
          }
        >
          {isOwner && (
            <>
              <DropdownItem onClick={() => navigate(ROUTES.EDIT_LISTING(listingUrlId))}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit Listing
              </DropdownItem>
              <DropdownItem onClick={() => info('Mark as sold coming soon')}>
                <Tag className="w-4 h-4 mr-2" /> Mark as Sold
              </DropdownItem>
              <DropdownItem
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Listing
              </DropdownItem>
            </>
          )}
          <DropdownItem className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleReport}>
            <Flag className="w-4 h-4 mr-2" /> Report Listing
          </DropdownItem>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <>
      <div className={cn(
        isSticky
          ? "fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-app-color z-30 md:hidden pb-safe"
          : "",
        className
      )}>
        {isSticky ? <div className="container mx-auto max-w-lg">{ActionsContent}</div> : ActionsContent}
      </div>

      <MakeOfferModal
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        listing={listing}
        onSubmit={handleOfferSubmit}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        listing={listing}
      />

      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};
