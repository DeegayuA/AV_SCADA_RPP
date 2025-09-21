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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Sun } from 'lucide-react';

const sunsetEmailSettingsSchema = z.object({
  enabled: z.boolean(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  currency: z.string().min(1, 'Currency is required'),
  rate: z.number().min(0, 'Rate must be a positive number'),
});

type SunsetEmailSettingsFormValues = z.infer<typeof sunsetEmailSettingsSchema>;

interface SunsetEmailConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SunsetEmailConfigModal: React.FC<SunsetEmailConfigModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SunsetEmailSettingsFormValues>({
    resolver: zodResolver(sunsetEmailSettingsSchema),
    defaultValues: {
      enabled: false,
      subject: 'Daily Sunset Report',
      message: 'Hello,\n\nHere is your daily summary:\n\n- Todays Generation: {{generationValue}} kWh\n- Estimated Earnings: {{earnings}} {{currency}}\n\nThank you!',
      currency: 'USD',
      rate: 0.15,
    },
  });

  useEffect(() => {
    if (isOpen) {
        const fetchSettings = async () => {
          try {
            // TODO: Create this API endpoint
            const response = await fetch('/api/settings/sunset-email');
            if (response.ok) {
              const data = await response.json();
              form.reset(data);
            } else {
              // It's ok if it fails, we'll use the default values
            }
          } catch (error) {
            // It's ok if it fails, we'll use the default values
          } finally {
            setIsLoading(false);
          }
        };
        fetchSettings();
    }
  }, [isOpen, form]);

  const onSubmit = async (data: SunsetEmailSettingsFormValues) => {
    try {
      // TODO: Create this API endpoint
      const response = await fetch('/api/settings/sunset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success('Sunset email settings saved successfully!');
        onClose();
      } else {
        toast.error('Failed to save sunset email settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle className="text-2xl font-semibold flex items-center gap-2"><Sun className="w-6 h-6"/>Sunset Email Settings</DialogTitle>
                <DialogDescription>Configure the automated email sent daily after sunset.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Enable Sunset Email</FormLabel>
                                    <FormDescription>Turn this on to send an email every day at sunset.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Subject</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your Daily Sunset Report" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Enter your email message here..." {...field} rows={10} />
                                </FormControl>
                                <FormDescription>
                                    You can use variables like {{generationValue}}, {{earnings}}, and {{currency}}.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <FormControl>
                                        <Input placeholder="USD" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rate (for earnings calculation)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="0.15" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
