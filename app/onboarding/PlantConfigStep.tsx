// components/onboarding/PlantConfigStep.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { plantConfigSchema, PlantConfigFormData } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useOnboarding } from './OnboardingContext';
import { APP_NAME, PLANT_CAPACITY, PLANT_LOCATION, PLANT_NAME, PLANT_TYPE } from '@/config/constants';
import { useEffect } from 'react';

export default function PlantConfigStep() {
  const { onboardingData, updateOnboardingData, nextStep } = useOnboarding();

  const form = useForm<PlantConfigFormData>({
    resolver: zodResolver(plantConfigSchema),
    defaultValues: {
      plantName: onboardingData.plantName || PLANT_NAME,
      plantLocation: onboardingData.plantLocation || PLANT_LOCATION,
      plantType: onboardingData.plantType || PLANT_TYPE,
      plantCapacity: onboardingData.plantCapacity || PLANT_CAPACITY,
      opcUaEndpointOfflineIP: onboardingData.opcUaEndpointOffline?.split(':')[0] || '192.168.1.10', // Default example IP
      opcUaEndpointOfflinePort: Number(onboardingData.opcUaEndpointOffline?.split(':')[1]) ?? 4840,
      opcUaEndpointOnlineIP: onboardingData.opcUaEndpointOnline?.split(':')[0] || '',
      opcUaEndpointOnlinePort: Number(onboardingData.opcUaEndpointOnline?.split(':')[1]) || undefined,
      appName: onboardingData.appName || APP_NAME,
    },
  });

  const onSubmit = (data: PlantConfigFormData) => {
    const offlineEndpoint = `${data.opcUaEndpointOfflineIP}:${data.opcUaEndpointOfflinePort}`;
    const onlineEndpoint = data.opcUaEndpointOnlineIP && data.opcUaEndpointOnlinePort
      ? `${data.opcUaEndpointOnlineIP}:${data.opcUaEndpointOnlinePort}`
      : undefined;

    updateOnboardingData({
      ...data,
      opcUaEndpointOffline: offlineEndpoint,
      opcUaEndpointOnline: onlineEndpoint,
    });
    // nextStep(); // Navigation is handled by the parent OnboardingNavigation
  };
  
  // Call onSubmit to update context whenever form is valid, nextStep is handled by global nav
  // This makes the "Next" button's enabled state dependent on form validity from the parent
  useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.isValid) {
        onSubmit(form.getValues());
      }
    });
    // Trigger initial validation and data update
    if (form.formState.isValid) {
        onSubmit(form.getValues());
    }
    return () => subscription.unsubscribe();
  }, [form.watch, form.formState.isValid, form.getValues, onSubmit]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(()=>{})} className="space-y-6"> {/* Empty submit, data updates on watch */}
        <h2 className="text-xl font-semibold mb-4">Plant & Application Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plant Name</FormLabel>
                <FormControl><Input placeholder="e.g., Headoffice Solar Array" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plantLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plant Location</FormLabel>
                <FormControl><Input placeholder="e.g., Colombo, Sri Lanka" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plantType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plant Type</FormLabel>
                <FormControl><Input placeholder="e.g., Mini-Grid" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plantCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plant Capacity</FormLabel>
                <FormControl><Input placeholder="e.g., 100 kW" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className="text-lg font-medium pt-4 border-t mt-4">OPC UA Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FormField
                control={form.control}
                name="opcUaEndpointOfflineIP"
                render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Offline Endpoint IP Address</FormLabel>
                    <FormControl><Input placeholder="192.168.1.10" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="opcUaEndpointOfflinePort"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl><Input type="number" placeholder="4840" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormDescription>Local OPC UA server endpoint for PLC connection.</FormDescription>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FormField
                control={form.control}
                name="opcUaEndpointOnlineIP"
                render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Online Endpoint IP Address (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., 112.134.218.51" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="opcUaEndpointOnlinePort"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Port (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="4840" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
         <FormDescription>Remote OPC UA server endpoint (if available).</FormDescription>

        <FormField
          control={form.control}
          name="appName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Name (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., Atla Vision Minigrid Monitor" {...field} /></FormControl>
              <FormDescription>Name displayed in the application header.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* The <OnboardingNavigation> will handle the actual "Next" button submission from parent */}
        {/* Ensure parent enables Next only when form.formState.isValid */}
      </form>
    </Form>
  );
}