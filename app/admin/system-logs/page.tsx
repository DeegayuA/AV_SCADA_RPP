// app/admin/system-logs/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getActivityLogs, clearActivityLogs_ONLY_FOR_DEMO, ActivityLogEntry } from '@/lib/activityLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, RefreshCw, Search, FilterX, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';

// Helper component to display log details more nicely
const LogDetailsView: React.FC<{ details: Record<string, any> }> = ({ details }) => {
  if (Object.keys(details).length === 0) {
    return <p className="text-xs text-muted-foreground italic">No details provided.</p>;
  }
  return (
    <ul className="list-disc pl-5 space-y-0.5 text-xs">
      {Object.entries(details).map(([key, value]) => (
        <li key={key}>
          <span className="font-semibold">{key}:</span>{' '}
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </li>
      ))}
    </ul>
  );
};


const SystemLogsPage = () => {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.currentUser);
  const [allLogs, setAllLogs] = useState<ActivityLogEntry[]>([]); // Store all fetched logs
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering and Searching State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLogs = await getActivityLogs();
      setAllLogs(fetchedLogs.slice().reverse()); // Store latest first
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError("Failed to load logs. Please try again.");
      toast.error("Log Fetch Error", { description: "Could not retrieve activity logs." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== UserRole.ADMIN) {
      toast.error("Access Denied", { description: "You must be an administrator to view this page." });
      router.replace('/admin');
      return;
    }
    fetchLogs();
  }, [currentUser, router]);

  const uniqueActionTypes = useMemo(() => {
    const types = new Set(allLogs.map(log => log.actionType).filter(type => type && type.trim() !== ''));
    return Array.from(types).sort();
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesActionType = actionTypeFilter ? log.actionType === actionTypeFilter : true;
      const matchesSearchTerm = searchTerm ? (
        log.actionType.toLowerCase().includes(searchTermLower) ||
        (log.userName && log.userName.toLowerCase().includes(searchTermLower)) ||
        (log.userId && log.userId.toLowerCase().includes(searchTermLower)) ||
        (log.pageUrl && log.pageUrl.toLowerCase().includes(searchTermLower)) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTermLower)
      ) : true;
      return matchesActionType && matchesSearchTerm;
    });
  }, [allLogs, searchTerm, actionTypeFilter]);

  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to clear all activity logs? This action is for demonstration purposes and cannot be undone.")) {
      setIsLoading(true);
      try {
        await clearActivityLogs_ONLY_FOR_DEMO();
        toast.success("Logs Cleared", { description: "All demo activity logs have been cleared." });
        fetchLogs(); // Refresh logs (will be empty)
        setActionTypeFilter(''); // Reset filter
        setSearchTerm(''); // Reset search
      } catch (e) {
        toast.error("Clear Logs Failed", { description: "Could not clear logs." });
        setIsLoading(false);
      }
    }
  };

  const resetFilters = () => {
    setActionTypeFilter('');
    setSearchTerm('');
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4"><p>Redirecting...</p></div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-5xl mx-auto shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center flex-shrink-0">
                <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-3">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <CardTitle className="text-2xl font-semibold">System Activity Logs</CardTitle>
                    <CardDescription>Review events and activities. (Demo: In-memory logs)</CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className='flex items-center gap-2'>
                    <Button variant="outline" size="icon" onClick={() => window.location.href='/api/logs/download?file=system'} title="Download System Log">
                        <Download className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => window.location.href='/api/logs/download?file=error'} title="Download Error Log">
                        <Download className="h-5 w-5 text-destructive" />
                    </Button>
                </div>
                <Button variant="outline" size="icon" onClick={fetchLogs} disabled={isLoading} title="Refresh Logs">
                    <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="sr-only">Refresh Logs</span>
                </Button>
                {process.env.NODE_ENV === 'development' && (
                    <Button variant="destructive" onClick={handleClearLogs} disabled={isLoading} title="Clear All Logs (Dev Only)">
                        <Trash2 className="h-5 w-5 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">Clear All</span>
                    </Button>
                )}
            </div>
          </div>
          {/* Filtering and Searching Controls */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:flex-grow">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search logs (user, action, details...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Action Types</SelectItem>
                {uniqueActionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchTerm || actionTypeFilter) && (
                <Button variant="ghost" onClick={resetFilters} title="Clear Filters and Search">
                    <FilterX className="h-4 w-4 mr-1.5" /> Clear
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading && <p className="text-center text-muted-foreground py-4">Loading logs...</p>}
          {error && <p className="text-center text-destructive py-4">{error}</p>}
          {!isLoading && !error && filteredLogs.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              {allLogs.length === 0 ? "No activity logs found." : "No logs match your current filters."}
            </p>
          )}
          {!isLoading && !error && filteredLogs.length > 0 && (
            <div className="space-y-4 max-h-[calc(100vh-280px)] min-h-[200px] overflow-y-auto pr-2_"> {/* Adjusted max-h */}
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-3.5 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-primary">{log.actionType}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><strong>User:</strong> {log.userName || 'N/A'} ({log.userRole || 'N/A'}) - {log.userId || 'N/A'}</p>
                    {log.pageUrl && <p><strong>Page:</strong> {log.pageUrl}</p>}
                    <p className="font-medium mt-1">Details:</p>
                    {/* Use the new LogDetailsView component */}
                    <LogDetailsView details={log.details || {}} />
                    {log.clientInfo?.userAgent && <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-[10px]"><strong>User Agent:</strong> {log.clientInfo.userAgent}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogsPage;
