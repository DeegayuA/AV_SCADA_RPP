// components/onboarding/DataPointConfigStep.tsx
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DataPointConfig, IconComponentType } from '@/config/dataPoints';
import { useOnboarding } from './OnboardingContext';
import Papa from 'papaparse';

// ... (getIconComponent, DEFAULT_ICON, ProcessingSummary, PartialDataPointFromFile, FullConfigFile interfaces) ...
// Function to safely get an icon component by name
function getIconComponent(iconName: string | undefined): IconComponentType | undefined {
    if (!iconName) return undefined;
    const normalizedIconName = iconName.replace(/Icon$/, '');
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === normalizedIconName.toLowerCase());
    return iconKey ? icons[iconKey] : undefined; // Return undefined if not found
}

const DEFAULT_ICON = Sigma;

interface ProcessingSummary {
    processed: number;
    updated: number;
    added: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
    plantDetailsUpdated?: boolean; 
}
type PartialDataPointFromFile = Partial<Omit<DataPointConfig, 'icon'>> & { icon?: string | IconComponentType };
interface FullConfigFile {
    plantName?: string;
    plantLocation?: string;
    plantType?: string;
    plantCapacity?: string;
    opcUaEndpointOffline?: string;
    appName?: string;
    opcUaEndpointOfflineIP?: string;
    opcUaEndpointOfflinePort?: number;
    opcUaEndpointOnlineIP?: string;
    opcUaEndpointOnlinePort?: number;
    configuredDataPoints: PartialDataPointFromFile[];
}

import { Download, FileJson, Upload, CheckCircle, AlertCircle, Sigma, Loader2 } from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Form,
} from '@/components/ui/form';



export default function DataPointConfigStep() {
  const { 
    defaultDataPoints,
    configuredDataPoints,
    setConfiguredDataPoints, // This also must be stable from context
    setPlantDetails,         // Destructure directly
  } = useOnboarding();       // This hook must now return setPlantDetails based on OnboardingContextType
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const uploadedFile = event.target.files[0];
      const fileType = uploadedFile.type;
      const fileName = uploadedFile.name.toLowerCase();

      if (fileType === "text/csv" || fileName.endsWith('.csv') ||
          fileType === "application/json" || fileName.endsWith('.json') ||
          fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileName.endsWith('.xlsx')) {
        setFile(uploadedFile);
        setProcessingSummary(null);
      } else {
        toast.error("Invalid file type. Please upload a CSV, JSON, or Excel (XLSX) file.");
        event.target.value = "";
        setFile(null);
      }
    }
  };

  const downloadTemplate = (type: 'csv' | 'json' = 'csv') => {
    if (type === 'csv') {
        const headers = ["id", "name", "nodeId", "dataType", "uiType", "icon", "unit", "min", "max", "description", "category", "factor", "phase", "notes", "label"].join(',');
        const exampleRow = ["example-sensor-1", "Example Temperature", "ns=2;s=MyDevice.Temperature", "Float", "display", "Thermometer", "°C", "0", "100", "Boiler temp", "process", "1", "x", "Note", "Example Temp"].join(',');
        const csvContent = `${headers}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "datapoint_config_template.csv"); 
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("CSV Template for data points downloaded.");
    } else if (type === 'json') {
      const jsonExample: FullConfigFile = { 
        plantName: "AV HeadOffice",
        plantLocation: "Colombo, Sri Lanka",
        configuredDataPoints: [
          {
            id: "json-sensor-1",
            name: "JSON Example Pressure",
            nodeId: "ns=3;s=Factory.PressureSensor",
            dataType: "Double",
            uiType: "gauge",
            icon: "Gauge", 
            unit: "bar",
            min: 0,
            max: 10,
            label: "JSON Pressure"
          }
        ]
      };
      const jsonContent = JSON.stringify(jsonExample, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "full_config_template.json");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Full JSON Config Template downloaded.");
    }
  };
 
  const mapRowToDataPoint = (rowData: Record<string, any>, rowIndex: number, errorDetails: string[]): PartialDataPointFromFile | null => {
    const id = rowData.id?.toString().trim();
    if (!id) {
        errorDetails.push(`Row/Object ${rowIndex + 1}: Missing or empty 'id'. Entry skipped.`);
        return null;
    }
    const iconName = rowData.icon?.toString().trim(); 
    const dataType = rowData.dataType?.toString().trim();
    if (dataType && !['Boolean', 'Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'String', 'DateTime'].includes(dataType)) {
        errorDetails.push(`Entry ${rowIndex + 1} (id: ${id}): Invalid dataType '${dataType}'. Original or default will be used.`);
    }
    const min = rowData.min !== undefined && rowData.min !== '' ? parseFloat(rowData.min) : undefined;
    const max = rowData.max !== undefined && rowData.max !== '' ? parseFloat(rowData.max) : undefined;
    const factor = rowData.factor !== undefined && rowData.factor !== '' ? parseFloat(rowData.factor) : undefined;

    return {
        id,
        name: rowData.name?.toString().trim() || undefined,
        nodeId: rowData.nodeId?.toString().trim() || undefined,
        dataType: dataType as DataPointConfig['dataType'] || undefined,
        uiType: rowData.uiType?.toString().trim() as DataPointConfig['uiType'] || undefined,
        icon: iconName, 
        unit: rowData.unit?.toString().trim() || undefined,
        min: !isNaN(min!) ? min : undefined,
        max: !isNaN(max!) ? max : undefined,
        description: rowData.description?.toString().trim() || undefined,
        category: rowData.category?.toString().trim() || "uncategorized",
        factor: !isNaN(factor!) ? factor : undefined,
        phase: rowData.phase?.toString().trim() as DataPointConfig['phase'] || undefined,
        notes: rowData.notes?.toString().trim() || undefined,
        label: rowData.label?.toString().trim() || rowData.name?.toString().trim() || id,
    };
  };

  const parseAndProcessFile = useCallback(async (
    fileToProcess: File,
  ): Promise<DataPointConfig[]> => {
    // Now `setPlantDetails` is in scope from the top-level destructuring.
    // Also, defaultDataPoints is available from the outer scope.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const localProcessingSummary: ProcessingSummary = { 
            processed: 0, updated: 0, added: 0, skipped: 0, errors: 0, errorDetails: [], plantDetailsUpdated: false 
        };
        try {
          const fileContent = event.target?.result;
          let dataPointsFromFile: PartialDataPointFromFile[] = [];
          let plantDetailsFromFile: Omit<FullConfigFile, 'configuredDataPoints'> | null = null;

          if (fileToProcess.type === "application/json" || fileToProcess.name.endsWith('.json')) {
            const jsonData: FullConfigFile | PartialDataPointFromFile[] = JSON.parse(fileContent as string);
            if (Array.isArray(jsonData)) {
              dataPointsFromFile = jsonData;
            } else if (jsonData && typeof jsonData === 'object' && 'configuredDataPoints' in jsonData && Array.isArray(jsonData.configuredDataPoints)) {
              dataPointsFromFile = jsonData.configuredDataPoints;
              const { configuredDataPoints: _, ...rest } = jsonData; 
              plantDetailsFromFile = rest;
              localProcessingSummary.plantDetailsUpdated = Object.keys(rest).length > 0;
            } else {
              throw new Error("Invalid JSON structure. Expecting an array of data points or an object with a 'configuredDataPoints' array.");
            }
          } else if (fileToProcess.type === "text/csv" || fileToProcess.name.endsWith('.csv')) {
            const parseResult = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true });
            if (parseResult.errors.length > 0) {
              throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
            }
            dataPointsFromFile = (parseResult.data as Record<string, any>[]).map((row, index) => 
              mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
            ).filter(dp => dp !== null) as PartialDataPointFromFile[];
          } else if (fileToProcess.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileToProcess.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelRows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
            dataPointsFromFile = excelRows.map((row, index) => 
              mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
            ).filter(dp => dp !== null) as PartialDataPointFromFile[];
          } else {
            throw new Error("Unsupported file type for parsing.");
          }
          
          // Use the destructured `setPlantDetails` directly
          if (plantDetailsFromFile && typeof setPlantDetails === 'function') {
            setPlantDetails(plantDetailsFromFile); // This will now refer to the destructured context function
            toast.info("Plant details from JSON file have been applied.");
          } else if (plantDetailsFromFile) { // No need to check typeof setPlantDetails if it's guaranteed by context type (or make it optional there)
            localProcessingSummary.errorDetails.push("Plant details found in JSON, but 'setPlantDetails' is not available from context or not a function. Plant details were not applied.");
            localProcessingSummary.errors++;
            toast.error("Plant details found in JSON, but couldn't be applied (context function issue).");
          }

          const newConfiguredPoints: DataPointConfig[] = JSON.parse(JSON.stringify(defaultDataPoints)); 

          dataPointsFromFile.forEach((dpFromFilePartial, index) => {
            localProcessingSummary.processed++;
            if (!dpFromFilePartial || !dpFromFilePartial.id) { 
                localProcessingSummary.skipped++;
                if(!dpFromFilePartial?.id) localProcessingSummary.errorDetails.push(`Object ${index + 1}: Missing 'id'. Entry skipped.`);
                return;
            }
            const { icon: iconNameFromFile, ...restOfPointFromFile } = dpFromFilePartial;
            const IconComponent = typeof iconNameFromFile === 'string' ? getIconComponent(iconNameFromFile) : (iconNameFromFile as IconComponentType | undefined);
            
            if (typeof iconNameFromFile === 'string' && iconNameFromFile && !IconComponent) {
               localProcessingSummary.errors++;
               localProcessingSummary.errorDetails.push(`Entry (id: ${dpFromFilePartial.id}): Icon '${iconNameFromFile}' not found. Using default or existing.`);
            }

            const finalIcon = IconComponent && (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && Object.keys(IconComponent).length > 0)) 
                ? IconComponent 
                : DEFAULT_ICON;

            const completeDataPointFromFile: Partial<DataPointConfig> = {
              ...restOfPointFromFile,
              icon: finalIcon,
            };

            const existingPointIndex = newConfiguredPoints.findIndex(p => p.id === dpFromFilePartial.id);
            if (existingPointIndex !== -1) {
              Object.keys(completeDataPointFromFile).forEach(keyStr => {
                const key = keyStr as keyof DataPointConfig;
                const fileValue = completeDataPointFromFile[key];
                if (fileValue !== undefined && (typeof fileValue !== 'string' || fileValue.trim() !== '')) {
                  (newConfiguredPoints[existingPointIndex] as any)[key] = fileValue;
                }
              });
              localProcessingSummary.updated++;
            } else {
              const requiredFields: (keyof DataPointConfig)[] = ['id', 'name', 'nodeId', 'dataType', 'uiType', 'icon', 'category', 'label'];
              const isNewPointValid = requiredFields.every(field => !!completeDataPointFromFile[field]);
              if (isNewPointValid) {
                newConfiguredPoints.push(completeDataPointFromFile as DataPointConfig);
                localProcessingSummary.added++;
              } else {
                localProcessingSummary.errors++;
                localProcessingSummary.skipped++;
                localProcessingSummary.errorDetails.push(`Entry (id: ${dpFromFilePartial.id}): New point missing required fields or has invalid data. Skipped.`);
              }
            }
          });
          
          setProcessingSummary(localProcessingSummary);
          if (localProcessingSummary.errors > 0 || localProcessingSummary.skipped > 0) {
            toast.error(`${localProcessingSummary.errors + localProcessingSummary.skipped} issue(s) found while processing data points. Please review.`);
          } else if (localProcessingSummary.processed === 0 && !localProcessingSummary.plantDetailsUpdated) {
            toast.info("No data points found in the file to process.");
          } else if (!localProcessingSummary.plantDetailsUpdated && localProcessingSummary.processed > 0 && localProcessingSummary.errors === 0 && localProcessingSummary.skipped === 0) {
            toast.success("Data points processed successfully!");
          } 
          
          resolve(newConfiguredPoints);

        } catch (e: any) {
          console.error("Error parsing or processing file:", e);
          const errorMessage = e.message || "An unknown error occurred during file processing.";
          toast.error(`Processing Error: ${errorMessage}`);
          localProcessingSummary.errors++;
          localProcessingSummary.errorDetails.push(errorMessage);
          setProcessingSummary(localProcessingSummary);
          reject(defaultDataPoints); // Use the defaultDataPoints from the outer scope.
        }
      };
      reader.onerror = () => {
        const readErrorMsg = "Failed to read the file.";
        toast.error(readErrorMsg);
        setProcessingSummary(prev => ({ ...(prev || { processed:0,updated:0,added:0,skipped:0,errors:0,errorDetails:[]}), errors: (prev?.errors || 0) + 1, errorDetails: [...(prev?.errorDetails || []), readErrorMsg] }));
        reject(defaultDataPoints); // Use the defaultDataPoints from the outer scope.
      };

      if (fileToProcess.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileToProcess.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(fileToProcess);
      } else {
        reader.readAsText(fileToProcess);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDataPoints, setPlantDetails]); // Add dependencies for useCallback: defaultDataPoints and setPlantDetails
                                           // setPlantDetails MUST BE STABLE (from useCallback in context) for this to work well.

  const handleUploadAndProcess = useCallback(async () => {
    if (!file) {
      toast.warning("Please select a file first.");
      return;
    }
    setIsLoading(true);
    setProcessingSummary(null);
    try {
      const processedDataPoints = await parseAndProcessFile(file);
      setConfiguredDataPoints(processedDataPoints); // This must also be stable (useCallback in context)
    } catch (error) {
      console.error("File processing failed at top level:", error);
    } finally {
      setIsLoading(false);
    }
  }, [file, parseAndProcessFile, setConfiguredDataPoints]); // Add dependencies

  // --- JSX remains the same ---
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Configure Data Points</h2>
      <p className="text-muted-foreground">
        Upload a CSV (for data points only), JSON (full config or data points array), or Excel (XLSX, for data points only) file.
        Matched `id`s update existing data points; new `id`s create new entries.
        If uploading a full JSON config, plant details may also be updated.
      </p>
      <div className="space-y-2">
        <Button variant="outline" onClick={() => downloadTemplate('csv')} className="mr-2">
          <Download className="h-4 w-4 mr-2" /> Download Data Points (CSV)
        </Button>
        <Button variant="outline" onClick={() => downloadTemplate('json')}>
          <FileJson className="h-4 w-4 mr-2" /> Download Full Config (JSON)
        </Button>
        <p className="text-xs text-muted-foreground">
          The CSV template is for data points. The JSON template shows the full configuration structure.
          Icon names should match Lucide-React names (e.g., "Zap", "Settings").
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="file-upload">Upload Configuration File (CSV, JSON, XLSX)</Label>
        <Input 
          id="file-upload" 
          type="file" 
          onChange={handleFileChange} 
          accept=".csv, .json, application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        />
      </div>

      {file && (
        <Button onClick={handleUploadAndProcess} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Process File: {file.name}
        </Button>
      )}

      {processingSummary && (
        <div className={`p-4 rounded-md border ${processingSummary.errors > 0 || processingSummary.skipped > 0 ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10'}`}>
          <div className="flex items-center font-semibold mb-2">
            {(processingSummary.errors > 0 || processingSummary.skipped > 0) ? 
              <AlertCircle className="h-5 w-5 mr-2 text-destructive" /> : 
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            }
            Processing Summary
          </div>
          {processingSummary.plantDetailsUpdated && <p className="text-sm text-blue-600 mb-1">Plant details from the file were processed (or attempted).</p>}
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Data Point Entries Processed: {processingSummary.processed}</li>
            <li>Existing Data Points Updated: {processingSummary.updated}</li>
            <li>New Data Points Added: {processingSummary.added}</li>
            {processingSummary.skipped > 0 && (
              <li className="text-orange-600">Entries Skipped (e.g. missing ID, invalid new entry): {processingSummary.skipped}</li>
            )}
            <li className={processingSummary.errors > 0 ? 'text-destructive font-medium' : ''}>
              Field-Level Errors for Data Points: {processingSummary.errors}
            </li>
          </ul>
          {(processingSummary.errors > 0 || processingSummary.skipped > 0) && processingSummary.errorDetails.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-destructive">Issue Details:</p>
              <ul className="list-disc list-inside text-xs text-destructive/80 max-h-40 overflow-y-auto">
                {processingSummary.errorDetails.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-4">
        Currently, {configuredDataPoints.length} data points are configured. Review them in the final step.
      </p>
    </div>
  );
}