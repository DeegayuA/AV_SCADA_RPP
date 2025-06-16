// components/PageViewLogger.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logActivity } from '@/lib/activityLog';
import { useAppStore } from '@/stores/appStore';

const PageViewLogger = () => {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const pageViewStartTimeRef = useRef<number | null>(null);
  const currentUser = useAppStore((state) => state.currentUser); // Get current user

  useEffect(() => {
    const handleRouteChange = (newPath: string) => {
      const previousPath = previousPathnameRef.current;
      const previousStartTime = pageViewStartTimeRef.current;

      // Log previous page view end if there was one
      if (previousPath && previousStartTime && currentUser) { // Only log if user is logged in
        const durationMs = Date.now() - previousStartTime;
        logActivity(
          'PAGE_VIEW_END',
          {
            path: previousPath,
            durationMs: durationMs,
            durationSeconds: parseFloat((durationMs / 1000).toFixed(2)),
          },
          previousPath // Log against the page that was exited
        );
      }

      // Log new page view start
      if (currentUser) { // Only log if user is logged in
          logActivity(
            'PAGE_VIEW_START',
            {
              path: newPath,
              previousPath: previousPath || undefined, // undefined if it's the first page view
            },
            newPath // Log against the new page
          );
      }
      previousPathnameRef.current = newPath;
      pageViewStartTimeRef.current = Date.now();
    };

    // Initial call for the first page load, and subsequent route changes
    // Only trigger if pathname has actually changed from the ref.
    if (pathname !== previousPathnameRef.current) {
        handleRouteChange(pathname);
    }

    // Attempt to log when the user leaves the site (e.g., closes tab)
    // This is best-effort and may not always work, especially for async logging.
    const handleBeforeUnload = () => {
      const currentPath = previousPathnameRef.current;
      const currentStartTime = pageViewStartTimeRef.current;
      if (currentPath && currentStartTime && currentUser) { // Only log if user is logged in
        const durationMs = Date.now() - currentStartTime;
        // Note: logActivity here might be unreliable as the browser is unloading.
        // For file-based logging, this would ideally be a synchronous beacon API call
        // or handled by server-side session tracking.
        logActivity(
          'PAGE_LEAVE_SITE', // Different action type for clarity
          {
            path: currentPath,
            durationMs: durationMs,
            durationSeconds: parseFloat((durationMs / 1000).toFixed(2)),
          },
          currentPath
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Log the final page view when the component unmounts (e.g., user logs out and layout changes)
      // This might also cover some SPA navigation scenarios if the logger is unmounted/remounted.
      const currentPath = previousPathnameRef.current;
      const currentStartTime = pageViewStartTimeRef.current;
      if (currentPath && currentStartTime && currentUser) {
        const durationMs = Date.now() - currentStartTime;
        logActivity(
          'PAGE_VIEW_END', // Or 'APP_EXIT' if more appropriate
          {
            path: currentPath,
            durationMs: durationMs,
            durationSeconds: parseFloat((durationMs / 1000).toFixed(2)),
            reason: 'Component unmount or navigation away from app scope'
          },
          currentPath
        );
      }
      // Clear refs on unmount
      previousPathnameRef.current = null;
      pageViewStartTimeRef.current = null;
    };
  }, [pathname, currentUser]); // Depend on pathname and currentUser to re-run effect

  return null; // This component does not render anything
};

export default PageViewLogger;
