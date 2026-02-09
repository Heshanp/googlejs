'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useConversations } from '../../hooks/useMessages';
import { ConversationList } from '../../components/features/messages/ConversationList';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { conversations, loading } = useConversations();
    const { user } = useAuth();

    if (!user) return null;

    // Check if we are on the main messages page (list view) or a specific chat
    // We check if the pathname is exactly '/messages' or ends with '/messages' to be safe
    const isChatOpen = pathname !== '/messages' && pathname !== '/messages/';

    return (
        <div className="h-dvh min-h-screen box-border bg-gray-50 dark:bg-neutral-950 pt-[var(--app-header-offset)] pb-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col py-8 sm:py-12">
                <div className="flex-1 min-h-0 container mx-auto max-w-7xl px-4 flex">
                <div className="w-full flex bg-white/90 dark:bg-neutral-900/70 shadow border border-app-color rounded-3xl overflow-hidden min-h-0">
                    {/* List View - Hidden on mobile if chat is open */}
                    <div className={cn(
                        "w-full md:w-80 lg:w-96 border-r border-app-color flex flex-col bg-white/90 dark:bg-neutral-900/70 min-h-0",
                        isChatOpen ? "hidden md:flex" : "flex"
                    )}>
                        <ConversationList
                            conversations={conversations}
                            loading={loading}
                            className="flex-1 min-h-0 overflow-hidden flex flex-col"
                        />
                    </div>

                    {/* Chat View or Empty State - Hidden on mobile if no chat selected */}
                    <div className={cn(
                        "flex-1 bg-white/90 dark:bg-neutral-900/70 flex flex-col min-h-0",
                        !isChatOpen
                            ? "hidden md:flex"
                            : "flex fixed top-[var(--app-header-offset)] left-0 right-0 bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] z-40 md:static"
                    )}>
                        {children}
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
