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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, Mail, Briefcase, DollarSign, Users } from 'lucide-react';
import { UserRole } from '@/types/auth';

const scheduledEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  rate: z.number().min(0, 'Rate must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
});

type ScheduledEmailFormValues = z.infer<typeof scheduledEmailSchema>;

interface ScheduledEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduledEmailModal: React.FC<ScheduledEmailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ScheduledEmailFormValues>({
    resolver: zodResolver(scheduledEmailSchema),
    defaultValues: {
      subject: 'Daily Generation Report',
      message: 'Hello,\n\nToday\'s total generation was {{today_generation}} kWh.\n\nThis translates to an estimated earnings of {{earnings}}.\n\nBest regards,\nAV Power Plant',
      rate: 0,
      currency: 'LKR',
      roles: [UserRole.ADMIN],
    },
  });

  const onSubmit = async (data: ScheduledEmailFormValues) => {
    setIsSubmitting(true);
    // TODO: Save the scheduled email configuration to the database
    console.log(data);
    toast.success('Scheduled email saved successfully!');
    onClose();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scheduled Email Report</DialogTitle>
          <DialogDescription>
            Configure the daily summary email sent after sunset.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Daily Generation Report" {...field} />
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
                  <FormLabel>Email Body</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your message here..." {...field} rows={8} />
                  </FormControl>
                  <FormDescription>
                    Use placeholders like `{{today_generation}}` and `{{earnings}}`.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Earning Rate</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 45.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., LKR" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div>
                <FormLabel>Recipient Roles</FormLabel>
                <div className="flex items-center space-x-4 pt-2">
                    {Object.values(UserRole).map((role) => (
                        <FormField
                            key={role}
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(role)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...field.value, role])
                                                    : field.onChange(field.value?.filter((value) => value !== role));
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{role}</FormLabel>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
