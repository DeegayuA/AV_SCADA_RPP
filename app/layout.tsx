// app/layout.tsx
'use client'; // This layout is a client component

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
// useRouter might not be needed here anymore if its only purpose was for the loading screen logic
// import { useRouter } from 'next/navigation'; 
import { Toaster } from "@/components/ui/sonner";
import { APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_FAVICON, APP_KEYWORDS, APP_LOGO_PNG_HEIGHT, APP_LOGO_PNG_WIDTH, APP_OG_IMAGE_URL, APP_PUBLISHER, APP_THEME_COLOR_DARK, APP_THEME_COLOR_LIGHT, APP_URL } from '@/config/appConfig';
import { APP_AUTHOR, APP_NAME } from '@/config/constants';


const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  // const router = useRouter(); // Removed as it doesn't seem to be used

  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');

    if (hasLoadedBefore) {
      setIsLoading(false);
    } else {
      // Simulate loading only on first visit per session
      sessionStorage.setItem('hasLoadedBefore', 'true');
      setIsLoading(true);
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
        <meta name="publisher" content={APP_PUBLISHER} /> {/* Often the same as author or company name */}
        
        {/* Icons */}
        <link rel="icon" href={APP_FAVICON} type="image/x-icon" />
        <link rel="shortcut icon" href={APP_FAVICON} type="image/x-icon" />

        {/* Theme Color for PWA / Mobile Browsers */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={APP_THEME_COLOR_LIGHT} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={APP_THEME_COLOR_DARK} />
        <meta name="msapplication-TileColor" content={APP_THEME_COLOR_LIGHT} /> {/* For Windows Tiles */}

        {/* Open Graph / Facebook & general social sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={APP_URL} />
        <meta property="og:title" content={APP_DEFAULT_TITLE} />
        <meta property="og:description" content={APP_DESCRIPTION} />
        <meta property="og:image" content={APP_OG_IMAGE_URL} />
        <meta property="og:image:width" content={String(APP_LOGO_PNG_WIDTH)} />
        <meta property="og:image:height" content={String(APP_LOGO_PNG_HEIGHT)} />
        <meta property="og:site_name" content={APP_NAME} />
        <meta property="og:locale" content="en_US" /> {/* Adjust if your app targets other locales */}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" /> {/* Use summary_large_image if your image is large and prominent */}
        <meta name="twitter:url" content={APP_URL} />
        <meta name="twitter:title" content={APP_DEFAULT_TITLE} />
        <meta name="twitter:description" content={APP_DESCRIPTION} />
        <meta name="twitter:image" content={APP_OG_IMAGE_URL} /> {/* Twitter can also use Open Graph image */}
        {/* <meta name="twitter:site" content="@YourTwitterHandle" /> */}
        {/* <meta name="twitter:creator" content="@CreatorTwitterHandle" /> */}

        {/* Canonical URL */}
        <link rel="canonical" href={APP_URL} />

        {/* Prevent search engine indexing if it's not a public app or in development */}
        <meta name="robots" content="noindex, nofollow" />

      </head>
      <body className={inter.className}>
        {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}
        {!isLoading && (
          <ThemeProvider attribute="class">
            {children}
          </ThemeProvider>
        )}
        <Toaster richColors theme="system" position="bottom-right" closeButton />
      </body>
    </html>
  );
}