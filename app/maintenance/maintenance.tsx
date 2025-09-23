"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { PLANT_NAME, VERSION } from '@/config/constants';
import PlcConnectionStatus from '@/app/DashboardData/PlcConnectionStatus';
import WebSocketStatus from '@/app/DashboardData/WebSocketStatus';
import SoundToggle from '@/app/DashboardData/SoundToggle';
import ThemeToggle from '@/app/DashboardData/ThemeToggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWebSocket } from '@/hooks/useWebSocketListener';
import {
  Loader2, KeyRound, Settings, ArrowUp, ArrowDown, Pencil,
  Clock, CheckCircle, XCircle, UploadCloud, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHeaderControl = React.memo(
  ({
    plcStatus, isConnected, connectWebSocket, onClickWsStatus, currentTime, delay,
    version,
  }: {
    plcStatus: "online" | "offline" | "disconnected";
    isConnected: boolean;
    connectWebSocket: () => void;
    onClickWsStatus: () => void;
    currentTime: string;
    delay: number;
    version: string;
  }) => {
    const router = useRouter();
    const headerTitle = "Maintenance";

    return (
      <>
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4 pt-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">
            {PLANT_NAME} {headerTitle}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <motion.div><PlcConnectionStatus status={plcStatus} /></motion.div>
            <motion.div>
              <WebSocketStatus isConnected={isConnected} onClick={onClickWsStatus} delay={delay} />
            </motion.div>
            <motion.div><SoundToggle /></motion.div>
            <motion.div><ThemeToggle /></motion.div>
          </div>
        </motion.div>

        <motion.div
          className="text-xs text-muted-foreground mb-4 flex flex-col sm:flex-row justify-between items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{currentTime}</span>
            {isConnected ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
                      : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`
                    }>
                      {delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="ghost" size="sm" className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground -ml-1" onClick={() => connectWebSocket()} title="Attempt manual WebSocket reconnection">
                (reconnect)
              </Button>
            )}
          </div>
          <span className='font-mono'>{version || '?.?.?'}</span>
        </motion.div>
      </>
    );
  });
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile";
import { Slider } from "@/components/ui/slider";
import { Dispatch, SetStateAction } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isToday, getDaysInMonth, startOfMonth } from "date-fns";
import { Progress } from "@/components/ui/progress";
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
import { addDays, endOfMonth } from "date-fns";
import { saveAs } from "file-saver";

interface ProgressProps {
  totalDailyChecks: number;
  todaysCompletedChecks: number;
}

interface AdminStatusViewProps extends ProgressProps {
  items: MaintenanceItem[];
  uploadLogs: Log[];
}

interface AdminViewProps extends ProgressProps {
  items: MaintenanceItem[];
  setItems: Dispatch<SetStateAction<MaintenanceItem[]>>;
  uploadLogs: Log[];
}

const ViewerView: React.FC<AdminStatusViewProps> = ({ items, uploadLogs, totalDailyChecks, todaysCompletedChecks }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Maintenance Status</h1>
      <AdminStatusView
        items={items}
        uploadLogs={uploadLogs}
        totalDailyChecks={totalDailyChecks}
        todaysCompletedChecks={todaysCompletedChecks}
      />
    </div>
  );
};

interface EditItemDialogProps {
  item: MaintenanceItem;
  onSave: (updatedItem: MaintenanceItem) => void;
  onClose: () => void;
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({ item, onSave, onClose }) => {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [timesPerDay, setTimesPerDay] = useState(item.timesPerDay);
  const [timeFrames, setTimeFrames] = useState(item.timeFrames);
  const [color, setColor] = useState(item.color);
  const [timeWindow, setTimeWindow] = useState(item.timeWindow || 60);

  const handleSave = () => {
    onSave({ ...item, name, quantity, timesPerDay, timeFrames, color, timeWindow });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Item Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-quantity">Quantity</Label>
            <Input id="edit-quantity" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <Label htmlFor="edit-timesPerDay">Times per Day</Label>
            <Input id="edit-timesPerDay" type="number" value={timesPerDay} onChange={(e) => setTimesPerDay(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <Label htmlFor="edit-timeFrames">Time Frames</Label>
            <Input id="edit-timeFrames" value={timeFrames} onChange={(e) => setTimeFrames(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-color">Color</Label>
            <Input id="edit-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-timeWindow">Time Window (minutes)</Label>
            <Slider
              id="edit-timeWindow"
              min={15}
              max={120}
              step={15}
              value={[timeWindow]}
              onValueChange={(value) => setTimeWindow(value[0])}
            />
            <div className="text-center font-bold mt-2">{timeWindow} mins</div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AdminConfigurationPanelProps {
  items: MaintenanceItem[];
  setItems: Dispatch<SetStateAction<MaintenanceItem[]>>;
}

const AdminConfigurationPanel: React.FC<AdminConfigurationPanelProps> = ({ items, setItems }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [timeFrames, setTimeFrames] = useState('');
  const [itemColor, setItemColor] = useState('#000000');
  const [timeWindow, setTimeWindow] = useState(60); // Default to 60 minutes
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);

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
      timeWindow: timeWindow,
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

  const handleSaveConfiguration = async (updatedItems: MaintenanceItem[]) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/maintenance/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItems),
      });
      if (response.ok) {
        toast.success("Configuration saved successfully.");
        setItems(updatedItems);
      } else {
        toast.error("Failed to save configuration.");
      }
    } catch (error) {
      toast.error("An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
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
    handleSaveConfiguration(newItems);
  };

  const handleUpdateItem = (updatedItem: MaintenanceItem) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    handleSaveConfiguration(newItems);
  };

  const handleClearConfiguration = () => {
    setItems([]);
  };

  return (
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
              <div>
                <Label htmlFor="itemTimeWindow">Time Window (minutes)</Label>
                <Slider
                  id="itemTimeWindow"
                  min={15}
                  max={120}
                  step={15}
                  value={[timeWindow]}
                  onValueChange={(value) => setTimeWindow(value[0])}
                />
                <div className="text-center font-bold mt-2">{timeWindow} mins</div>
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
                  <motion.li
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                      <div>
                        <span className="font-bold">{item.name}</span> (x{item.quantity})
                        <p className="text-sm text-muted-foreground">
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
                  <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>Remove</Button>
                </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button size="lg" onClick={() => handleSaveConfiguration(items)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CollapsibleContent>
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          onSave={handleUpdateItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </Collapsible>
  );
};

const AdminView: React.FC<AdminViewProps> = ({ items, setItems, uploadLogs, totalDailyChecks, todaysCompletedChecks }) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [showHelp, setShowHelp] = useState(true);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-2">Maintenance Dashboard</h1>
        <p className="text-muted-foreground mb-4">
          Welcome, {currentUser?.name}. Here you can configure maintenance schedules and view logs.
        </p>

        {currentUser?.role === UserRole.ADMIN && (
          <>
            {showHelp && (
              <Card className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-blue-800 dark:text-blue-300">How to Use This Dashboard</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>X</Button>
                </CardHeader>
                <CardContent className="text-blue-700 dark:text-blue-400">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use the <strong>Setup & Configuration</strong> section below to add, edit, or remove maintenance items.</li>
                    <li>The <strong>Monthly Calendar</strong> provides an at-a-glance overview of completion status.</li>
                    <li>Click on any day in the calendar to see the detailed logs for that date in the <strong>Image Upload Log</strong> tab.</li>
                    <li>Use the <strong>Export</strong> tab to download logs as a CSV file.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
            <AdminConfigurationPanel items={items} setItems={setItems} />
          </>
        )}
      </div>
      <div className="p-4">
        <AdminStatusView
            items={items}
            uploadLogs={uploadLogs}
            totalDailyChecks={totalDailyChecks}
            todaysCompletedChecks={todaysCompletedChecks}
        />
      </div>
    </motion.div>
  );
};

interface Log {
  timestamp: string;
  itemName: string;
  itemNumber: string;
  username: string;
  filename: string;
}

const AdminStatusView: React.FC<AdminStatusViewProps> = ({ items, uploadLogs, totalDailyChecks, todaysCompletedChecks }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [monthlyStatusData, setMonthlyStatusData] = useState<Log[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isExporting, setIsExporting] = useState(false);
  const [logPageSize, setLogPageSize] = useState(31);
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [selectedLogDate, setSelectedLogDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('monthly');

  const filteredLogs = selectedLogDate
    ? uploadLogs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === format(selectedLogDate, 'yyyy-MM-dd'))
    : uploadLogs;

  const paginatedLogs = filteredLogs.slice(
    (logCurrentPage - 1) * logPageSize,
    logCurrentPage * logPageSize
  );

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
  }, [currentMonth, items, uploadLogs]);

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

  const handleStatusClick = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setIsDialogOpen(true);
    }
  };

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

  const progressValue = totalDailyChecks > 0 ? (todaysCompletedChecks / totalDailyChecks) * 100 : 0;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="mt-4">
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Today's Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Progress value={progressValue} className="w-full" />
                    <span className="font-bold text-lg whitespace-nowrap">
                        {todaysCompletedChecks} / {totalDailyChecks}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    {Math.round(progressValue)}% of daily maintenance checks completed.
                </p>
            </CardContent>
        </Card>
        <div className="mb-4">
            <DailyChecklist items={items} uploadLogs={uploadLogs} />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Monthly Status & Logs</h2>
            <TabsList>
              <TabsTrigger value="monthly">Monthly Calendar</TabsTrigger>
              <TabsTrigger value="upload-log">Image Upload Log</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Completion Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-center items-center mb-4">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-xl font-bold mx-4 text-center w-48">{format(currentMonth, "MMMM yyyy")}</h3>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-muted-foreground text-sm">{day}</div>
                  ))}
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = format(dayDate, 'yyyy-MM-dd');

                    if (earliestItemDate && dayDate < earliestItemDate) {
                      return (
                        <motion.div
                            key={day}
                            className="h-20 sm:h-24 flex flex-col items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs text-center p-1"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: day * 0.02 }}
                        >
                          <div className="font-bold text-lg">{day}</div>
                          <div>N/A</div>
                        </motion.div>
                      );
                    }

                    const completedCount = completedDays[dateStr]?.size || 0;
                    const isComplete = completedCount >= totalChecks && totalChecks > 0;
                    const isPartial = completedCount > 0 && completedCount < totalChecks;

                    let bgColor = 'bg-red-100 dark:bg-red-900/30';
                    let textColor = 'text-red-800 dark:text-red-300';
                    let borderColor = 'border-red-200 dark:border-red-800';
                    if (isComplete) {
                      bgColor = 'bg-green-100 dark:bg-green-900/30';
                      textColor = 'text-green-800 dark:text-green-300';
                      borderColor = 'border-green-200 dark:border-green-800';
                    } else if (isPartial) {
                      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
                      textColor = 'text-yellow-800 dark:text-yellow-300';
                      borderColor = 'border-yellow-200 dark:border-yellow-800';
                    }

                    return (
                      <motion.div
                        key={day}
                        className={`h-20 sm:h-24 flex flex-col items-center justify-center rounded-md cursor-pointer border-2 ${bgColor} ${textColor} ${borderColor} transition-all hover:shadow-md hover:scale-105`}
                        onClick={() => {
                          setSelectedLogDate(dayDate);
                          setActiveTab('upload-log');
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: day * 0.02 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="font-bold text-lg">{day}</div>
                        {totalChecks > 0 && (
                           <div className="text-xs font-semibold">{completedCount}/{totalChecks}</div>
                        )}
                      </motion.div>
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
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell>{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                        <TableCell>{log.itemName} #{log.itemNumber}</TableCell>
                        <TableCell>{log.username}</TableCell>
                        <TableCell>
                          <img
                            src={`/maintenance_image_preview/${format(new Date(log.timestamp), 'yyyy-MM-dd')}/${log.filename}`}
                            alt="thumbnail"
                            className="w-16 h-16 object-cover cursor-pointer rounded-md border"
                            onClick={() => handleStatusClick(`/maintenance_image_preview/${format(new Date(log.timestamp), 'yyyy-MM-dd')}/${log.filename}`)}
                          />
                        </TableCell>
                      </motion.tr>
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
                    <span>Page {logCurrentPage} of {Math.ceil(filteredLogs.length / logPageSize)}</span>
                    <Button
                      variant="outline"
                      onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredLogs.length / logPageSize)))}
                      disabled={logCurrentPage >= Math.ceil(filteredLogs.length / logPageSize)}
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
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className="w-full sm:w-auto justify-start text-left font-normal"
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
                  <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
                    {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Export CSV
                  </Button>
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

interface DailyChecklistProps {
    items: MaintenanceItem[];
    uploadLogs: Log[];
}

const DailyChecklist: React.FC<DailyChecklistProps> = ({ items, uploadLogs }) => {
    const allChecks = items.flatMap(item => {
        const checks = [];
        for (let i = 1; i <= item.quantity; i++) {
            for (let j = 1; j <= item.timesPerDay; j++) {
                checks.push({
                    id: `${item.id}-${i}-${j}`,
                    name: `${item.name} #${i} (Check ${j})`,
                    itemName: item.name,
                    itemNumber: i.toString(),
                });
            }
        }
        return checks;
    });

    const todaysLogs = uploadLogs.filter(log => isToday(new Date(log.timestamp)));

    const checkStatus = allChecks.map(check => {
        const isCompleted = todaysLogs.some(log => log.itemName === check.itemName && log.itemNumber === check.itemNumber);
        return { ...check, completed: isCompleted };
    });

    // This is a simplified logic. A real implementation would need to handle multiple checks per item per day more robustly.
    // For now, we assume any upload for an item instance counts for one of its daily checks.
    const completedChecks = new Set(todaysLogs.map(log => `${log.itemName}-${log.itemNumber}`));

    const detailedChecklist = items.flatMap(item =>
        Array.from({ length: item.quantity }, (_, i) => i + 1).map(number => {
            const instanceId = `${item.name}-${number}`;
            const completedCount = todaysLogs.filter(log => log.itemName === item.name && log.itemNumber === number.toString()).length;
            const requiredCount = item.timesPerDay;
            const isFullyCompleted = completedCount >= requiredCount;

            return {
                id: instanceId,
                name: `${item.name} #${number}`,
                completed: isFullyCompleted,
                statusText: `${completedCount} / ${requiredCount} completed`,
                color: item.color,
            };
        })
    );


    return (
        <Card>
            <CardHeader>
                <CardTitle>Detailed Daily Checklist</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {detailedChecklist.map(check => (
                        <li key={check.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center">
                                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: check.color || '#000000' }} />
                                <span>{check.name}</span>
                            </div>
                            <div className="flex items-center">
                                {check.completed ? (
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                )}
                                <span className="text-sm text-muted-foreground">{check.statusText}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

interface OperatorViewProps extends ProgressProps {
  items: MaintenanceItem[];
  uploadLogs: Log[];
  onUploadSuccess: (log: Log) => void;
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'missed';

const OperatorView: React.FC<OperatorViewProps> = ({ items, uploadLogs, onUploadSuccess, totalDailyChecks, todaysCompletedChecks }) => {
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const currentUser = useAppStore((state) => state.currentUser);
  const [showInstructions, setShowInstructions] = useState(true);

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

  const isWithinTimeSlot = (timeFrames: string, timeWindow: number, serverTime: Date): boolean => {
    if (!timeFrames) return false;
    const now = serverTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = timeFrames.split(',').map(t => t.trim());
    return slots.some(slot => {
      const hour = parseInt(slot.replace(/(am|pm)/i, ''));
      const isPM = /pm/i.test(slot);
      let slotHour = isPM && hour < 12 ? hour + 12 : hour;
      if (!isPM && hour === 12) slotHour = 0; // 12am is midnight
      const slotMinutes = slotHour * 60;

      const halfWindow = timeWindow / 2;
      return nowMinutes >= slotMinutes - halfWindow && nowMinutes <= slotMinutes + halfWindow;
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
          initialStatuses[uploadKey] = 'pending';
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Maintenance Checks</h1>
        <div className="text-right">
          <p className="text-lg font-semibold">{currentUser?.name || 'Operator'}</p>
          <p className="text-sm text-muted-foreground">Operator View</p>
        </div>
      </div>

      {showInstructions && (
        <Card className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-amber-800 dark:text-amber-300">How to Use This Page</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowInstructions(false)}><XCircle className="h-5 w-5" /></Button>
          </CardHeader>
          <CardContent className="text-amber-700 dark:text-amber-400">
            <ul className="list-disc pl-5 space-y-1">
              <li>You can only upload photos during the designated time slots for each item.</li>
              <li>Once a photo is uploaded, it <strong>cannot be changed or deleted</strong>. Please be careful.</li>
              <li>A <strong className="text-green-600 dark:text-green-400">green</strong> card means the check is complete for today.</li>
              <li>A <strong className="text-orange-600 dark:text-orange-400">red or orange</strong> card means the time slot was missed or an upload failed.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
            <CardTitle>Today's Progress</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4">
                <Progress value={(totalDailyChecks > 0 ? (todaysCompletedChecks / totalDailyChecks) * 100 : 0)} className="w-full" />
                <span className="font-bold text-lg whitespace-nowrap">
                    {todaysCompletedChecks} / {totalDailyChecks}
                </span>
            </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <DailyChecklist items={items} uploadLogs={uploadLogs} />
      </div>

      {items.length === 0 ? (
        <p>No maintenance items configured.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.flatMap(item =>
            Array.from({ length: item.quantity }, (_, i) => i + 1).map(number => {
              const uploadKey = `${item.name}-${number}`;
              const status = statuses[uploadKey] || 'pending';
              const isTimeSlotActive = serverTime ? isWithinTimeSlot(item.timeFrames, item.timeWindow || 60, serverTime) : false;

              const statusInfo = {
                pending: { icon: Clock, color: 'text-gray-500', text: 'Pending Upload' },
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

              const isButtonDisabled = displayStatus !== 'pending' || !isTimeSlotActive;
              const buttonVariants: { [key: string]: string } = {
                pending: 'bg-primary hover:bg-primary/90',
                uploading: 'bg-blue-500 hover:bg-blue-600',
                success: 'bg-green-600 hover:bg-green-700',
                error: 'bg-red-600 hover:bg-red-700',
                missed: 'bg-gray-400 cursor-not-allowed',
              };
              const buttonText: { [key: string]: string } = {
                  pending: 'Upload Picture',
                  uploading: 'Uploading...',
                  success: 'Completed',
                  error: 'Retry Upload',
                  missed: 'Time Slot Missed'
              }

              const cardVariants = {
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
                error: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.3 } },
              };

              return (
                <motion.div
                  key={`${item.id}-${number}`}
                  variants={cardVariants}
                  initial="hidden"
                  animate={displayStatus === 'error' ? 'error' : 'visible'}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className={`flex flex-col border-2 ${displayStatus === 'success' ? 'border-green-500' : 'border-transparent'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color || '#000000' }} />
                      {item.name} #{number}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                    <CurrentIcon className={`h-12 w-12 ${currentStatusInfo.color} ${displayStatus === 'uploading' ? 'animate-spin' : ''}`} />
                    <p className={`mt-2 font-semibold ${currentStatusInfo.color}`}>{currentStatusInfo.text}</p>
                    {currentUser && (
                      <>
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileChange(e, item.name, number)}
                          className="hidden"
                          id={`${item.id}-${number}`}
                          disabled={isButtonDisabled && displayStatus !== 'error'}
                        />
                        <Label htmlFor={`${item.id}-${number}`} className={`w-full mt-4 ${isButtonDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Button
                            asChild={false}
                            disabled={isButtonDisabled && displayStatus !== 'error'}
                            className={`w-full text-white ${buttonVariants[displayStatus] || buttonVariants.pending}`}
                            onClick={() => {
                                if (!isButtonDisabled || displayStatus === 'error') {
                                    document.getElementById(`${item.id}-${number}`)?.click();
                                }
                            }}
                          >
                            <span>
                              {buttonText[displayStatus]}
                            </span>
                          </Button>
                        </Label>
                      </>
                    )}
                  </CardContent>
                  </Card>
                </motion.div>
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
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = useAppStore((state) => state.currentUser);

  // State for header
  const { connect: connectWebSocket, isConnected } = useWebSocket();
  const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [delay, setDelay] = useState<number>(0);
  const nodeValues = useAppStore(state => state.opcUaNodeValues);

  const checkPlcConnection = useCallback(async () => {
    try {
      const r = await fetch('/api/opcua/status');
      if (!r.ok) {
        setPlcStatus('disconnected');
        return;
      }
      const d = await r.json();
      const nS = d.connectionStatus;
      if (nS && ['online', 'offline', 'disconnected'].includes(nS)) {
        setPlcStatus(nS);
      } else {
        setPlcStatus('disconnected');
      }
    } catch (e) {
      setPlcStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [configResponse, logsResponse] = await Promise.all([
          fetch('/api/maintenance/config'),
          fetch('/api/maintenance/logs')
        ]);

        if (configResponse.ok) {
          const config = await configResponse.json();
          setItems(config);
        } else {
          toast.error("Failed to fetch maintenance configuration.");
        }

        if (logsResponse.ok) {
          const data = await logsResponse.json();
          setUploadLogs(data);
        } else {
          toast.error('Failed to fetch upload logs.');
        }
      } catch (error) {
        toast.error('An error occurred while fetching maintenance data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
    checkPlcConnection();
    const plcI = setInterval(checkPlcConnection, 15000);
    return () => clearInterval(plcI);
  }, [checkPlcConnection]);

  useEffect(() => {
    if (Object.keys(nodeValues).length > 0) {
      setLastUpdateTime(Date.now());
    }
  }, [nodeValues]);

  useEffect(() => {
    const uc = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' }));
    uc();
    const i = setInterval(uc, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const lagI = setInterval(() => {
      const cD = Date.now() - lastUpdateTime;
      setDelay(cD);
    }, 1000);
    return () => clearInterval(lagI);
  }, [lastUpdateTime]);

  const handleUploadSuccess = (newLog: Log) => {
    setUploadLogs(prevLogs => [...prevLogs, newLog]);
  };

  const totalDailyChecks = items.reduce((acc, item) => acc + item.quantity * item.timesPerDay, 0);
  const todaysCompletedChecks = uploadLogs.filter(log => isToday(new Date(log.timestamp))).length;

  if (!currentUser || isLoading) {
    return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin" /><p className="mt-4">Loading Maintenance Module...</p></div>;
  }

  const handleWsStatusClick = () => {
    // In the future, this could open the WS config modal, but that's a lot of state to port over.
    // For now, a simple reconnect attempt is sufficient.
    if (!isConnected) {
      connectWebSocket();
    }
  };

  const progressProps = {
      totalDailyChecks,
      todaysCompletedChecks
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <DashboardHeaderControl
        plcStatus={plcStatus}
        isConnected={isConnected}
        connectWebSocket={connectWebSocket}
        onClickWsStatus={handleWsStatusClick}
        currentTime={currentTime}
        delay={delay}
        version={VERSION}
      />
      {currentUser.role === UserRole.ADMIN && (
        <AdminView items={items} setItems={setItems} uploadLogs={uploadLogs} {...progressProps} />
      )}
      {currentUser.role === UserRole.VIEWER && (
        <ViewerView items={items} uploadLogs={uploadLogs} {...progressProps} />
      )}
      {currentUser.role === UserRole.OPERATOR && (
        <OperatorView items={items} uploadLogs={uploadLogs} onUploadSuccess={handleUploadSuccess} {...progressProps} />
      )}
    </div>
  );
};

export default MaintenancePage;
