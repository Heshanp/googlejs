import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag, Loader2 } from 'lucide-react';
import { useChat } from '../../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { OfferCard } from './OfferCard';
import { CounterOfferModal } from './CounterOfferModal';
import { ReviewPromptModal } from '../reviews/ReviewPromptModal';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrency } from '../../../lib/utils';
import { ROUTES } from '../../../lib/routes';
import { MessagesService, ReviewsService } from '../../../services';
import { PendingReview } from '../../../types';
import { useToast } from '../../ui/Toast';
import { useMessagesStore } from '../../../store/messages.store';

interface ChatViewProps {
  conversationId: string;
  onBack?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversationId, onBack }) => {
  const {
    messages,
    latestOffer,
    conversation,
    loading,
    sendMessage,
    sendOffer,
    respondToOffer,
    counterOffer,
    withdrawOffer
  } = useChat(conversationId);
  const { user } = useAuth();
  const { success } = useToast();
  const markConversationReadLocal = useMessagesStore((s) => s.markConversationReadLocal);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const initialScrollDone = useRef<boolean>(false);
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [offerToCounter, setOfferToCounter] = useState<string | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<PendingReview | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const participantById = React.useMemo(
    () => new Map((conversation?.participants ?? []).map(participant => [participant.id, participant])),
    [conversation?.participants]
  );

  // Check if user has already reviewed for this listing
  const listing = conversation?.listing;
  const listingUrlId = listing?.publicId;
  useEffect(() => {
    const checkReviewStatus = async () => {
      if (!listing || !user || listing.status !== 'sold' || !listing.publicId) return;
      try {
        const reviews = await ReviewsService.getReviewsForListing(listing.publicId);
        const userReviewed = reviews.some(r => r.reviewerId === user.id);
        setHasReviewed(userReviewed);
      } catch (err) {
      }
    };
    checkReviewStatus();
  }, [listing, user]);

  // Only auto-scroll when there are NEW messages, not on every poll
  useEffect(() => {
    if (!scrollRef.current) return;

    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // Scroll on initial load or when new messages arrive
    if (!initialScrollDone.current || currentCount > prevCount) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      initialScrollDone.current = true;
    }

    prevMessageCountRef.current = currentCount;
  }, [messages]);

  // Only mark as read when page is visible (not in background tab)
  useEffect(() => {
    if (!conversationId) return;

    // Function to mark as read
    const markRead = () => {
      if (document.visibilityState === 'visible') {
        void MessagesService.markAsRead(conversationId);
        markConversationReadLocal(conversationId);
      }
    };

    // Mark as read on mount if visible
    markRead();

    // Mark as read when page becomes visible (user switches to this tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversationId]);

  if (loading && !conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!conversation) return <div className="p-8 text-center">Conversation not found</div>;

  const otherParticipant = conversation.participants.find(p => p.id !== user?.id) || conversation.participants[0];
  const headerTitle = listing?.title || otherParticipant?.name || 'Conversation';
  const headerKicker = listing ? 'Inquiry about' : 'Conversation with';
  const headerPrice = listing ? formatCurrency(listing.price) : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-app-color shrink-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-neutral-900 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <Link
          href={listingUrlId ? ROUTES.LISTING(listingUrlId) : `/profile/${otherParticipant?.id}`}
          className="flex items-center gap-3 min-w-0"
          aria-label={listing ? `View listing: ${listing.title}` : `View profile: ${otherParticipant?.name}`}
        >
          <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-neutral-900 border border-app-color flex items-center justify-center overflow-hidden shrink-0">
            {listing?.images?.[0]?.url ? (
              <img src={listing.images?.[0]?.url} className="w-full h-full object-cover" alt="" />
            ) : (
              <Tag className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              {headerKicker}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {headerTitle}
              {headerPrice ? ` - ${headerPrice}` : ''}
            </p>
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5" ref={scrollRef}>
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === user?.id;
          const sender = isOwn ? user || undefined : participantById.get(msg.senderId) || otherParticipant;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              sender={sender}
              previousMessage={messages[i - 1]}
              onRespondToOffer={respondToOffer}
            />
          );
        })}
      </div>

      {/* Pinned Offer (above input) - shows latest offer regardless of status */}
      {latestOffer && (
        <div className="px-4 py-3 border-t border-app-color bg-white dark:bg-neutral-950 shrink-0">
          <OfferCard
            offer={latestOffer}
            isOwnOffer={latestOffer.senderId === user?.id}
            onRespond={(offerId, accept) => respondToOffer(offerId, accept)}
            onCounter={(offerId) => {
              setOfferToCounter(offerId);
              setCounterModalOpen(true);
            }}
            onWithdraw={(offerId) => withdrawOffer(offerId)}
            onLeaveReview={() => {
              if (!listing) return;

              // Determine the correct reviewee based on our role in the transaction
              const isSeller = listing.sellerId === user?.id;
              let revieweeId: string | undefined;
              let revieweeName: string = '';
              let revieweeAvatar: string | undefined;

              if (isSeller) {
                // Seller reviews the buyer (reservedFor)
                revieweeId = listing.reservedFor;
                // Try to get buyer info from conversation participants
                const buyer = conversation.participants.find(p => p.id === listing.reservedFor);
                revieweeName = buyer?.name || 'Buyer';
                revieweeAvatar = buyer?.avatar;
              } else {
                // Buyer reviews the seller
                revieweeId = listing.sellerId;
                // Use listing.seller info if available, or try conversation participants
                revieweeName = listing.seller?.name ||
                  conversation.participants.find(p => p.id === listing.sellerId)?.name ||
                  'Seller';
                revieweeAvatar = listing.seller?.avatar ||
                  conversation.participants.find(p => p.id === listing.sellerId)?.avatar;
              }

              if (!revieweeId) {
                return;
              }

              setReviewPrompt({
                listingId: parseInt(String(listing.id), 10),
                listingTitle: listing.title,
                listingImage: listing.images?.[0]?.url,
                otherPartyId: revieweeId,
                otherPartyName: revieweeName,
                otherPartyAvatar: revieweeAvatar,
                role: isSeller ? 'seller' : 'buyer',
                soldAt: new Date().toISOString(),
              });
            }}
            reservationExpiresAt={listing?.reservationExpiresAt}
            listingStatus={listing?.status}
            hasReviewed={hasReviewed}
          />
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSendMessage={sendMessage}
        onSendOffer={sendOffer}
        listing={listing}
      />

      {/* Counter Offer Modal */}
      {latestOffer && offerToCounter && (
        <CounterOfferModal
          isOpen={counterModalOpen}
          onClose={() => {
            setCounterModalOpen(false);
            setOfferToCounter(null);
          }}
          originalOffer={latestOffer}
          onSubmit={async (amount, message) => {
            await counterOffer(offerToCounter, amount, message);
            setCounterModalOpen(false);
            setOfferToCounter(null);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewPrompt && (
        <ReviewPromptModal
          isOpen={true}
          onClose={() => setReviewPrompt(null)}
          pendingReview={reviewPrompt}
          onSuccess={() => {
            setReviewPrompt(null);
            setHasReviewed(true);
            success('Thank you for your review!');
          }}
        />
      )}
    </div>
  );
};
