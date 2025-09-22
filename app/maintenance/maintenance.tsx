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
import { saveMaintenanceConfig, getMaintenanceConfig } from '@/lib/db';

import { Loader2, KeyRound } from "lucide-react";

const AdminView = ({ items, setItems }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [timeFrames, setTimeFrames] = useState('');

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
    };
    setItems([...items, newItem]);
    setItemName('');
    setItemQuantity(1);
    setTimesPerDay(1);
    setTimeFrames('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    await saveMaintenanceConfig(items);
    setIsSaving(false);
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <div>
                    <span className="font-bold">{item.name}</span> (x{item.quantity})
                    <p className="text-sm text-gray-500">
                      {item.timesPerDay} times per day ({item.timeFrames})
                    </p>
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

const AdminStatusView = ({ items }) => {
  // NOTE: This component relies on a file-based data persistence strategy, which is not suitable for a production environment.
  // In a production environment, a database should be used to store and retrieve status data.
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusData, setStatusData] = useState([]);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/maintenance/status?date=${format(date, 'yyyy-MM-dd')}`);
        if (response.ok) {
          const data = await response.json();
          setStatusData(data);
        }
      } catch (error) {
        toast.error('Failed to fetch maintenance status.');
      }
    };
    fetchStatus();
  }, [date, items]);

  const getStatusForCheck = (item, itemNumber, timeSlot) => {
    const logsForItemInstance = statusData.filter(log => log.itemName === item.name && log.itemNumber === itemNumber);

    // This is a very simplified time parsing.
    const parseTime = (timeStr) => {
      const hour = parseInt(timeStr.replace(/(am|pm)/, ''));
      const isPM = timeStr.includes('pm');
      return isPM && hour < 12 ? hour + 12 : hour;
    };

    const timeSlotHour = parseTime(timeSlot);

    for (const log of logsForItemInstance) {
      const uploadTime = new Date(log.timestamp);
      const uploadHour = uploadTime.getHours();

      // This logic assumes that an upload corresponds to the *earliest possible* time slot it could belong to.
      // This is still a simplification and may not be robust for all cases.
      if (uploadHour >= timeSlotHour -1 && uploadHour < timeSlotHour + 2) { // Check within a 3-hour window
        if (uploadHour > timeSlotHour) {
          return { status: 'Delayed', imageUrl: `/maintenance_image_preview/${format(uploadTime, 'yyyy-MM-dd')}/${log.filename}` };
        }
        return { status: 'Yes', imageUrl: `/maintenance_image_preview/${format(uploadTime, 'yyyy-MM-dd')}/${log.filename}` };
      }
    }

    return { status: 'No', imageUrl: null };
  };

  const handleStatusClick = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setIsDialogOpen(true);
    }
  };

  const timeSlots = items.reduce((acc, item) => {
    const itemTimeSlots = item.timeFrames.split(',').map(t => t.trim());
    itemTimeSlots.forEach(ts => {
      if (!acc.includes(ts)) {
        acc.push(ts);
      }
    });
    return acc;
  }, []);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Daily Status</h2>
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
                          <TableCell>{item.name} #{number}</TableCell>
                          {timeSlots.map(ts => {
                            const itemTimeSlots = item.timeFrames.split(',').map(t => t.trim());
                            if (!itemTimeSlots.includes(ts)) {
                              return <TableCell key={ts} className="text-center bg-gray-100">-</TableCell>;
                            }
                            const { status, imageUrl } = getStatusForCheck(item, number, ts);
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

const OperatorView = ({ items }) => {
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
      {items.length === 0 ? (
        <p>No maintenance items configured.</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
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
      const config = await getMaintenanceConfig();
      setItems(config);
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
