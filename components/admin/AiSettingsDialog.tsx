'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, TestTube2, Trash2, Plus, Download, Upload, Wand2, X } from 'lucide-react';
import {
    getAiSettings,
    saveAiSettings,
    encryptApiKey,
    Pill,
    StoredAiSettings,
    exportAiSettingsData,
    importAiSettingsData
} from '@/lib/ai-settings-store';
import { testGeminiApiKey } from '@/lib/aiApiClient';

interface AiSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiSettingsDialog: React.FC<AiSettingsDialogProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const [settings, setSettings] = useState<Omit<StoredAiSettings, 'encryptedApiKey'>>({
    useRainbowBorder: true,
    pills: [],
  });
  const [newPillPrompt, setNewPillPrompt] = useState('');

  const loadSettings = useCallback(async () => {
    const storedSettings = await getAiSettings();
    if (storedSettings) {
      setSettings({
        useRainbowBorder: storedSettings.useRainbowBorder,
        pills: storedSettings.pills,
      });
      if (storedSettings.encryptedApiKey) {
        setIsKeySaved(true);
        setApiKeyInput('********************');
      } else {
        setIsKeySaved(false);
        setApiKeyInput('');
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleTestKey = async () => {
    if (!apiKeyInput) return;
    setIsTesting(true);
    // Note: This tests the key from the input field, not the saved one.
    const result = await testGeminiApiKey(apiKeyInput);
    toast({
      title: result.success ? 'Test Successful' : 'Test Failed',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
    setIsTesting(false);
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput) return;
    setIsSaving(true);
    try {
      const encryptedKey = await encryptApiKey(apiKeyInput);
      const currentSettings = await getAiSettings();
      await saveAiSettings({
        ...currentSettings,
        ...settings,
        encryptedApiKey: encryptedKey,
      });
      setIsKeySaved(true);
      setApiKeyInput('********************');
      toast({
        title: 'API Key Saved',
        description: 'Your Gemini API key has been encrypted and stored securely.',
      });
    } catch (error) {
      toast({
        title: 'Error Saving Key',
        description: 'Could not save the API key.',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const handleRevokeKey = async () => {
    setIsRevoking(true);
    try {
        const currentSettings = await getAiSettings();
        if(currentSettings){
            const newSettings = { ...currentSettings, encryptedApiKey: undefined };
            await saveAiSettings(newSettings);
        }
      setIsKeySaved(false);
      setApiKeyInput('');
      toast({
        title: 'API Key Revoked',
        description: 'Your Gemini API key has been removed.',
      });
    } catch (error) {
        toast({
            title: 'Error Revoking Key',
            description: 'Could not revoke the API key.',
            variant: 'destructive',
        });
    }
    setIsRevoking(false);
  };

  const handleAddPill = () => {
    if (newPillPrompt.trim()) {
      const newPills = [...settings.pills, { id: Date.now().toString(), prompt: newPillPrompt.trim() }];
      setSettings(prev => ({ ...prev, pills: newPills }));
      updateStoredSettings({ pills: newPills });
      setNewPillPrompt('');
    }
  };

  const handleRemovePill = (id: string) => {
    const newPills = settings.pills.filter(pill => pill.id !== id);
    setSettings(prev => ({ ...prev, pills: newPills }));
    updateStoredSettings({ pills: newPills });
  };

  const updateStoredSettings = async (newValues: Partial<StoredAiSettings>) => {
      const currentSettings = await getAiSettings();
      const updated: StoredAiSettings = {
          encryptedApiKey: currentSettings?.encryptedApiKey,
          useRainbowBorder: newValues.useRainbowBorder ?? currentSettings?.useRainbowBorder ?? true,
          pills: newValues.pills ?? currentSettings?.pills ?? [],
      };
      await saveAiSettings(updated);
  };


  const handleExport = async () => {
    const data = await exportAiSettingsData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'ai-settings.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          await importAiSettingsData(importedData);
          await loadSettings(); // Reload settings from DB
          toast({ title: 'Success', description: 'Settings imported successfully.' });
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to parse or import settings file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/60">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-purple-500" />
            AI Assistant Configuration
          </DialogTitle>
          <DialogDescription>
            Manage your Gemini API Key and customize the AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center"><Key className="mr-2 h-4 w-4" /> Gemini API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API Key"
                disabled={isKeySaved || isSaving || isRevoking}
              />
              {isKeySaved ? (
                 <Button variant="destructive" onClick={handleRevokeKey} disabled={isRevoking}>
                    {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Revoke
                  </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleTestKey} disabled={isTesting || !apiKeyInput}>
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test
                  </Button>
                  <Button onClick={handleSaveKey} disabled={isSaving || !apiKeyInput}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Pills Section */}
          <div className="space-y-2">
            <Label>Quick-Chat Pills</Label>
            <div className="space-y-2">
              {settings.pills.map(pill => (
                <div key={pill.id} className="flex items-center gap-2">
                  <Input value={pill.prompt} readOnly className="bg-slate-100 dark:bg-slate-800" />
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePill(pill.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newPillPrompt}
                onChange={(e) => setNewPillPrompt(e.target.value)}
                placeholder="Add a new quick prompt..."
              />
              <Button onClick={handleAddPill}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-2">
             <Label>Appearance</Label>
             <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label>Enable Rainbow Effects</Label>
                    <p className="text-xs text-muted-foreground">
                        Apply animated rainbow borders to AI components.
                    </p>
                </div>
                <Switch
                    checked={settings.useRainbowBorder}
                    onCheckedChange={(checked) => {
                        setSettings(prev => ({ ...prev, useRainbowBorder: checked }));
                        updateStoredSettings({ useRainbowBorder: checked });
                    }}
                />
             </div>
          </div>

           {/* Import/Export Section */}
          <div className="space-y-2">
            <Label>Settings Management</Label>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport} className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Export Settings
                </Button>
                <Button asChild variant="outline" className="w-full">
                    <Label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" /> Import Settings
                        <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
                    </Label>
                </Button>
            </div>
          </div>

        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
