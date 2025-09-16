'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

const manualNotificationSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  sendEmail: z.boolean(),
  sendSms: z.boolean(),
}).refine(data => data.sendEmail || data.sendSms, {
  message: "At least one notification channel (Email or SMS) must be selected.",
  path: ["sendEmail"],
});

type ManualNotificationFormValues = z.infer<typeof manualNotificationSchema>;

interface ManualNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualNotificationModal: React.FC<ManualNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualNotificationFormValues>({
    resolver: zodResolver(manualNotificationSchema),
    defaultValues: {
      subject: '',
      message: '',
      sendEmail: true,
      sendSms: false,
    },
  });

  const onSubmit = async (data: ManualNotificationFormValues) => {
    setIsSubmitting(true);
    try {
      const fakeRule = {
        name: data.subject,
        severity: 'manual',
        message: data.message,
        sendEmail: data.sendEmail,
        sendSms: data.sendSms,
      };

      await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule: fakeRule, currentValue: 'Manual Send' }),
      });

      toast.success('Manual notification sent successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to send manual notification:', error);
      toast.error('Failed to send manual notification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Manual Notification</DialogTitle>
          <DialogDescription>
            Compose and send a one-off notification to the configured recipients.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., System Maintenance Announcement" {...field} />
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your message here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-4">
                <FormField
                    control={form.control}
                    name="sendEmail"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Send Email</FormLabel>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sendSms"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Send SMS</FormLabel>
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Notification'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
