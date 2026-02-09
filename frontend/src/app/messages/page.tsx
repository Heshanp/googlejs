'use client';

import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '../../hooks/useNavigation';

export default function MessagesPage() {
    const { navigate } = useNavigation();

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
                <MessageSquarePlus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select a conversation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
                Choose a chat from the left to see the conversation and reply.
            </p>
            <Button
                variant="outline"
                className="mt-5"
                onClick={() => navigate('/explore')}
            >
                Browse listings
            </Button>
        </div>
    );
}
