'use client';

import React, { useEffect } from 'react';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';

// This component doesn't render any UI itself.
// Its sole purpose is to activate the useNotificationSystem hook globally.
const NotificationSystemProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useNotificationSystem(); // Initialize the notification system

  useEffect(() => {
    console.log('[NotificationSystemProvider] Mounted and notification system hook is active.');
  }, []);

  // If you want this provider to wrap children (though not strictly necessary for this hook's purpose if it's self-contained)
  // return <>{children}</>;

  // For a non-rendering provider, returning null is common.
  return null;
};

export default NotificationSystemProvider;
