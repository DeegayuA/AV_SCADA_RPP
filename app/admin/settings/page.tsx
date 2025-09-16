'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

const settingsSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  sms: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      email: '',
      sms: '',
    },
  });

  useEffect(() => {
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
  }, [form]);

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
      } else {
        toast.error('Failed to save recipient settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings.');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader className="border-b">
                <div className="flex items-center">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-3">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div>
                        <CardTitle className="text-2xl font-semibold">Notification Recipient Settings</CardTitle>
                        <CardDescription>Configure where to send notifications.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

                        <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" /> Save Settings
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
