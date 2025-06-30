'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X } from 'lucide-react';

interface ViewApiDataModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  data: any | null;
  isLoading: boolean;
  error?: string | null;
  onFetch?: () => void; // Optional: if we want a manual refresh button inside the modal
}

const ViewApiDataModal: React.FC<ViewApiDataModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  data,
  isLoading,
  error,
  onFetch
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex justify-between items-center">
            {title}
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 my-4"> {/* my-4 for some spacing */}
          {isLoading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading API data...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md">
              <p>Error fetching data: {error}</p>
            </div>
          )}
          {!isLoading && !error && data && (
            <pre className="text-xs p-4 bg-muted/50 dark:bg-muted/20 rounded-md whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
          {!isLoading && !error && !data && (
            <div className="p-4 text-center text-muted-foreground">
              <p>No data to display.</p>
            </div>
          )}
        </ScrollArea>

        {onFetch && (
             <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button onClick={onFetch} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh Data
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewApiDataModal;
