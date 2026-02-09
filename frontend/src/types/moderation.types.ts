import { Listing } from './listing.types';

export interface ModerationQueueUser {
  id: string;
  email: string;
  name: string;
  violationCount: number;
  isFlagged: boolean;
}

export interface ModerationQueueItem {
  listing: Listing;
  user?: ModerationQueueUser;
}

export interface ModerationViolationItem {
  id: number;
  userId: string;
  listingId?: number;
  contentFingerprint: string;
  decision: 'clean' | 'flagged' | 'review_required';
  severity: 'clean' | 'medium' | 'high' | 'critical';
  summary: string;
  violations: Array<{
    code: string;
    category: string;
    severity: 'medium' | 'high' | 'critical';
    reason: string;
  }>;
  createdAt: string;
}

export interface ModerationUserSummary {
  id: string;
  email?: string;
  name?: string;
  violationCount?: number;
  isFlagged?: boolean;
}
