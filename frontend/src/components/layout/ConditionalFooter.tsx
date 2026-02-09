'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

// Routes where the footer should be hidden (full-screen experiences)
const HIDDEN_FOOTER_ROUTES: string[] = [];

export const ConditionalFooter: React.FC = () => {
    const pathname = usePathname();

    // Hide footer on full-screen editor pages
    const shouldHideFooter = HIDDEN_FOOTER_ROUTES.some(route =>
        pathname?.startsWith(route)
    );

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
};
