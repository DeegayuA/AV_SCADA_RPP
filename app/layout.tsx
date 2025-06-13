// app/layout.tsx
'use client'; // This layout is a client component

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { Toaster } from "@/components/ui/sonner";
import { 
    APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_FAVICON, APP_KEYWORDS, 
    APP_LOGO_PNG_HEIGHT, APP_LOGO_PNG_WIDTH, APP_OG_IMAGE_URL, 
    APP_PUBLISHER, APP_THEME_COLOR_DARK, APP_THEME_COLOR_LIGHT, APP_URL 
} from '@/config/appConfig';
import { APP_AUTHOR, APP_NAME } from '@/config/constants';
import { useWebSocket } from '@/hooks/useWebSocketListener'; // Import the hook
import NotificationSystemProvider from '@/components/NotificationSystemProvider'; // Import the new provider
import ActiveAlarmsDisplay from '@/components/ActiveAlarmsDisplay'; // Import the new display component

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  // Initialize WebSocket connection and listeners
  // The hook itself handles connecting and listening for messages, including toasts.
  // We don't necessarily need to use the returned values (sendJsonMessage, etc.)
  // directly in this layout component if its only purpose here is to establish
  // the global listener for toasts.
  useWebSocket(); 

  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');

    if (hasLoadedBefore) {
      setIsLoading(false);
    } else {
      // The LoadingScreen's onDone will set isLoading to false
      sessionStorage.setItem('hasLoadedBefore', 'true');
      // setIsLoading(true); // Already true by default
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Basic SEO */}
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
        {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}
        <ThemeProvider attribute="class"> {/* Removed !isLoading condition here to always render ThemeProvider */}
          <NotificationSystemProvider />
           {/* Conditionally render children OR nothing if still loading & no pre-content wanted */}
          {!isLoading && children}
          <ActiveAlarmsDisplay /> {/* Add the alarms display here */}
        </ThemeProvider>
        <Toaster richColors theme="system" position="bottom-right" closeButton />
      </body>
    </html>
  );
}