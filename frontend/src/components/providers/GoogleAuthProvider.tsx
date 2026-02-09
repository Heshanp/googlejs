'use client';

import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface GoogleAuthProviderProps {
    children: React.ReactNode;
}

export const GoogleAuthProviderWrapper: React.FC<GoogleAuthProviderProps> = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) {
        return <>{children}</>;
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {children}
        </GoogleOAuthProvider>
    );
};
