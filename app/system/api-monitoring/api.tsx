'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ApiConfig, ApiType, ApiInstanceConfig, ApiInstanceStatus } from '@/types/apiMonitoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ViewApiDataModal from './ViewApiDataModal'; // Import the modal
import { fetchReadAll, fetchReadOne, SingleDataResponse, AllDataResponse } from '@/lib/apiClient'; // Import fetch functions
import { useApiStatusMonitor } from '@/hooks/useApiStatusMonitor'; // Import the new hook
import { formatDistanceToNowStrict, differenceInMinutes } from 'date-fns'; // For time display
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming Checkbox component exists
import { Trash2, PlusCircle, Edit3, Settings, Activity, AlertTriangle, CheckCircle2, XCircle, PowerOff, Power } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '@/components/ui/badge';

const initialApiInstance = (): ApiInstanceConfig => ({
  url: '',
  status: 'pending',
});

const initialNewConfigState = (): Omit<ApiConfig, 'id'> => ({
  name: '',
  type: 'read-one',
  localApi: initialApiInstance(),
  onlineApi: initialApiInstance(),
  nodeId: '',
  withFactor: false,
  isEnabled: true,
  category: 'General',
});


interface ApiConfigFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (config: ApiConfig) => void;
  initialData?: ApiConfig | null;
}

const ApiConfigForm: React.FC<ApiConfigFormProps> = ({ isOpen, onOpenChange, onSave, initialData }) => {
  const [formData, setFormData] = useState<Omit<ApiConfig, 'id'>>(initialData ? { ...initialData } : initialNewConfigState());
  const addApiConfigAction = useAppStore((state) => state.addApiConfig);
  const updateApiConfigAction = useAppStore((state) => state.updateApiConfig);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData ? { ...initialData } : initialNewConfigState());
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof Omit<ApiConfig, 'id' | 'localApi' | 'onlineApi'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInstanceChange = (instanceType: 'localApi' | 'onlineApi', field: keyof ApiInstanceConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [instanceType]: {
        ...prev[instanceType],
        [field]: value,
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast.error("API Name is required.");
        return;
    }
    if (!formData.localApi.url.trim() && !formData.onlineApi.url.trim()) {
        toast.error("At least one API URL (Local or Online) is required.");
        return;
    }
    if ((formData.type === 'read-one' || formData.type === 'read-range') && !formData.nodeId?.trim()) {
        toast.error("Node ID is required for 'read-one' or 'read-range' API types.");
        return;
    }

    const configToSave: ApiConfig = {
      id: initialData?.id || uuidv4(),
      ...formData,
      // Ensure localApi and onlineApi have default status if not set (though form initializes them)
      localApi: { ...initialApiInstance(), ...formData.localApi },
      onlineApi: { ...initialApiInstance(), ...formData.onlineApi },
    };

    if (initialData?.id) {
        updateApiConfigAction(configToSave.id, configToSave);
        toast.success(`API "${configToSave.name}" updated successfully.`);
    } else {
        // For adding, we need to pass the simplified structure expected by addApiConfig
        const { id, localApi, onlineApi, ...restOfConfig } = configToSave;
        addApiConfigAction({
            ...restOfConfig,
            localUrl: localApi.url, // Pass URLs directly
            onlineUrl: onlineApi.url,
        });
        toast.success(`API "${configToSave.name}" added successfully.`);
    }
    onOpenChange(false);
  };

  const apiTypes: ApiType[] = ["read-one", "read-all", "read-range"];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit API Configuration' : 'Add New API Configuration'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">API Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Main Inverter Data" required className="mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type" className="text-sm font-medium">API Type</Label>
              <Select value={formData.type} onValueChange={(value: ApiType) => handleChange('type', value)}>
                <SelectTrigger id="type" className="mt-1">
                  <SelectValue placeholder="Select API type" />
                </SelectTrigger>
                <SelectContent>
                  {apiTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category (Optional)</Label>
              <Input id="category" value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} placeholder="e.g., Inverters, Grid" className="mt-1" />
            </div>
          </div>

          {(formData.type === 'read-one' || formData.type === 'read-range') && (
            <div>
              <Label htmlFor="nodeId" className="text-sm font-medium">Node ID</Label>
              <Input id="nodeId" value={formData.nodeId || ''} onChange={(e) => handleChange('nodeId', e.target.value)} placeholder="ns=4;i=50" required={formData.type === 'read-one' || formData.type === 'read-range'} className="mt-1"/>
              <p className="text-xs text-muted-foreground mt-1">Required for 'read-one' and 'read-range' types.</p>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base">Local API Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
                <div>
                    <Label htmlFor="localApiUrl" className="text-xs">URL</Label>
                    <Input id="localApiUrl" value={formData.localApi.url} onChange={(e) => handleInstanceChange('localApi', 'url', e.target.value)} placeholder="http://192.168.1.9:8200/read-xxx" className="mt-1" />
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base">Online/Fallback API Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
                 <div>
                    <Label htmlFor="onlineApiUrl" className="text-xs">URL</Label>
                    <Input id="onlineApiUrl" value={formData.onlineApi.url} onChange={(e) => handleInstanceChange('onlineApi', 'url', e.target.value)} placeholder="https://your-cloud-api.com/read-xxx" className="mt-1" />
                </div>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-3">
            <Checkbox id="withFactor" checked={formData.withFactor} onCheckedChange={(checked) => handleChange('withFactor', !!checked)} />
            <Label htmlFor="withFactor" className="text-sm font-medium cursor-pointer">Include Factor (&withFactor=true)</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox id="isEnabled" checked={formData.isEnabled} onCheckedChange={(checked) => handleChange('isEnabled', !!checked)} />
            <Label htmlFor="isEnabled" className="text-sm font-medium cursor-pointer">Enable this API configuration</Label>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">{initialData ? 'Save Changes' : 'Add API'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const ApiMonitoringPage: React.FC = () => {
  const apiConfigs = useAppStore((state) => state.apiConfigs);
  const removeApiConfigAction = useAppStore((state) => state.removeApiConfig);
  const updateApiConfigAction = useAppStore((state) => state.updateApiConfig);

  // Initialize the status monitor
  useApiStatusMonitor();

  // Initialize the status monitor
  useApiStatusMonitor();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);

  const [isViewDataModalOpen, setIsViewDataModalOpen] = useState(false);
  const [currentViewData, setCurrentViewData] = useState<SingleDataResponse | AllDataResponse | null>(null);
  const [currentViewDataTitle, setCurrentViewDataTitle] = useState('');
  const [isViewDataLoading, setIsViewDataLoading] = useState(false);
  const [viewDataError, setViewDataError] = useState<string | null>(null);
  const [currentFetchingConfig, setCurrentFetchingConfig] = useState<ApiConfig | null>(null);

  const sortedApiConfigs = React.useMemo(() => {
    return Object.values(apiConfigs).sort((a, b) => a.name.localeCompare(b.name));
  }, [apiConfigs]);

  const handleAddNew = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const handleEdit = (config: ApiConfig) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const handleDelete = (configId: string, configName: string) => {
    // Consider adding a confirmation dialog here
    if (window.confirm(`Are you sure you want to delete the API configuration "${configName}"?`)) {
        removeApiConfigAction(configId);
        toast.success(`API "${configName}" deleted.`);
    }
  };

  const toggleApiEnabled = (config: ApiConfig) => {
    updateApiConfigAction(config.id, { isEnabled: !config.isEnabled });
    toast.info(`API "${config.name}" ${!config.isEnabled ? "enabled" : "disabled"}.`);
  };

  const handleFetchData = async (config: ApiConfig) => {
    if (!config.isEnabled) {
      toast.error("API is disabled.", { description: "Enable the API configuration to fetch data."});
      return;
    }
    if (config.type === 'read-range') {
        // TODO: Implement read-range data fetching and display (likely in a separate component/modal)
        toast.info("Read-range data viewing will be implemented in the next step.");
        return;
    }
    if (config.type === 'read-one' && !config.nodeId) {
        toast.error("Node ID is missing for this 'read-one' API configuration.");
        return;
    }

    setIsViewDataLoading(true);
    setViewDataError(null);
    setCurrentViewData(null);
    setCurrentFetchingConfig(config);
    setCurrentViewDataTitle(`Data for: ${config.name} (${config.type})`);
    setIsViewDataModalOpen(true);

    try {
      let result: SingleDataResponse | AllDataResponse | null = null;
      if (config.type === 'read-all') {
        result = await fetchReadAll(config);
      } else if (config.type === 'read-one' && config.nodeId) {
        result = await fetchReadOne(config, config.nodeId);
      }

      if (result) {
        setCurrentViewData(result);
      } else {
        setViewDataError('Failed to fetch data or no active API URL was found.');
      }
    } catch (error: any) {
      console.error("Error fetching API data:", error);
      setViewDataError(error.message || 'An unknown error occurred.');
    } finally {
      setIsViewDataLoading(false);
    }
  };

  const getStatusIcon = (status: ApiInstanceStatus) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'offline': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'pending': return <Activity className="h-4 w-4 text-gray-400 animate-pulse" />;
      case 'disabled': return <PowerOff className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatLastChecked = (isoDate?: string) => {
    if (!isoDate) return 'N/A';
    try {
      return formatDistanceToNowStrict(new Date(isoDate), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getCurrentDowntimeDuration = (instance: ApiInstanceConfig) => {
    if (instance.status !== 'offline' && instance.status !== 'error') return null;
    if (!instance.downtimeStart) return null; // downtimeStart is on ApiInstanceConfig
    try {
      const minutesDown = differenceInMinutes(new Date(), new Date(instance.downtimeStart));
      if (minutesDown < 1) return "Ongoing (<1 min)";
      if (minutesDown < 60) return `Ongoing (~${minutesDown}m)`;
      const hours = Math.floor(minutesDown / 60);
      const mins = minutesDown % 60;
      return `Ongoing (~${hours}h ${mins}m)`;
    } catch (e) {
      console.error("Error calculating downtime duration:", e);
      return "Ongoing (error calculating)"
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">API Monitoring Configuration</CardTitle>
            <CardDescription>Manage and monitor your external API endpoints.</CardDescription>
          </div>
          <Button onClick={handleAddNew} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New API
          </Button>
        </CardHeader>
        <CardContent>
          {sortedApiConfigs.length === 0 ? (
            <div className="text-center py-10">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No API configurations found.</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new API endpoint.</p>
              <div className="mt-6">
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New API
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedApiConfigs.map((config) => (
                <Card key={config.id} className={`transition-all duration-300 ease-in-out ${config.isEnabled ? 'opacity-100' : 'opacity-60 bg-muted/30'}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3 pt-4 px-4">
                    <div className="flex-grow">
                      <CardTitle className="text-lg flex items-center">
                        {config.isEnabled ? <Power className="h-5 w-5 mr-2 text-green-500"/> : <PowerOff className="h-5 w-5 mr-2 text-red-500"/>}
                        {config.name}
                        <Badge variant={config.isEnabled ? "default" : "outline"} className="ml-3 text-xs">
                          {config.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Type: <span className="font-semibold">{config.type}</span>
                        {config.nodeId && <> | Node ID: <span className="font-semibold">{config.nodeId}</span></>}
                        {config.category && <> | Category: <span className="font-semibold">{config.category}</span></>}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                       {(config.type === 'read-one' || config.type === 'read-all') && (
                         <Button variant="outline" size="sm" onClick={() => handleFetchData(config)} className="text-xs h-7 px-2" title="View Live Data">
                            View Data
                         </Button>
                       )}
                       {config.type === 'read-range' && (
                         <Button variant="outline" size="sm" onClick={() => handleFetchData(config)} className="text-xs h-7 px-2" title="View Graph Data (Not Implemented)">
                            View Graph
                         </Button>
                       )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} title="Edit API Config">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id, config.name)} title="Delete API Config" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                       <Checkbox
                            checked={config.isEnabled}
                            onCheckedChange={() => toggleApiEnabled(config)}
                            id={`enable-${config.id}`}
                            aria-label={config.isEnabled ? "Disable API" : "Enable API"}
                            title={config.isEnabled ? "Disable API Monitoring" : "Enable API Monitoring"}
                        />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-0.5">Local API:</p>
                        <div className="flex items-center gap-1.5">
                            {getStatusIcon(config.localApi.status)}
                            <span className="truncate text-xs flex-grow" title={config.localApi.url}>{config.localApi.url || <span className="italic text-gray-400">Not configured</span>}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">({formatLastChecked(config.localApi.lastChecked)})</span>
                        </div>
                        {getCurrentDowntimeDuration(config.localApi) && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 ml-5">{getCurrentDowntimeDuration(config.localApi)}</p>
                        )}
                        {config.localApi.error && config.localApi.status !== 'online' && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 ml-5">Error: {config.localApi.error}</p>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-0.5">Online API:</p>
                         <div className="flex items-center gap-1.5">
                            {getStatusIcon(config.onlineApi.status)}
                            <span className="truncate text-xs flex-grow" title={config.onlineApi.url}>{config.onlineApi.url || <span className="italic text-gray-400">Not configured</span>}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">({formatLastChecked(config.onlineApi.lastChecked)})</span>
                        </div>
                        {getCurrentDowntimeDuration(config.onlineApi) && (
                             <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 ml-5">{getCurrentDowntimeDuration(config.onlineApi)}</p>
                        )}
                        {config.onlineApi.error && config.onlineApi.status !== 'online' && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 ml-5">Error: {config.onlineApi.error}</p>
                        )}
                      </div>
                    </div>
                    {/* Display overall config.lastError if it exists AND is different from individual instance errors already shown */}
                    {config.lastError &&
                     !((config.localApi.error && config.lastError.includes(config.localApi.error)) ||
                       (config.onlineApi.error && config.lastError.includes(config.onlineApi.error))) &&
                     (config.localApi.status !== 'online' || config.onlineApi.status !== 'online') && // Only show if not both online
                        (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md mt-2">
                            <AlertTriangle className="inline h-3 w-3 mr-1 mb-0.5"/>
                            Overall Info: {config.lastError}
                        </p>
                    )}
                    {/* Placeholder for status display and actions like 'Test API' */}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ApiConfigForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={() => { /* Logic handled by form's submit */ }}
        initialData={editingConfig}
      />
    </div>
  );
};

export default ApiMonitoringPage;

// Need to ensure Checkbox component is correctly imported or defined.
// For now, assuming it's like:
// import { Checkbox } from "@/components/ui/checkbox";
// If not, I might need to create a simple one or use a Switch.

// Also, useEffect from React is needed in ApiConfigForm (already there)
// import { useEffect } from 'react'; // No need to re-import if already at the top
