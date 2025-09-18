// components/admin/NotificationRuleForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// FIX: Import the 'Variants' type
import { motion, Variants } from 'framer-motion';

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
import { NotificationRule } from '@/types/notifications';
import { Tags, Target, Binary, Sigma, Baseline, Zap, AlertTriangle, InfoIcon, Check, Loader2, Save, X, Mail, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ScrollArea } from '@/components/ui/scroll-area';

type OPC_DATA_TYPE_FriendlyNames = 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'String';

const ruleFormSchemaBase = z.object({
  name: z.string().min(3, 'Rule name must be at least 3 characters').max(100, 'Rule name too long'),
  dataPointKey: z.string().min(1, 'Data Point is required'),
  condition: z.enum(['==', '!=', '<', '<=', '>', '>=', 'contains', 'not_contains', 'is_true', 'is_false'], {
    required_error: 'Condition is required',
  }),
  severity: z.enum(['info', 'warning', 'critical'], {
    required_error: 'Severity is required',
  }),
  message: z.string().max(500, 'Message is too long').optional(),
  enabled: z.boolean(),
  sendEmail: z.boolean(),
  sendSms: z.boolean(),
});

type RuleFormValuesBase = z.infer<typeof ruleFormSchemaBase>;
interface RuleFormValues extends RuleFormValuesBase {
    thresholdValue?: string | number | boolean;
    thresholdInputString?: string;
}

interface NotificationRuleFormProps {
  initialData?: Partial<NotificationRule>;
  onSubmit: (data: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  allDataPoints: DataPoint[];
  isSubmitting?: boolean;
}

// FIX: Add explicit 'Variants' type
const formItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' },
  }),
};

export const NotificationRuleForm: React.FC<NotificationRuleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  allDataPoints,
  isSubmitting: parentIsSubmitting,
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      dataPointKey: initialData?.dataPointKey || initialData?.nodeId || '',
      condition: initialData?.condition || '==',
      thresholdInputString: String(initialData?.thresholdValue ?? ''),
      severity: initialData?.severity || 'warning',
      message: initialData?.message || '',
      enabled: initialData?.enabled === undefined ? true : initialData.enabled,
      sendEmail: initialData?.sendEmail || false,
      sendSms: initialData?.sendSms || false,
    },
  });

  const [selectedDataPointType, setSelectedDataPointType] = useState<OPC_DATA_TYPE_FriendlyNames | string | null>(null);

  const watchedDataPointKey = useWatch({ control: form.control, name: 'dataPointKey' });
  const watchedCondition = useWatch({ control: form.control, name: 'condition'});
  const watchedSeverity = useWatch({ control: form.control, name: 'severity' });
  const opcUaNodeValues = useAppStore((state) => state.opcUaNodeValues);
  const [liveValue, setLiveValue] = useState<any>(null);

  useEffect(() => {
    if (watchedDataPointKey) {
      const dataPoint = allDataPoints.find(dp => dp.id === watchedDataPointKey || dp.nodeId === watchedDataPointKey);
      setSelectedDataPointType(dataPoint ? dataPoint.dataType : null);
      if (dataPoint) {
        console.log("dataPoint.nodeId", dataPoint.nodeId)
        console.log("opcUaNodeValues", opcUaNodeValues)
        setLiveValue(opcUaNodeValues[dataPoint.nodeId] ?? null);
        if (dataPoint.dataType === 'Boolean' && (watchedCondition !== 'is_true' && watchedCondition !== 'is_false')) {
           form.setValue('condition', 'is_true');
           form.setValue('thresholdInputString', 'true');
        } else if (dataPoint.dataType !== 'Boolean' && (watchedCondition === 'is_true' || watchedCondition === 'is_false')) {
           form.setValue('condition', '==');
        }
      } else {
        setLiveValue(null);
      }
    } else {
      setSelectedDataPointType(null);
      setLiveValue(null);
    }
  }, [watchedDataPointKey, allDataPoints, form, watchedCondition, opcUaNodeValues]);

  const validateAndSubmit = async (values: RuleFormValues) => {
    let thresholdValue: string | number | boolean = values.thresholdInputString === undefined ? '' : values.thresholdInputString;

    if (selectedDataPointType === 'Boolean') {
        if (values.condition === 'is_true' || values.condition === 'is_false') {
             thresholdValue = values.condition === 'is_true';
        } else {
            const boolVal = String(values.thresholdInputString).toLowerCase();
            if (boolVal !== 'true' && boolVal !== 'false') {
                form.setError('thresholdInputString', { type: 'manual', message: 'Must be "true" or "false" for Boolean type.' });
                return;
            }
            thresholdValue = boolVal === 'true';
        }
    } else if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDataPointType || '')) {
      if (isNaN(Number(values.thresholdInputString))) {
        form.setError('thresholdInputString', { type: 'manual', message: 'Must be a valid number.' });
        return;
      }
      thresholdValue = Number(values.thresholdInputString);
    } else {
        thresholdValue = String(values.thresholdInputString);
    }
    
    const selectedDataPoint = allDataPoints.find(dp => dp.id === values.dataPointKey || dp.nodeId === values.dataPointKey);

    const dataToSubmit: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        dataPointKey: values.dataPointKey,
        nodeId: selectedDataPoint?.nodeId, // Add nodeId to the submission
        condition: values.condition,
        thresholdValue: thresholdValue as any,
        severity: values.severity,
        message: values.message || `${values.name} triggered for ${values.dataPointKey}`,
        enabled: values.enabled,
        sendEmail: values.sendEmail,
        sendSms: values.sendSms,
    };
    if (initialData?.id) {
        (dataToSubmit as NotificationRule).id = initialData.id;
    }
    await onSubmit(dataToSubmit);
  };
  
  const availableConditions = React.useMemo(() => {
    if (selectedDataPointType === 'Boolean') {
      return ['is_true', 'is_false', '==', '!='] as const;
    } else if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDataPointType || '')) {
      return ['==', '!=', '<', '<=', '>', '>='] as const;
    } else if (selectedDataPointType === 'String') {
      return ['==', '!=', 'contains', 'not_contains'] as const;
    }
    return ['==', '!=', '<', '<=', '>', '>=', 'contains', 'not_contains', 'is_true', 'is_false'] as const;
  }, [selectedDataPointType]);

  const showThresholdInput = !(selectedDataPointType === 'Boolean' && (watchedCondition === 'is_true' || watchedCondition === 'is_false'));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(validateAndSubmit)} className="space-y-6 px-1 pb-2">
        <motion.div custom={0} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Tags className="mr-2 h-5 w-5 text-primary"/> Rule Identification</h3>
             <FormField
                control={form.control} name="name"
                render={({ field }) => (
                    <FormItem className="mb-4">
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl><Input placeholder="e.g., High Temperature Alert" {...field} className="h-10" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            <FormField
                control={form.control} name="message"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Custom Notification Message (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Reactor core temperature critical!" {...field} className="h-10" /></FormControl>
                    <FormDescription>Leave blank for a default message based on rule name and data point.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )} />
        </motion.div>

        <motion.div custom={1} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Target className="mr-2 h-5 w-5 text-primary"/> Trigger Condition</h3>
            <FormField
            control={form.control} name="dataPointKey"
            render={({ field }) => (
                <FormItem className="mb-4 flex flex-col">
                <FormLabel>Data Point to Monitor</FormLabel>
                <SearchableSelect
                  options={allDataPoints.map(dp => ({ value: dp.id, label: `${dp.name} (${dp.nodeId})` }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a data point..."
                  searchPlaceholder="Search data points..."
                  emptyMessage="No data points found."
                />
                 {selectedDataPointType && (
                    <FormDescription className="mt-1">Selected type: <span className="font-semibold text-primary">{selectedDataPointType}</span></FormDescription>
                  )}
                 {liveValue !== null && liveValue !== undefined && (
                    <div className="mt-2 p-2 border rounded-md bg-slate-50 dark:bg-slate-800">
                      <p className="text-sm font-medium">Live Value: <span className="font-bold text-lg text-primary">{String(liveValue)}</span></p>
                    </div>
                 )}
                <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control} name="condition"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Condition Operator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select an operator" /></SelectTrigger></FormControl>
                    <SelectContent>{availableConditions.map((op) => ( <SelectItem key={op} value={op}>{op}</SelectItem> ))}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />
            {showThresholdInput && (
                 <FormField
                    control={form.control} name="thresholdInputString"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Threshold Value</FormLabel>
                        <FormControl>
                            {selectedDataPointType === 'Boolean' ? (
                               <Select onValueChange={(val) => { field.onChange(val); }} defaultValue={String(field.value).toLowerCase()}>
                                  <SelectTrigger className="h-10"><SelectValue placeholder="Select true or false" /></SelectTrigger>
                                  <SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
                              </Select>
                            ) : (
                                <Input
                                    placeholder={ selectedDataPointType?.includes('Int') || selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'e.g., 70.5' : 'e.g., Critical Status' }
                                    {...field}
                                    type={selectedDataPointType?.includes('Int') || selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'number' : 'text'}
                                    step={selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'any' : undefined}
                                    className="h-10"
                                />
                            )}
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                )}
            </div>
             {!showThresholdInput && ( <FormDescription className="text-sm mt-2 text-primary">Threshold value is implicitly defined by the chosen condition (e.g., "is true").</FormDescription> )}
        </motion.div>

        <motion.div custom={2} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
             <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Zap className="mr-2 h-5 w-5 text-primary"/> Alert Behavior</h3>
            <FormField
                control={form.control} name="severity"
                render={({ field }) => (
                <FormItem className="mb-4">
                    <FormLabel>Alert Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Set alert severity" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="info"><div className="flex items-center"><InfoIcon className="mr-2 h-4 w-4 text-sky-500"/>Info</div></SelectItem>
                        <SelectItem value="warning"><div className="flex items-center"><AlertTriangle className="mr-2 h-4 w-4 text-amber-500"/>Warning</div></SelectItem>
                        <SelectItem value="critical"><div className="flex items-center"><Zap className="mr-2 h-4 w-4 text-red-500"/>Critical</div></SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />

            <FormField
                control={form.control} name="enabled"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600">
                    <div className="space-y-0.5">
                    <FormLabel className="font-semibold text-slate-800 dark:text-slate-100">Enable This Rule</FormLabel>
                    <FormDescription className="text-xs text-slate-600 dark:text-slate-400">If disabled, this rule will not be evaluated or trigger notifications.</FormDescription>
                    </div>
                    <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
                    </FormControl>
                </FormItem>
                )} />

            { (watchedSeverity === 'warning' || watchedSeverity === 'critical') && (
                <div className="mt-4 space-y-3">
                    <Separator />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-2">External Notifications</p>
                    <FormField
                        control={form.control}
                        name="sendEmail"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-sky-600 dark:text-sky-400"/> Send Email</FormLabel>
                                    <FormDescription className="text-xs text-slate-600 dark:text-slate-400">Send a notification via email to the configured address.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="sendSms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center"><MessageSquare className="mr-2 h-4 w-4 text-green-600 dark:text-green-400"/> Send SMS</FormLabel>
                                    <FormDescription className="text-xs text-slate-600 dark:text-slate-400">Send a notification via SMS to the configured number.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </motion.div>

        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={parentIsSubmitting} className="h-10">
            <X className="mr-2 h-4 w-4"/> Cancel
          </Button>
          <Button type="submit" disabled={parentIsSubmitting || form.formState.isSubmitting} className="h-10 min-w-[120px]">
            {parentIsSubmitting || form.formState.isSubmitting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Save className="mr-2 h-4 w-4" /> )}
            {parentIsSubmitting || form.formState.isSubmitting ? 'Saving...' : (initialData?.id ? 'Save Changes' : 'Create Rule')}
          </Button>
        </div>
      </form>
    </Form>
  );
};