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
import { toast } from 'sonner';
import { Save, Server } from 'lucide-react';

const smtpSettingsSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port is required'),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().email('Invalid email address'),
    pass: z.string().min(1, 'Password is required'),
  }),
});

type SmtpSettingsFormValues = z.infer<typeof smtpSettingsSchema>;

interface SmtpSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SmtpSettingsModal: React.FC<SmtpSettingsModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SmtpSettingsFormValues>({
    resolver: zodResolver(smtpSettingsSchema),
    defaultValues: {
      host: '',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
        const fetchSettings = async () => {
          try {
            const response = await fetch('/api/settings/smtp');
            if (response.ok) {
              const data = await response.json();
              form.reset(data);
            } else {
              toast.error('Failed to load SMTP settings.');
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

  const onSubmit = async (data: SmtpSettingsFormValues) => {
    try {
      const response = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success('SMTP settings saved successfully!');
        onClose();
      } else {
        toast.error('Failed to save SMTP settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-2xl font-semibold">SMTP Server Settings</DialogTitle>
                <DialogDescription>Configure the SMTP server for sending email notifications.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="host"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SMTP Host</FormLabel>
                                <FormControl>
                                    <Input placeholder="smtp.gmail.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SMTP Port</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="587" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="secure"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Use SSL/TLS</FormLabel>
                                    <FormDescription>Enable for ports like 465.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="auth.user"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SMTP User</FormLabel>
                                <FormControl>
                                    <Input placeholder="your-email@gmail.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="auth.pass"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SMTP Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormDescription>Use an app-specific password for services like Gmail.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
