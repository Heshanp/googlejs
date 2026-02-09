export type NotificationType =
  | 'message'
  | 'like'
  | 'offer'
  | 'review'
  | 'system'
  | 'price_drop'
  | 'listing_sold'
  | 'offer_accepted'
  | 'deal_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: number;
  listingPublicId?: string;
  conversationId?: string;
  actorId?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: NotificationMetadata;
  createdAt: string;
}

// Metadata for price drop notifications
export interface PriceDropMetadata {
  oldPrice: number;
  newPrice: number;
  priceWhenLiked: number;
  savingsAmount: number;
  savingsPercent: number;
  marketComparison?: string;
}

// Metadata for deal alert notifications
export interface DealAlertMetadata {
  marketAvgPrice: number;
  marketMedianPrice: number;
  pricePosition: 'great_deal' | 'below_average' | 'average' | 'above_average' | 'overpriced';
  percentile: number;
  matchReason: string;
  similarCount: number;
}

export type NotificationMetadata = PriceDropMetadata | DealAlertMetadata | Record<string, unknown>;
