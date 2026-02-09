import React, { Suspense } from 'react';
import { Inter, Outfit } from 'next/font/google';
import Script from 'next/script';
import { ConditionalHeader } from '../components/layout/ConditionalHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { ConditionalFooter } from '../components/layout/ConditionalFooter';
import { Toaster } from '../components/ui/Toast';
import { OfflineIndicator } from '../components/shared/OfflineIndicator';
import { SessionExpiredModal } from '../components/features/auth/SessionExpiredModal';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { GoogleAuthProviderWrapper } from '../components/providers/GoogleAuthProvider';
import { MessageToastListener } from '../components/providers/MessageToastListener';
import { WebSocketProvider } from '../components/providers/WebSocketProvider';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { RouteGuard } from '../components/features/auth/RouteGuard';
import './globals.css';

export const metadata = {
  title: 'JustSell - Buy & Sell Locally in New Zealand',
  description: 'New Zealand\'s trusted marketplace for buying and selling locally',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

const themeInitScript = `
(function () {
  try {
    var storedTheme = window.localStorage.getItem('theme');
    var theme = storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system' ? storedTheme : 'light';
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (e) {
    // no-op
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`} suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <GoogleAuthProviderWrapper>
            <WebSocketProvider>
              <div className="flex flex-col min-h-screen bg-background text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
                <Suspense>
                  <ConditionalHeader />
                </Suspense>
                <main className="flex-grow">
                  <ErrorBoundary>
                    <Suspense>
                      <RouteGuard>{children}</RouteGuard>
                    </Suspense>
                  </ErrorBoundary>
                </main>
                <ConditionalFooter />
                <Suspense>
                  <BottomNav />
                </Suspense>

                <Toaster />
                <OfflineIndicator />
                <Suspense>
                  <SessionExpiredModal />
                </Suspense>
                <Suspense>
                  <MessageToastListener />
                </Suspense>
              </div>
            </WebSocketProvider>
          </GoogleAuthProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
