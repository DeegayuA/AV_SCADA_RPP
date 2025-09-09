'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ErrorLogDisplay: React.FC = () => {
  const errorLog = useAppStore((state) => state.errorLog);
  const clearErrorLog = useAppStore((state) => state.clearErrorLog);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = (error: { message: string; timestamp: string }) => {
    const errorString = `Timestamp: ${new Date(error.timestamp).toLocaleString()}\nError: ${error.message}`;
    navigator.clipboard.writeText(errorString)
      .then(() => {
        toast.success('Error details copied to clipboard.');
      })
      .catch((err) => {
        toast.error('Failed to copy error details.');
        console.error('Failed to copy text: ', err);
      });
  };

  const handleClear = () => {
    clearErrorLog();
    toast.info('Error log cleared.');
    setIsOpen(false);
  }

  const errorCount = errorLog.length;

  if (errorCount === 0) {
    return null; // Don't render anything if there are no errors
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {errorCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {errorCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuHeader className="flex justify-between items-center">
          <DropdownMenuLabel>Backend Error Log</DropdownMenuLabel>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Log</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {errorLog.slice().reverse().map((error) => (
            <DropdownMenuItem key={error.id} className="flex flex-col items-start gap-1">
              <div className="flex justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(error)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{error.message}</p>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Need to add Tooltip and TooltipProvider to the component to use it
const ErrorLogDisplayWithTooltipProvider: React.FC = () => (
    <TooltipProvider>
        <ErrorLogDisplay />
    </TooltipProvider>
)


export default ErrorLogDisplayWithTooltipProvider;
