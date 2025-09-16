// app/onboarding/FirstTimeSetup.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Zap, ChevronRight, DownloadCloud, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useEffect } from 'react';

const FirstTimeSetup = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plantTemplates, setPlantTemplates] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsFetchingTemplates(true);
        const response = await fetch('https://api.github.com/repos/DeegayuA/AV_SCADA_Configs/contents/');
        if (!response.ok) {
          throw new Error(`Failed to fetch plant list from GitHub: ${response.statusText}`);
        }
        const data = await response.json();
        const plantFolders = data
          .filter((item: any) => item.type === 'dir')
          .map((item: any) => ({ id: item.path, name: item.name.replace(/_/g, ' ') }));
        setPlantTemplates(plantFolders);
      } catch (e) {
        toast.error("Could not load remote configurations", { description: e instanceof Error ? e.message : 'Please check your internet connection.' });
      } finally {
        setIsFetchingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleSetup = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a plant template to continue.');
      return;
    }
    setIsLoading(true);
    toast.info('Setting up the plant configuration...');

    try {
      const response = await fetch('/api/onboarding/setup-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });

      if (!response.ok) {
        throw new Error('Failed to set up the plant template.');
      }

      toast.success('Configuration has been set up successfully!');
      router.push('/onboarding'); // Redirect to the standard onboarding flow
    } catch (error) {
      toast.error('An error occurred during setup. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Logic to skip the setup
    toast.info('Setup skipped. You can configure the app later from the admin panel.');
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Zap className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="mt-4 text-2xl font-bold">First-Time Setup</CardTitle>
            <CardDescription className="mt-2">
              Welcome! Let's get your system configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Please select a plant template to start. This will download the necessary configuration files and data points for your system.
            </p>
            <div className="flex flex-col space-y-2">
              <Select onValueChange={setSelectedTemplate} disabled={isLoading || isFetchingTemplates}>
                <SelectTrigger>
                  <SelectValue placeholder={isFetchingTemplates ? "Loading templates..." : "Select a plant template..."} />
                </SelectTrigger>
                <SelectContent>
                  {plantTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button onClick={handleSetup} disabled={isLoading || !selectedTemplate} className="w-full">
              {isLoading ? 'Setting up...' : 'Download and Setup'}
              <DownloadCloud className="ml-2 h-5 w-5" />
            </Button>
            <Button onClick={handleSkip} variant="ghost" className="w-full text-sm text-gray-500">
              Skip for now
              <SkipForward className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default FirstTimeSetup;
