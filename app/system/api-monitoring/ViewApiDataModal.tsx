'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { ApiConfig, ApiType } from '@/types/apiMonitoring';
import { fetchReadRange, TimeSeriesData } from '@/lib/apiClient';
import ApiRangeGraph from './ApiRangeGraph';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse, set, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';


interface ViewApiDataModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  apiConfig: ApiConfig | null; // Pass the full ApiConfig
  // Data, isLoading, error are now managed internally for read-range
  // For read-one/read-all, they can still be passed if parent fetches
  initialData?: any | null;
  isInitialLoading?: boolean;
  initialError?: string | null;
}

const ViewApiDataModal: React.FC<ViewApiDataModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  apiConfig,
  initialData,
  isInitialLoading,
  initialError,
}) => {
  const [rangeData, setRangeData] = useState<TimeSeriesData[] | null>(null);
  const [rangeIsLoading, setRangeIsLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const now = new Date();
  const yesterday = subDays(now, 1);

  const [startDate, setStartDate] = useState<Date>(startOfDay(yesterday));
  const [startTime, setStartTime] = useState<string>(format(startOfDay(yesterday), "HH:mm"));
  const [endDate, setEndDate] = useState<Date>(endOfDay(yesterday));
  const [endTime, setEndTime] = useState<string>(format(endOfDay(yesterday), "HH:mm"));

  // Reset internal state when modal is closed or apiConfig changes
  useEffect(() => {
    if (!isOpen) {
      setRangeData(null);
      setRangeIsLoading(false);
      setRangeError(null);
      // Optionally reset dates or not, depending on desired UX
      // setStartDate(startOfDay(subDays(new Date(), 1)));
      // setStartTime(format(startOfDay(subDays(new Date(), 1)), "HH:mm"));
      // setEndDate(endOfDay(subDays(new Date(), 1)));
      // setEndTime(format(endOfDay(subDays(new Date(), 1)), "HH:mm"));
    }
  }, [isOpen]);

  const handleFetchRangeData = useCallback(async () => {
    if (!apiConfig || apiConfig.type !== 'read-range' || !apiConfig.nodeId) {
      setRangeError("Invalid configuration for fetching range data.");
      return;
    }

    setRangeIsLoading(true);
    setRangeError(null);
    setRangeData(null);

    try {
      const startDateTime = set(startDate, {
        hours: parseInt(startTime.split(':')[0]),
        minutes: parseInt(startTime.split(':')[1]),
        seconds: 0,
        milliseconds: 0,
      });
      const endDateTime = set(endDate, {
        hours: parseInt(endTime.split(':')[0]),
        minutes: parseInt(endTime.split(':')[1]),
        seconds: 59, // Fetch up to the end of the minute
        milliseconds: 999,
      });

      if (startDateTime >= endDateTime) {
        toast.error("Start date/time must be before end date/time.");
        setRangeIsLoading(false);
        return;
      }

      const result = await fetchReadRange(apiConfig, apiConfig.nodeId, startDateTime.toISOString(), endDateTime.toISOString());
      if (result) {
        setRangeData(result);
      } else {
        setRangeData([]); // Ensure it's an empty array for "no data" graph message
        setRangeError('Failed to fetch data or no data returned. The API might be offline or the range is empty.');
        toast.warning('No data returned for the selected range.', { description: 'The API might be offline or the range contains no records.'});
      }
    } catch (error: any) {
      console.error("Error fetching read-range data:", error);
      setRangeError(error.message || 'An unknown error occurred while fetching range data.');
      toast.error('Error fetching range data.', { description: error.message });
    } finally {
      setRangeIsLoading(false);
    }
  }, [apiConfig, startDate, startTime, endDate, endTime]);

  // Automatically fetch data when modal opens for read-range if dates are set
  useEffect(() => {
    if (isOpen && apiConfig?.type === 'read-range' && apiConfig.nodeId) {
        // Check if default dates are valid and then fetch.
        // Or, require user to click "Load Graph" button initially.
        // For now, let's require a button click to avoid auto-load on every open if not desired.
        // If you want auto-load: handleFetchRangeData();
    }
  }, [isOpen, apiConfig, handleFetchRangeData]);


  const renderContent = () => {
    if (apiConfig?.type === 'read-range') {
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end p-4 border-b">
            <div>
              <Label htmlFor="startDate" className="text-xs">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal mt-1", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="startTime" className="text-xs">Start Time (HH:mm)</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal mt-1", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="endTime" className="text-xs">End Time (HH:mm)</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="p-4">
             <Button onClick={handleFetchRangeData} disabled={rangeIsLoading} className="w-full sm:w-auto">
                {rangeIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load Graph Data
              </Button>
          </div>

          <ApiRangeGraph apiData={rangeData} isLoading={rangeIsLoading} error={rangeError} />
        </>
      );
    }

    // Fallback for read-one and read-all (uses parent-passed data)
    if (isInitialLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading API data...</p>
        </div>
      );
    }
    if (initialError && !isInitialLoading) {
      return (
        <div className="p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md">
          <p>Error fetching data: {initialError}</p>
        </div>
      );
    }
    if (!isInitialLoading && !initialError && initialData) {
      return (
        <pre className="text-xs p-4 bg-muted/50 dark:bg-muted/20 rounded-md whitespace-pre-wrap break-all">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      );
    }
    return ( // Default for non-range if no data and not loading/error
        <div className="p-4 text-center text-muted-foreground">
            <p>No data to display.</p>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex justify-between items-center">
            {apiConfig ? `${apiConfig.name} - ${apiConfig.type}` : title}
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 my-0"> {/* Removed my-4 for range inputs */}
          {renderContent()}
        </ScrollArea>

        {/* Footer can be conditional or removed if not needed for range view */}
        {/* For instance, the refresh button might be specific to parent-fetched data */}
        {/* {apiConfig?.type !== 'read-range' && onFetch && (
             <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button onClick={onFetch} disabled={isInitialLoading}>
                    {isInitialLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh Data
                </Button>
            </DialogFooter>
        )} */}
      </DialogContent>
    </Dialog>
  );
};

export default ViewApiDataModal;
