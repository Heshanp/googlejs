'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ChatView } from '../../../components/features/messages/ChatView';
import { useNavigation } from '../../../hooks/useNavigation';

export default function ChatPage() {
    const params = useParams();
    const conversationId = params?.id as string;
    const { navigate } = useNavigation();

    return (
        <ChatView
            conversationId={conversationId}
            onBack={() => navigate('/messages')}
        />
    );
}
