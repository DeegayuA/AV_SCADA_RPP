'use client';

import React from 'react';
import { useAppStore, BackendError } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ClipboardCopy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const ErrorItem = ({ error }: { error: BackendError }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(error.message);
    toast.success('Error message copied to clipboard.');
  };

  return (
    <DropdownMenuItem className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {format(parseISO(error.timestamp), 'HH:mm:ss.SSS')}
        </p>
        <p className="text-sm break-words whitespace-pre-wrap">{error.message}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
        <ClipboardCopy className="h-4 w-4" />
      </Button>
    </DropdownMenuItem>
  );
};

export const ErrorLogDisplay = () => {
  const errorLog = useAppStore((state) => state.errorLog);
  const clearErrorLog = useAppStore((state) => state.clearErrorLog);

  if (errorLog.length === 0) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <AlertTriangle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          {errorLog.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-min justify-center rounded-full p-1 text-xs"
            >
              {errorLog.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Backend Error Log</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col-reverse">
          {errorLog.map((error) => (
            <ErrorItem key={error.id} error={error} />
          ))}
        </div>
        {errorLog.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  clearErrorLog();
                  toast.info('Error log cleared.');
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Log
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
