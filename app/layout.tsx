// app/layout.tsx
'use client'; 

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { Toaster } from "@/components/ui/sonner";
import PageViewLogger from '@/components/PageViewLogger';
import { 
    APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_FAVICON, APP_KEYWORDS, 
    APP_LOGO_PNG_HEIGHT, APP_LOGO_PNG_WIDTH, APP_OG_IMAGE_URL, 
    APP_PUBLISHER, APP_THEME_COLOR_DARK, APP_THEME_COLOR_LIGHT, APP_URL 
} from '@/config/appConfig';
import { APP_AUTHOR, APP_NAME } from '@/config/constants';
import NotificationSystemProvider from '@/components/NotificationSystemProvider';
import ActiveAlarmsDisplay from '@/components/ActiveAlarmsDisplay';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { useAppStore } from '@/stores/appStore';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const handleAutoBackup = useAppStore((state) => state.handleAutoBackup);
  const currentUserRole = useAppStore((state) => state.currentUser?.role);

  useWebSocket(); 

  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');
    if (hasLoadedBefore) {
      setIsLoading(false);
    } else {
      sessionStorage.setItem('hasLoadedBefore', 'true');
    }

    if (currentUserRole === 'admin') {
      // Perform a backup on initial load for admin
      handleAutoBackup();

      const backupInterval = setInterval(() => {
        handleAutoBackup();
      }, 1000 * 60 * 60); // Every hour

      return () => {
        clearInterval(backupInterval);
      };
    }
  }, [currentUserRole, handleAutoBackup]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{APP_DEFAULT_TITLE}</title>
        <meta name="description" content={APP_DESCRIPTION} />
        <meta name="keywords" content={APP_KEYWORDS} />
        <meta name="author" content={APP_AUTHOR} />
        <meta name="publisher" content={APP_PUBLISHER} />
        <link rel="icon" href={APP_FAVICON} type="image/x-icon" />
        <link rel="shortcut icon" href={APP_FAVICON} type="image/x-icon" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={APP_THEME_COLOR_LIGHT} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={APP_THEME_COLOR_DARK} />
        <meta name="msapplication-TileColor" content={APP_THEME_COLOR_LIGHT} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={APP_URL} />
        <meta property="og:title" content={APP_DEFAULT_TITLE} />
        <meta property="og:description" content={APP_DESCRIPTION} />
        <meta property="og:image" content={APP_OG_IMAGE_URL} />
        <meta property="og:image:width" content={String(APP_LOGO_PNG_WIDTH)} />
        <meta property="og:image:height" content={String(APP_LOGO_PNG_HEIGHT)} />
        <meta property="og:site_name" content={APP_NAME} />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={APP_URL} />
        <meta name="twitter:title" content={APP_DEFAULT_TITLE} />
        <meta name="twitter:description" content={APP_DESCRIPTION} />
        <meta name="twitter:image" content={APP_OG_IMAGE_URL} />
        <link rel="canonical" href={APP_URL} />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class">
          {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}
          <NotificationSystemProvider />
          {children}
          <ActiveAlarmsDisplay />
          <PageViewLogger />
        </ThemeProvider>
        <Toaster richColors theme="system" position="bottom-right" closeButton />
      </body>
    </html>
  );
}