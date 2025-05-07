'use client';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { useRouter } from 'next/navigation';
import { Toaster } from "@/components/ui/sonner"


const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();


  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');

    if (hasLoadedBefore) {
      setIsLoading(false);
    } else {
      sessionStorage.setItem('hasLoadedBefore', 'true');
      setIsLoading(true);
    }
  }, []);

  return (
<html lang="en" suppressHydrationWarning>
        <head></head>
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
