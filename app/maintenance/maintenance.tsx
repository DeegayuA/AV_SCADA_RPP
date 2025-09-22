"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { MaintenanceItem } from '@/types/maintenance';
import { Loader2, KeyRound, Settings, ArrowUp, ArrowDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Dispatch, SetStateAction } from 'react';

interface AdminViewProps {
  items: MaintenanceItem[];
  setItems: Dispatch<SetStateAction<MaintenanceItem[]>>;
  uploadLogs: Log[];
}

const AdminView: React.FC<AdminViewProps> = ({ items, setItems, uploadLogs }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [timeFrames, setTimeFrames] = useState('');
  const [itemColor, setItemColor] = useState('#000000');

  useEffect(() => {
    const checkKeyStatus = async () => {
      try {
        const response = await fetch('/api/maintenance/key');
        const data = await response.json();
        setKeyExists(data.keyExists);
      } catch (error) {
        toast.error("Failed to check encryption key status.");
      }
    };
    checkKeyStatus();
  }, []);

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const response = await fetch('/api/maintenance/key', { method: 'POST' });
      if (response.ok) {
        toast.success("New encryption key generated successfully.");
        setKeyExists(true);
      } else {
        toast.error("Failed to generate encryption key.");
      }
    } catch (error) {
      toast.error("An error occurred while generating the key.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleAddItem = () => {
    if (itemName.trim() === '') return;
    const newItem: MaintenanceItem = {
      id: new Date().toISOString(),
      name: itemName.trim(),
      quantity: itemQuantity,
      timesPerDay: timesPerDay,
      timeFrames: timeFrames,
      color: itemColor,
    };
    setItems([...items, newItem]);
    setItemName('');
    setItemQuantity(1);
    setTimesPerDay(1);
    setTimeFrames('');
    setItemColor('#000000');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const item = newItems[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    newItems[index] = newItems[swapIndex];
    newItems[swapIndex] = item;
    setItems(newItems);
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/maintenance/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
      });
      if (response.ok) {
        toast.success("Configuration saved successfully.");
      } else {
        toast.error("Failed to save configuration.");
      }
    } catch (error) {
      toast.error("An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfiguration = () => {
    setItems([]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
      </div>

      <Collapsible className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Show Setup & Configuration
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log Encryption Key</CardTitle>
            </CardHeader>
            <CardContent>
              {keyExists === null ? (
                <p>Checking key status...</p>
              ) : keyExists ? (
                <p className="text-green-500">Encryption key is set on the server.</p>
              ) : (
                <p className="text-red-500">Encryption key is not set. Please generate a key.</p>
              )}
              <Button onClick={handleGenerateKey} disabled={isGeneratingKey} className="mt-2">
                {isGeneratingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGeneratingKey ? 'Generating...' : 'Generate New Key'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Inverter"
                  />
                </div>
                <div>
                  <Label htmlFor="itemQuantity">Quantity</Label>
                  <Input
                    id="itemQuantity"
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value, 10))}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="timesPerDay">Times per Day</Label>
                  <Input
                    id="timesPerDay"
                    type="number"
                    value={timesPerDay}
                    onChange={(e) => setTimesPerDay(parseInt(e.target.value, 10))}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="timeFrames">Time Frames</Label>
                  <Input
                    id="timeFrames"
                    value={timeFrames}
                    onChange={(e) => setTimeFrames(e.target.value)}
                    placeholder="e.g., 9am, 1pm, 5pm"
                  />
                </div>
                <div>
                  <Label htmlFor="itemColor">Color</Label>
                  <Input
                    id="itemColor"
                    type="color"
                    value={itemColor}
                    onChange={(e) => setItemColor(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddItem} className="w-full">Add Item</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configured Items</CardTitle>
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearConfiguration}>Clear All</Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No maintenance items configured yet.</p>
                  <p className="text-sm">Use the form above to add items to the maintenance schedule.</p>
                </div>
              ) : (
                <ul className="space-y-2">
              {items.map((item, index) => (
                    <li key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                        <div>
                          <span className="font-bold">{item.name}</span> (x{item.quantity})
                          <p className="text-sm text-gray-500">
                            {item.timesPerDay} times per day ({item.timeFrames})
                          </p>
                        </div>
                      </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleMoveItem(index, 'down')} disabled={index === items.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>Remove</Button>
                  </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            <Button size="lg" onClick={handleSaveConfiguration} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>


      <AdminStatusView items={items} uploadLogs={uploadLogs} />
    </div>
  );
};

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isToday, getDaysInMonth, startOfMonth, addDays, endOfMonth } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange, DayProps } from "react-day-picker";
import { saveAs } from "file-saver";

import { CheckCircle, XCircle, Clock, UploadCloud } from 'lucide-react';

interface Log {
  timestamp: string;
  itemName: string;
  itemNumber: string;
  username: string;
  filename: string;
}
interface AdminStatusViewProps {
  items: MaintenanceItem[];
  uploadLogs: Log[];
}

const AdminStatusView: React.FC<AdminStatusViewProps> = ({ items, uploadLogs }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dailyStatusData, setDailyStatusData] = useState<Log[]>([]);
  const [monthlyStatusData, setMonthlyStatusData] = useState<Log[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isExporting, setIsExporting] = useState(false);
  const [logPageSize, setLogPageSize] = useState(31);
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [selectedLogDate, setSelectedLogDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('daily');

  const filteredLogs = selectedLogDate
    ? uploadLogs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === format(selectedLogDate, 'yyyy-MM-dd'))
    : uploadLogs;

  const paginatedLogs = filteredLogs.slice(
    (logCurrentPage - 1) * logPageSize,
    logCurrentPage * logPageSize
  );

  useEffect(() => {
    const fetchDailyStatus = async () => {
      try {
        const response = await fetch(`/api/maintenance/status?date=${format(date, 'yyyy-MM-dd')}`);
        if (response.ok) {
          const data = await response.json();
          setDailyStatusData(data);
        }
      } catch (error) {
        toast.error('Failed to fetch daily maintenance status.');
      }
    };
    fetchDailyStatus();
  }, [date, items]);

  useEffect(() => {
    const fetchMonthlyStatus = async () => {
      try {
        const response = await fetch(`/api/maintenance/status?month=${format(currentMonth, 'yyyy-MM')}`);
        if (response.ok) {
          const data = await response.json();
          setMonthlyStatusData(data);
        }
      } catch (error) {
        toast.error('Failed to fetch monthly maintenance status.');
      }
    };
    fetchMonthlyStatus();
  }, [currentMonth, items]);

  const handleExport = async () => {
    if (!exportDateRange?.from || !exportDateRange?.to) {
      toast.error("Please select a date range for the export.");
      return;
    }
    setIsExporting(true);
    try {
      const startDate = format(exportDateRange.from, 'yyyy-MM-dd');
      const endDate = format(exportDateRange.to, 'yyyy-MM-dd');
      const response = await fetch(`/api/maintenance/export?startDate=${startDate}&endDate=${endDate}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export data.");
      }

      const blob = await response.blob();
      saveAs(blob, `maintenance_logs_${startDate}_to_${endDate}.csv`);
      toast.success("CSV export downloaded successfully.");

    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during export.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const processLogData = (items: MaintenanceItem[], logs: any[]) => {
    const statusGrid: { [key: string]: { [key: string]: { status: string; imageUrl: string | null } } } = {};
    const parseTime = (timeStr: string) => {
      const hour = parseInt(timeStr.replace(/(am|pm)/i, ''));
      const isPM = /pm/i.test(timeStr);
      if (isPM && hour < 12) return hour + 12;
      if (!isPM && hour === 12) return 0; // 12am is midnight
      return hour;
    };

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const item of items) {
      for (let i = 1; i <= item.quantity; i++) {
        const itemInstanceId = `${item.name}-${i}`;
        statusGrid[itemInstanceId] = {};
        const timeSlots = item.timeFrames.split(',').map(t => t.trim());
        let instanceLogs = sortedLogs.filter(log => log.itemName === item.name && log.itemNumber == i);

        for (const timeSlot of timeSlots) {
          const timeSlotHour = parseTime(timeSlot);
          let foundLog = null;

          // Find the first available log for this instance
          if (instanceLogs.length > 0) {
            foundLog = instanceLogs.shift();
          }

          if (foundLog) {
            const uploadTime = new Date(foundLog.timestamp);
            const uploadHour = uploadTime.getHours();
            const imageUrl = `/maintenance_image_preview/${format(uploadTime, 'yyyy-MM-dd')}/${foundLog.filename}`;

            // Check if within the -1/+1 hour window
            if (uploadHour >= timeSlotHour - 1 && uploadHour <= timeSlotHour + 1) {
              statusGrid[itemInstanceId][timeSlot] = { status: 'Yes', imageUrl };
            } else {
              statusGrid[itemInstanceId][timeSlot] = { status: 'Delayed', imageUrl };
            }
          } else {
            statusGrid[itemInstanceId][timeSlot] = { status: 'No', imageUrl: null };
          }
        }
      }
    }
    return statusGrid;
  };

  const statusGrid = processLogData(items, dailyStatusData);

  const handleStatusClick = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setIsDialogOpen(true);
    }
  };

  const timeSlots = items.reduce((acc: string[], item) => {
    const itemTimeSlots = item.timeFrames.split(',').map(t => t.trim());
    itemTimeSlots.forEach(ts => {
      if (!acc.includes(ts)) {
        acc.push(ts);
      }
    });
    return acc;
  }, []);

  const completedDays = monthlyStatusData.reduce((acc: { [key: string]: Set<string> }, log) => {
    const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = new Set();
    }
    acc[date].add(`${log.itemName}-${log.itemNumber}`);
    return acc;
  }, {});

  const totalChecks = items.reduce((acc, item) => acc + item.quantity * item.timesPerDay, 0);

  const earliestItemDate = items.length > 0
    ? new Date(Math.min(...items.map(item => new Date(item.id).getTime())))
    : null;

  const modifiers = {
    completed: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return completedDays[dateStr] && completedDays[dateStr].size >= totalChecks;
    },
    partiallyCompleted: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return completedDays[dateStr] && completedDays[dateStr].size < totalChecks;
    },
  };

  const modifiersClassNames = {
    completed: 'bg-green-500 text-white',
    partiallyCompleted: 'bg-yellow-500 text-white',
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Maintenance Status</h2>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="upload-log">Upload Log</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="daily">
            <div className="flex justify-end mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    required
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Card>
              <CardContent className="pt-4">
                {items.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No items configured to display status.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          {timeSlots.map(ts => <TableHead key={ts} className="text-center">{ts}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(item => (
                          Array.from({ length: item.quantity }, (_, i) => i + 1).map(number => (
                            <TableRow key={`${item.id}-${number}`}>
                          <TableCell className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                            {item.name} #{number}
                          </TableCell>
                              {timeSlots.map(ts => {
                                const itemInstanceId = `${item.name}-${number}`;
                                const cellData = statusGrid[itemInstanceId]?.[ts];
                                if (!cellData) {
                                  return <TableCell key={ts} className="text-center bg-gray-100">-</TableCell>;
                                }
                                const { status, imageUrl } = cellData;
                                const statusInfo = {
                                  Yes: { icon: CheckCircle, color: 'text-green-500' },
                                  No: { icon: XCircle, color: 'text-red-500' },
                                  Delayed: { icon: Clock, color: 'text-yellow-500' },
                                };
                                const CurrentIcon = statusInfo[status as keyof typeof statusInfo]?.icon || 'div';
                                const color = statusInfo[status as keyof typeof statusInfo]?.color || 'text-gray-500';

                                return (
                                  <TableCell key={ts} className="text-center">
                                    <div
                                      className="cursor-pointer flex justify-center"
                                      onClick={() => handleStatusClick(imageUrl)}
                                    >
                                      <CurrentIcon className={`h-6 w-6 ${color}`} />
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center mb-4">
                  <Button variant="outline" onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}>
                    {"<"}
                  </Button>
                  <h3 className="text-xl font-bold mx-4">{format(currentMonth, "MMMM yyyy")}</h3>
                  <Button variant="outline" onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}>
                    {">"}
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = format(dayDate, 'yyyy-MM-dd');

                    if (earliestItemDate && dayDate < earliestItemDate) {
                      return (
                        <div key={day} className="h-12 w-12 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 text-xs text-center">
                          N/A
                        </div>
                      );
                    }

                    const completed = completedDays[dateStr] && completedDays[dateStr].size >= totalChecks;
                    const partiallyCompleted = completedDays[dateStr] && completedDays[dateStr].size < totalChecks;

                    let bgColor = 'bg-red-500'; // Missed
                    if (completed) bgColor = 'bg-green-500';
                    else if (partiallyCompleted) bgColor = 'bg-yellow-500';

                    return (
                      <div
                        key={day}
                        className={`h-12 w-12 flex items-center justify-center rounded-md text-white font-bold cursor-pointer ${bgColor}`}
                        onClick={() => {
                          setSelectedLogDate(dayDate);
                          setActiveTab('upload-log');
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload-log">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Image Upload Log</CardTitle>
                {selectedLogDate && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedLogDate(null)}>
                    Clear Filter (Showing logs for {format(selectedLogDate, "PPP")})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Thumbnail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                        <TableCell>{log.itemName} #{log.itemNumber}</TableCell>
                        <TableCell>{log.username}</TableCell>
                        <TableCell>
                          <img
                            src={`/maintenance_image_preview/${format(new Date(log.timestamp), 'yyyy-MM-dd')}/${log.filename}`}
                            alt="thumbnail"
                            className="w-16 h-16 object-cover cursor-pointer"
                            onClick={() => handleStatusClick(`/maintenance_image_preview/${format(new Date(log.timestamp), 'yyyy-MM-dd')}/${log.filename}`)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <Select value={logPageSize.toString()} onValueChange={(value) => setLogPageSize(parseInt(value))}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Items per page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="31">31 per page</SelectItem>
                        <SelectItem value="62">62 per page</SelectItem>
                        <SelectItem value="92">92 per page</SelectItem>
                        <SelectItem value="155">155 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setLogCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={logCurrentPage === 1}
                    >
                      Previous
                    </Button>
                    <span>Page {logCurrentPage} of {Math.ceil(uploadLogs.length / logPageSize)}</span>
                    <Button
                      variant="outline"
                      onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, Math.ceil(uploadLogs.length / logPageSize)))}
                      disabled={logCurrentPage === Math.ceil(uploadLogs.length / logPageSize)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Maintenance Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportDateRange?.from ? (
                          exportDateRange.to ? (
                            <>
                              {format(exportDateRange.from, "LLL dd, y")} -{" "}
                              {format(exportDateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(exportDateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={exportDateRange?.from}
                        selected={exportDateRange}
                        onSelect={setExportDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedImage && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <img src={selectedImage} alt="Maintenance Check" className="w-full h-auto" />
        </DialogContent>
      )}
    </Dialog>
  );
};

interface OperatorViewProps {
  items: MaintenanceItem[];
  uploadLogs: Log[];
  onUploadSuccess: (log: Log) => void;
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'missed';

const OperatorView: React.FC<OperatorViewProps> = ({ items, uploadLogs, onUploadSuccess }) => {
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const currentUser = useAppStore((state) => state.currentUser);

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const response = await fetch('/api/time');
        const data = await response.json();
        setServerTime(new Date(data.time));
      } catch (error) {
        console.error("Failed to fetch server time, using client time as fallback.", error);
        setServerTime(new Date());
      }
    };
    fetchServerTime();
  }, []);

  const isWithinTimeSlot = (timeFrames: string, serverTime: Date): boolean => {
    if (!timeFrames) return false;
    const now = serverTime;
    const currentHour = now.getHours();

    const slots = timeFrames.split(',').map(t => t.trim());
    return slots.some(slot => {
      const hour = parseInt(slot.replace(/(am|pm)/i, ''));
      const isPM = /pm/i.test(slot);
      let slotHour = isPM && hour < 12 ? hour + 12 : hour;
      if (!isPM && hour === 12) slotHour = 0; // 12am is midnight

      // Check if current hour is within the -1/+1 hour window
      return currentHour >= slotHour - 1 && currentHour <= slotHour + 1;
    });
  };

  useEffect(() => {
    if (!serverTime) return;
    const initialStatuses: Record<string, UploadStatus> = {};
    items.forEach(item => {
      for (let i = 1; i <= item.quantity; i++) {
        const uploadKey = `${item.name}-${i}`;
        const todaysLog = uploadLogs.find(log =>
          isToday(new Date(log.timestamp)) &&
          log.itemName === item.name &&
          log.itemNumber === i.toString()
        );
        if (todaysLog) {
          initialStatuses[uploadKey] = 'success';
        } else {
          initialStatuses[uploadKey] = isWithinTimeSlot(item.timeFrames, serverTime) ? 'pending' : 'error';
        }
      }
    });
    setStatuses(initialStatuses);
  }, [items, uploadLogs, serverTime]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, itemName: string, itemNumber: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadKey = `${itemName}-${itemNumber}`;
    setStatuses(prev => ({ ...prev, [uploadKey]: 'uploading' }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemName', itemName);
    formData.append('itemNumber', itemNumber.toString());
    formData.append('username', currentUser?.name || 'unknown');

    try {
      const response = await fetch('/api/maintenance/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newLog = await response.json();
        toast.success(`Successfully uploaded image for ${itemName} #${itemNumber}`);
        setStatuses(prev => ({ ...prev, [uploadKey]: 'success' }));
        onUploadSuccess(newLog);
      } else {
        toast.error(`Failed to upload image for ${itemName} #${itemNumber}`);
        setStatuses(prev => ({ ...prev, [uploadKey]: 'error' }));
      }
    } catch (error) {
      toast.error('An error occurred while uploading the image.');
      setStatuses(prev => ({ ...prev, [uploadKey]: 'error' }));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Maintenance Checks</h1>
      <p className="text-lg text-gray-500 mb-4">Welcome, {currentUser?.name || 'Operator'}!</p>
      {items.length === 0 ? (
        <p>No maintenance items configured.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.flatMap(item =>
            Array.from({ length: item.quantity }, (_, i) => i + 1).map(number => {
              const uploadKey = `${item.name}-${number}`;
              const status = statuses[uploadKey] || 'pending';
              const isTimeSlotActive = serverTime ? isWithinTimeSlot(item.timeFrames, serverTime) : false;

              const statusInfo = {
                pending: { icon: Clock, color: 'text-gray-500', text: 'Pending' },
                uploading: { icon: Loader2, color: 'text-blue-500', text: 'Uploading...' },
                success: { icon: CheckCircle, color: 'text-green-500', text: 'Uploaded Today' },
                error: { icon: XCircle, color: 'text-red-500', text: 'Upload Failed' },
                missed: { icon: XCircle, color: 'text-orange-500', text: 'Time Slot Missed' },
              };

              let displayStatus = status;
              if (status === 'pending' && !isTimeSlotActive && serverTime) {
                displayStatus = 'missed';
              }
              if (status === 'error' && !isTimeSlotActive && serverTime) {
                displayStatus = 'missed';
              }


              const currentStatusInfo = statusInfo[displayStatus as keyof typeof statusInfo];
              const CurrentIcon = currentStatusInfo.icon;

              return (
                <Card key={`${item.id}-${number}`} className={`flex flex-col border-2 ${displayStatus === 'success' ? 'border-green-500' : 'border-transparent'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                      {item.name} #{number}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                    <CurrentIcon className={`h-12 w-12 ${currentStatusInfo.color} ${displayStatus === 'uploading' ? 'animate-spin' : ''}`} />
                    <p className={`mt-2 font-semibold ${currentStatusInfo.color}`}>{currentStatusInfo.text}</p>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, item.name, number)}
                      className="hidden"
                      id={`${item.id}-${number}`}
                      disabled={displayStatus !== 'pending'}
                    />
                    <Label htmlFor={`${item.id}-${number}`} className="cursor-pointer w-full mt-4">
                      <Button asChild disabled={displayStatus !== 'pending'} className="w-full">
                        <span>
                          {displayStatus === 'success' ? 'Uploaded' : 'Upload Picture'}
                        </span>
                      </Button>
                    </Label>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const MaintenancePage = () => {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [uploadLogs, setUploadLogs] = useState<Log[]>([]);
  const currentUser = useAppStore((state) => state.currentUser);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/maintenance/config');
        if (response.ok) {
          const config = await response.json();
          setItems(config);
        } else {
          toast.error("Failed to fetch maintenance configuration.");
        }
      } catch (error) {
        toast.error("An error occurred while fetching the configuration.");
      }
    };

    const fetchUploadLogs = async () => {
      try {
        const response = await fetch('/api/maintenance/logs');
        if (response.ok) {
          const data = await response.json();
          setUploadLogs(data);
        } else {
          toast.error('Failed to fetch upload logs.');
        }
      } catch (error) {
        toast.error('An error occurred while fetching upload logs.');
      }
    };

    fetchConfig();
    fetchUploadLogs();
  }, []);

  const handleUploadSuccess = (newLog: Log) => {
    setUploadLogs(prevLogs => [...prevLogs, newLog]);
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return currentUser.role === UserRole.ADMIN ? (
    <AdminView items={items} setItems={setItems} uploadLogs={uploadLogs} />
  ) : (
    <OperatorView items={items} uploadLogs={uploadLogs} onUploadSuccess={handleUploadSuccess} />
  );
};

export default MaintenancePage;
