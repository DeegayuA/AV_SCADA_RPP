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
import { Loader2, KeyRound } from "lucide-react";
import { Dispatch, SetStateAction } from 'react';

interface AdminViewProps {
  items: MaintenanceItem[];
  setItems: Dispatch<SetStateAction<MaintenanceItem[]>>;
}

const AdminView: React.FC<AdminViewProps> = ({ items, setItems }) => {
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
      <h1 className="text-2xl font-bold mb-4">Maintenance Configuration</h1>

      <Card className="mb-4">
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

      <Card className="mb-4">
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
              {items.map(item => (
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
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>Remove</Button>
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

      <AdminStatusView items={items} />
    </div>
  );
};

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
import { addDays, startOfMonth, endOfMonth } from "date-fns";
import { saveAs } from "file-saver";

interface AdminStatusViewProps {
  items: MaintenanceItem[];
}

interface Log {
  timestamp: string;
  itemName: string;
  itemNumber: string;
  username: string;
  filename: string;
}

const AdminStatusView: React.FC<AdminStatusViewProps> = ({ items }) => {
  // NOTE: This component relies on a file-based data persistence strategy, which is not suitable for a production environment.
  // In a production environment, a database should be used to store and retrieve status data.
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
  const [uploadLogs, setUploadLogs] = useState<Log[]>([]);

  useEffect(() => {
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
    fetchUploadLogs();
  }, []);

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
        <Tabs defaultValue="daily">
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
                                return (
                                  <TableCell key={ts} className="text-center">
                                    <div
                                      className="cursor-pointer"
                                      onClick={() => handleStatusClick(imageUrl)}
                                    >
                                      <p className={`font-bold ${status === 'Yes' ? 'text-green-500' : status === 'Delayed' ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {status}
                                      </p>
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
              <CardContent className="p-0">
                <Calendar
                  mode="single"
                  required
                  selected={date}
                  onSelect={setDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className="p-4"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload-log">
            <Card>
              <CardHeader>
                <CardTitle>Image Upload Log</CardTitle>
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
                    {uploadLogs.map((log, index) => (
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
}

const OperatorView: React.FC<OperatorViewProps> = ({ items }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const currentUser = useAppStore((state) => state.currentUser);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, itemName: string, itemNumber: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadKey = `${itemName}-${itemNumber}`;
    setUploading(uploadKey);

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
        toast.success(`Successfully uploaded image for ${itemName} #${itemNumber}`);
      } else {
        toast.error(`Failed to upload image for ${itemName} #${itemNumber}`);
      }
    } catch (error) {
      toast.error('An error occurred while uploading the image.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Maintenance Checks</h1>
      <p className="text-lg text-gray-500 mb-4">Welcome, {currentUser?.name || 'Operator'}!</p>
      {items.length === 0 ? (
        <p>No maintenance items configured.</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                  {item.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Array.from({ length: item.quantity }, (_, i) => i + 1).map(number => (
                    <li key={number} className="flex items-center justify-between p-2 border rounded-md">
                      <span>{item.name} #{number}</span>
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, item.name, number)}
                        className="hidden"
                        id={`${item.id}-${number}`}
                      />
                      <Label htmlFor={`${item.id}-${number}`} className="cursor-pointer">
                        <Button asChild disabled={uploading === `${item.name}-${number}`}>
                          <span>
                            {uploading === `${item.name}-${number}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uploading === `${item.name}-${number}` ? 'Uploading...' : 'Upload Picture'}
                          </span>
                        </Button>
                      </Label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const MaintenancePage = () => {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
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
    fetchConfig();
  }, []);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return currentUser.role === UserRole.ADMIN ? (
    <AdminView items={items} setItems={setItems} />
  ) : (
    <OperatorView items={items} />
  );
};

export default MaintenancePage;
