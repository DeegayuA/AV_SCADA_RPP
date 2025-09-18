'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Mail, Phone } from 'lucide-react';

const settingsSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  sms: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      email: '',
      sms: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        const fetchSettings = async () => {
          try {
            const response = await fetch('/api/settings/recipients');
            if (response.ok) {
              const data = await response.json();
              form.reset(data);
            } else {
              toast.error('Failed to load recipient settings.');
            }
          } catch (error) {
            toast.error('An error occurred while fetching settings.');
          } finally {
            setIsLoading(false);
          }
        };
        fetchSettings();
    }
  }, [isOpen, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const response = await fetch('/api/settings/recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success('Recipient settings saved successfully!');
        onClose();
      } else {
        toast.error('Failed to save recipient settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-2xl font-semibold">Notification Recipient Settings</DialogTitle>
                <DialogDescription>Configure where to send notifications.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
                    <div>
                        <h3 className="text-lg font-medium flex items-center mb-4"><Mail className="mr-2 h-5 w-5 text-primary" /> Email Configuration</h3>
                        <div className="space-y-4 p-4 border rounded-lg">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Recipient Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="user@example.com" {...field} />
                                        </FormControl>
                                        <FormDescription>The email address to send notifications to.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium flex items-center mb-4"><Phone className="mr-2 h-5 w-5 text-primary" /> SMS Configuration</h3>
                        <div className="space-y-4 p-4 border rounded-lg">
                            <FormField
                                control={form.control}
                                name="sms"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Recipient Phone Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1234567890" {...field} />
                                        </FormControl>
                                        <FormDescription>The phone number to send SMS notifications to (simulation only).</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Note: The SMTP server (for sending emails) is configured on the server side in the `config/notification.config.ts` file for security reasons.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">
                            <Save className="mr-2 h-4 w-4" /> Save Settings
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}
