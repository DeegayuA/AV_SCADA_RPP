'use client';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import React, { useEffect, useState, createContext, useContext } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const WebSocketContext = createContext<WebSocket | null>(null);
export const useWebSocket = () => useContext(WebSocketContext);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent running on the server

    const WS_URL = `ws://${window.location.hostname}:8082`; // Move inside useEffect

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("WebSocket Connected");
    ws.onmessage = (event) => console.log("Message Received:", event.data);
    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => {
      console.log("WebSocket disconnected. Reconnecting...");
      setTimeout(() => window.location.reload(), 5000);
    };

    setSocket(ws);

    return () => {
      ws.close();
      console.log("WebSocket Closed");
    };
  }, []);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body className={inter.className}>
        <ThemeProvider attribute="class">
          <Layout>{children}</Layout>
        </ThemeProvider>
      </body>
    </html>
  );
}