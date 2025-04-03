'use client';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React from 'react';
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body className={inter.className}>
        <ThemeProvider attribute="class">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}