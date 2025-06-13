'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataPoint } from '@/config/dataPoints';
import { NotificationRule } from '@/types/notifications'; // Assuming this path is correct after previous steps

// Schema for form validation
const ruleFormSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  nodeId: z.string().min(1, 'Node ID is required'),
  condition: z.enum(['==', '!=', '<', '<=', '>', '>='], {
    required_error: 'Condition is required',
  }),
  thresholdValueString: z.string().min(1, 'Threshold value is required'), // Input as string initially
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    required_error: 'Priority is required',
  }),
  isEnabled: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface NotificationRuleFormProps {
  initialData?: Partial<NotificationRule>;
  onSubmit: (
    data: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt' | 'thresholdValue'> & { thresholdValue: number | string | boolean }
  ) => Promise<void>;
  onCancel: () => void;
  allDataPoints: DataPoint[];
}

export const NotificationRuleForm: React.FC<NotificationRuleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  allDataPoints,
}) => {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      nodeId: initialData?.nodeId || '',
      condition: initialData?.condition || '==',
      thresholdValueString: String(initialData?.thresholdValue ?? ''),
      priority: initialData?.priority || 'MEDIUM',
      isEnabled: initialData?.isEnabled === undefined ? true : initialData.isEnabled,
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getThresholdValue = (value: string, nodeId: string): number | string | boolean => {
    const dataPoint = allDataPoints.find(dp => dp.nodeId === nodeId);
    if (dataPoint) {
      switch (dataPoint.dataType) {
        case 'Boolean':
          return value.toLowerCase() === 'true' || value === '1';
        case 'Float':
        case 'Double':
        case 'Int16':
        case 'Int32':
        case 'UInt16':
        case 'UInt32':
        case 'Byte':
        case 'SByte':
        case 'Int64':
        case 'UInt64':
          const num = Number(value);
          return isNaN(num) ? value : num; // Keep as string if not a valid number
        default:
          return value; // String, DateTime, Guid, etc.
      }
    }
    // Fallback if datapoint not found or type is ambiguous
    const num = Number(value);
    if (!isNaN(num)) return num;
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    return value;
  };

  const handleSubmit = async (values: RuleFormValues) => {
    setIsSubmitting(true);
    try {
      const thresholdValue = getThresholdValue(values.thresholdValueString, values.nodeId);
      await onSubmit({
        name: values.name,
        nodeId: values.nodeId,
        condition: values.condition,
        thresholdValue,
        priority: values.priority,
        isEnabled: values.isEnabled,
      });
      form.reset();
    } catch (error) {
      console.error('Submission error:', error);
      // Optionally, display error to user using toast or form error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rule Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., High Temperature Alert" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Point (Node)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a data point" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allDataPoints.map((dp) => (
                    <SelectItem key={dp.nodeId} value={dp.nodeId}>
                      {dp.name || dp.id} ({dp.nodeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(['==', '!=', '<', '<=', '>', '>='] as const).map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="thresholdValueString"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Threshold Value</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 70 or true or some_string" {...field} />
              </FormControl>
              <FormDescription>
                Enter a number, boolean (true/false), or string. Type is validated against selected Data Point.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Enable Rule</FormLabel>
                <FormDescription>
                  If disabled, this rule will not trigger any alarms.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialData?.id ? 'Save Changes' : 'Create Rule')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NotificationRuleForm;
