'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../hooks/useNavigation';
import { ModerationService } from '../../../services/moderation.service';
import { ModerationQueueItem, ModerationUserSummary, ModerationViolationItem } from '../../../types';
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Flag, RefreshCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function AdminModerationPage() {
  const { user, hasHydrated } = useAuth();
  const { navigate } = useNavigation();

  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending_review' | 'blocked' | 'all'>('pending_review');
  const [selectedUser, setSelectedUser] = useState<ModerationUserSummary | null>(null);
  const [violations, setViolations] = useState<ModerationViolationItem[]>([]);
  const [loadingViolations, setLoadingViolations] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const status = statusFilter === 'all' ? 'all' : statusFilter;
      const res = await ModerationService.getQueue(status, 100, 0);
      setItems(res.data || []);
    } catch (error) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = async (userId: string) => {
    setLoadingViolations(true);
    try {
      const res = await ModerationService.getUserViolations(userId, 50, 0);
      setSelectedUser(res.user || { id: userId });
      setViolations(res.violations || []);
    } catch (error) {
      setSelectedUser({ id: userId });
      setViolations([]);
    } finally {
      setLoadingViolations(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user?.isAdmin) return;
    loadQueue();
  }, [hasHydrated, user?.isAdmin, statusFilter]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <ShieldAlert className="w-10 h-10 text-amber-500" />
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Admin access required.</p>
        <Button onClick={() => navigate('/profile')}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Moderation Queue</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Review pending listings and handle manual overrides.</p>
          </div>
          <Button variant="outline" onClick={loadQueue} className="w-fit">
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="flex gap-2">
          {([
            { id: 'pending_review', label: 'Pending review' },
            { id: 'blocked', label: 'Blocked' },
            { id: 'all', label: 'All' },
          ] as const).map((option) => (
            <button
              key={option.id}
              className={`px-3 py-2 text-sm rounded-full border transition-colors ${statusFilter === option.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-neutral-900 border-app-color text-neutral-700 dark:text-neutral-300'
                }`}
              onClick={() => setStatusFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {items.length === 0 && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-app-color p-6 text-sm text-neutral-500">
                  No listings currently require manual moderation.
                </div>
              )}

              {items.map((item) => {
                const listing = item.listing;
                const listingId = listing.publicId;
                return (
                  <div key={listing.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-app-color p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{listing.title}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">ID: {listingId || 'missing-public-id'}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
                          {listing.moderationSummary || 'Publishing is taking longer than usual.'}
                        </p>
                        {item.user && (
                          <button
                            className="mt-3 text-xs text-primary-600 hover:underline"
                            onClick={() => loadViolations(item.user!.id)}
                          >
                            {item.user.name} · Violations: {item.user.violationCount} {item.user.isFlagged ? '(flagged)' : ''}
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!listingId) return;
                            await ModerationService.approveListing(String(listingId));
                            await loadQueue();
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!listingId) return;
                            await ModerationService.rejectListing(String(listingId));
                            await loadQueue();
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-app-color p-5 h-fit">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">User Violations</h2>

              {!selectedUser ? (
                <p className="text-sm text-neutral-500">Select a user from the moderation queue to inspect history.</p>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900 dark:text-white">{selectedUser.name || selectedUser.id}</p>
                    <p className="text-neutral-500">{selectedUser.email || selectedUser.id}</p>
                    <p className="text-neutral-600 dark:text-neutral-300">Violation count: {selectedUser.violationCount ?? 0}</p>
                    <p className="text-neutral-600 dark:text-neutral-300">Flagged: {selectedUser.isFlagged ? 'Yes' : 'No'}</p>
                  </div>

                  {selectedUser.isFlagged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await ModerationService.unflagUser(selectedUser.id);
                        await loadViolations(selectedUser.id);
                        await loadQueue();
                      }}
                    >
                      <Flag className="w-4 h-4 mr-1" /> Unflag User
                    </Button>
                  )}

                  {loadingViolations ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {violations.length === 0 && (
                        <p className="text-sm text-neutral-500">No violation events found.</p>
                      )}
                      {violations.map((event) => (
                        <div key={event.id} className="border border-app-color rounded-lg p-3 text-xs">
                          <p className="font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">{event.severity}</p>
                          <p className="text-neutral-600 dark:text-neutral-300 mt-1">{event.summary}</p>
                          <p className="text-neutral-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
