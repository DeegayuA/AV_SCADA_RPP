// components/onboarding/DataPointConfigStep.tsx
'use client';
import React, { useState, useCallback, useRef, DragEvent, useEffect } from 'react';
// FIX: Import the 'Variants' type
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DataPointConfig, IconComponentType } from '@/config/dataPoints';
import { useOnboarding } from './OnboardingContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    Download, FileJson, UploadCloud, CheckCircle, AlertTriangle, Sigma, Loader2, Info, ListChecks, Database, FileSpreadsheet, Trash2, Maximize, ExternalLink, Merge, CloudUpload,
    PlusCircle, Save, XCircle
} from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// --- Helper Functions & Interfaces (remain the same) ---
function getIconComponent(iconName: string | undefined): IconComponentType | undefined {
    if (!iconName) return undefined;
    const normalizedIconName = iconName.replace(/Icon$/, '');
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === normalizedIconName.toLowerCase());
    return iconKey ? icons[iconKey] : undefined;
}

const DEFAULT_ICON = Merge;

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

// --- Framer Motion Variants (FIXED) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

// FIX: Explicitly set the return type of the function to 'Variants'
const itemVariants = (delay: number = 0, yOffset: number = 20, blurAmount: number = 3): Variants => ({
  hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 110, damping: 16, delay, mass: 0.9 }
  },
  exit: { opacity: 0, y: -(yOffset / 2), filter: `blur(${blurAmount}px)`, transition: { duration: 0.25 } }
});

// FIX: Explicitly set the return type of the function to 'Variants'
const buttonMotionProps = (delay: number = 0, primary: boolean = false) => ({
  variants: itemVariants(delay, 15, 2),
  whileHover: {
    scale: 1.03,
    boxShadow: primary ? "0px 7px 22px hsla(var(--primary)/0.3)" : "0px 5px 18px hsla(var(--foreground)/0.12)",
    transition: { type: "spring" as const, stiffness: 350, damping: 12 }
  },
  whileTap: { scale: 0.97, transition: {type: "spring" as const, stiffness: 400, damping: 15} }
});

const contentAppearVariants: Variants = {
  hidden: { opacity: 0, height: 0, y: 15, scale: 0.97 },
  visible: { opacity: 1, height: 'auto', y: 0, scale: 1, transition: { duration: 0.45, ease: 'circOut' } },
  exit: { opacity: 0, height: 0, y: -15, scale: 0.97, transition: { duration: 0.35, ease: 'circIn' } }
};

const dropzoneVariants: Variants = {
    idle: { scale: 1, backgroundColor: "hsla(var(--muted)/0.3)", borderColor: "hsla(var(--border))" },
    dragging: { scale: 1.03, backgroundColor: "hsla(var(--primary)/0.05)", borderColor: "hsla(var(--primary)/0.7)" },
};

// --- Constants for Select options ---
const DATA_TYPE_OPTIONS: DataPointConfig['dataType'][] = ['Boolean', 'String', 'Float', 'Double', 'Int16', 'UInt16', 'Int32', 'UInt32', 'DateTime'];
const UI_TYPE_OPTIONS: DataPointConfig['uiType'][] = ['button', 'switch', 'display', 'gauge'];

type ManualDataPointState = Partial<Omit<DataPointConfig, 'icon' | 'min' | 'max' | 'factor'> & { 
    icon?: string;
    min?: string;
    max?: string;
    factor?: string;
}>;

const initialManualDataPointState: ManualDataPointState = {
    id: '', name: '', nodeId: '', dataType: 'Float', uiType: 'display', icon: 'Tag', unit: '', min: '',
    max: '', description: '', category: 'Manually Added', factor: '', phase: 'x', notes: '', label: '',
};

export default function DataPointConfigStep() {
  const { configuredDataPoints, setConfiguredDataPoints, setPlantDetails, onboardingData } = useOnboarding();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDataPoint, setManualDataPoint] = useState<ManualDataPointState>(initialManualDataPointState);
  const [manualFormErrors, setManualFormErrors] = useState<Record<string, string>>({});

  const processUploadedFile = (uploadedFile: File) => {
    const fileName = uploadedFile.name.toLowerCase();
    if (fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.xlsx')) {
        setFile(uploadedFile);
        setProcessingSummary(null);
        toast.success(`File "${uploadedFile.name}" ready for processing.`);
      } else {
        toast.error("Invalid file type.", { description: "Please upload a CSV, JSON, or Excel (XLSX) file." });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processUploadedFile(event.target.files[0]);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDraggingOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDraggingOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDraggingOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processUploadedFile(event.dataTransfer.files[0]);
    }
  };
  
  const clearFileSelection = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProcessingSummary(null);
    toast.info("File selection cleared.");
  };

  const downloadTemplate = (type: 'csv' | 'json' = 'csv') => {
    const currentPlantName = onboardingData.plantName || "ExamplePlant";
    const currentPlantLocation = onboardingData.plantLocation || "Example Location";

    if (type === 'csv') {
        const headers = ["id", "name", "nodeId", "dataType", "uiType", "icon", "unit", "min", "max", "description", "category", "factor", "phase", "notes", "label"].join(',');
        const exampleRow = [`${currentPlantName.toLowerCase().replace(/\s+/g, '-')}-temp-sensor`, "Main Boiler Temperature", "ns=2;s=Device.PLC1.Boiler.Temperature", "Float", "line-chart", "Thermometer", "°C", "0", "150", "Temperature sensor for the main boiler unit.", "HVAC", "1", "L1", "Requires yearly calibration.", "Boiler Temp."].join(',');
        const csvContent = `${headers}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "datapoints_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("CSV Datapoint Template Downloaded.");
    } else if (type === 'json') {
      const jsonExample: FullConfigFile = {
        plantName: currentPlantName, plantLocation: currentPlantLocation, appName: onboardingData.appName || "MyMonitoringApp",
        opcUaEndpointOfflineIP: onboardingData.opcUaEndpointOffline?.split(':')[0] || '192.168.1.100',
        opcUaEndpointOfflinePort: Number(onboardingData.opcUaEndpointOffline?.split(':')[1]) || 4840,
        configuredDataPoints: [{
            id: `${currentPlantName.toLowerCase().replace(/\s+/g, '-')}-flow-rate`, name: "Coolant Flow Rate",
            nodeId: "ns=3;s=Factory.SystemA.Coolant.FlowRate", dataType: "Double", uiType: "gauge",
            icon: "Gauge", unit: "L/min", min: 0, max: 50, label: "Coolant Flow", category: "Process Values",
            description: "Flow rate of the primary coolant loop."
        }]
      };
      const jsonContent = JSON.stringify(jsonExample, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "full_config_template.json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Full JSON Config Template Downloaded.");
    }
  };

  const mapRowToDataPoint = (rowData: Record<string, any>, rowIndex: number, errorDetails: string[]): PartialDataPointFromFile | null => {
    const id = rowData.id?.toString().trim();
    if (!id) {
        errorDetails.push(`Row/Object ${rowIndex + 1}: Missing 'id'. Entry skipped.`);
        return null;
    }
    const iconName = rowData.icon?.toString().trim();
    const dataType = rowData.dataType?.toString().trim();
    if (dataType && !DATA_TYPE_OPTIONS.includes(dataType)) {
        errorDetails.push(`ID: ${id}, Row: ${rowIndex + 1}: Invalid dataType '${dataType}'. Will use default or existing.`);
    }
    const min = rowData.min !== undefined && rowData.min !== null && rowData.min !== '' ? parseFloat(rowData.min) : undefined;
    const max = rowData.max !== undefined && rowData.max !== null && rowData.max !== '' ? parseFloat(rowData.max) : undefined;
    const factor = rowData.factor !== undefined && rowData.factor !== null && rowData.factor !== '' ? parseFloat(rowData.factor) : undefined;

    return {
        id, name: rowData.name?.toString().trim() || undefined, nodeId: rowData.nodeId?.toString().trim() || undefined,
        dataType: dataType as DataPointConfig['dataType'] || undefined, uiType: rowData.uiType?.toString().trim() as DataPointConfig['uiType'] || undefined,
        icon: iconName, unit: rowData.unit?.toString().trim() || undefined, min: min !== undefined && !isNaN(min) ? min : undefined,
        max: max !== undefined && !isNaN(max) ? max : undefined, description: rowData.description?.toString().trim() || undefined,
        category: rowData.category?.toString().trim() || "Uncategorized", factor: factor !== undefined && !isNaN(factor) ? factor : undefined,
        phase: rowData.phase?.toString().trim() as DataPointConfig['phase'] || undefined, notes: rowData.notes?.toString().trim() || undefined,
        label: rowData.label?.toString().trim() || rowData.name?.toString().trim() || id,
    };
  };

  const parseAndProcessFile = useCallback(async (fileToProcess: File): Promise<DataPointConfig[]> => {
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
            } else { throw new Error("Invalid JSON. Expect array or object with 'configuredDataPoints'."); }
          } else if (fileToProcess.type === "text/csv" || fileToProcess.name.endsWith('.csv')) {
            const parseResult = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true, dynamicTyping: false });
            if (parseResult.errors.length > 0) { throw new Error(`CSV parsing issues: ${parseResult.errors.map(e => `Row ${e.row}: ${e.message}`).join('; ')}`); }
            dataPointsFromFile = (parseResult.data as Record<string, any>[]).map((row, index) =>
              mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
            ).filter(dp => dp !== null) as PartialDataPointFromFile[];
          } else if (fileToProcess.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileToProcess.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if(!sheetName) throw new Error("Excel file appears to be empty.");
            const worksheet = workbook.Sheets[sheetName];
            const excelRows = XLSX.utils.sheet_to_json(worksheet, {raw: false, defval: null}) as Record<string, any>[];
            dataPointsFromFile = excelRows.map((row, index) =>
              mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
            ).filter(dp => dp !== null) as PartialDataPointFromFile[];
          } else { throw new Error(`Unsupported file type: ${fileToProcess.type || "unknown"}.`); }
        
          if (plantDetailsFromFile && typeof setPlantDetails === 'function') {
            const plantDetailKeys = Object.keys(plantDetailsFromFile).filter(
                // @ts-ignore
                key => plantDetailsFromFile[key] !== undefined && plantDetailsFromFile[key] !== null
            );
            if (plantDetailKeys.length > 0) {
                 setPlantDetails(plantDetailsFromFile); 
                 localProcessingSummary.plantDetailsUpdated = true;
                 toast.success("Plant details from JSON file applied.", {
                    description: `Updated fields: ${plantDetailKeys.slice(0,3).join(', ')}${plantDetailKeys.length > 3 ? '...' : '.'}`
                 });
            }
          }

          const newConfiguredPoints: DataPointConfig[] = JSON.parse(JSON.stringify(configuredDataPoints)); 

          dataPointsFromFile.forEach((dpFromFilePartial) => {
            localProcessingSummary.processed++;
            if (!dpFromFilePartial || !dpFromFilePartial.id) {
                localProcessingSummary.skipped++;
                return;
            }
            const { icon: iconNameFromFile, ...restOfPointFromFile } = dpFromFilePartial;
            
            let finalIcon: IconComponentType | undefined = undefined;
            if(typeof iconNameFromFile === 'string' && iconNameFromFile.trim() !== '') {
                const IconFromLib = getIconComponent(iconNameFromFile);
                if (IconFromLib) {
                    finalIcon = IconFromLib;
                } else {
                    localProcessingSummary.errors++;
                    localProcessingSummary.errorDetails.push(`ID: ${dpFromFilePartial.id}: Icon '${iconNameFromFile}' not found.`);
                }
            }

            const existingPointIndex = newConfiguredPoints.findIndex(p => p.id === dpFromFilePartial.id);
            
            if (existingPointIndex !== -1) { 
              const existingPoint = newConfiguredPoints[existingPointIndex];
              Object.keys(restOfPointFromFile).forEach(keyStr => {
                const key = keyStr as keyof typeof restOfPointFromFile;
                const fileValue = restOfPointFromFile[key];
                if (fileValue !== undefined ) {
                  if(typeof fileValue === 'string' && fileValue.trim() === '' && typeof existingPoint[key as keyof DataPointConfig] === 'string'){
                     (existingPoint as any)[key] = '';
                  } else if ((typeof fileValue === 'string' && fileValue.trim() !== '') || typeof fileValue !== 'string') {
                    (existingPoint as any)[key] = fileValue;
                  }
                }
              });
              if(finalIcon) existingPoint.icon = finalIcon; 
              localProcessingSummary.updated++;
            } else { 
              const requiredFields: (keyof Omit<DataPointConfig, 'icon'>)[] = ['id', 'name', 'nodeId', 'dataType', 'uiType', 'label'];
              const isNewPointValid = requiredFields.every(field => {
                  const val = restOfPointFromFile[field as keyof typeof restOfPointFromFile];
                  return val !== undefined && val !== null && (typeof val !== 'string' || val.trim() !== '');
              });
              
              if (isNewPointValid) {
                newConfiguredPoints.push({
                    ...restOfPointFromFile,
                    icon: finalIcon || DEFAULT_ICON, 
                    category: restOfPointFromFile.category?.trim() || 'General',
                    label: restOfPointFromFile.label?.trim() || restOfPointFromFile.name?.trim() || restOfPointFromFile.id!,
                } as DataPointConfig);
                localProcessingSummary.added++;
              } else {
                localProcessingSummary.errors++; localProcessingSummary.skipped++;
                const missing = requiredFields.filter(f => {
                    const val = restOfPointFromFile[f];
                    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
                }).join(', ') || 'invalid data types';
                localProcessingSummary.errorDetails.push(`ID: ${dpFromFilePartial.id} (New): Skipped. Missing required fields (${missing}).`);
              }
            }
          });

          setProcessingSummary(localProcessingSummary);
          if (localProcessingSummary.errors > 0 || localProcessingSummary.skipped > 0) {
            toast.warning("File Processed with Issues", { description: `${localProcessingSummary.errors} error(s), ${localProcessingSummary.skipped} skipped.`, duration: 7000 });
          } else if (localProcessingSummary.processed === 0 && !localProcessingSummary.plantDetailsUpdated) {
            toast.info("No New Data Processed", { description: "The file did not contain new data points or updatable plant details."});
          } else {
            let successMsg = `Processed: ${localProcessingSummary.processed}`;
            if(localProcessingSummary.updated > 0) successMsg += `, Updated: ${localProcessingSummary.updated}`;
            if(localProcessingSummary.added > 0) successMsg += `, Added: ${localProcessingSummary.added}`;
            toast.success("File Processed Successfully!", { description: successMsg + "." });
          }
          resolve(newConfiguredPoints);

        } catch (e: any) {
          const errorMessage = e.message || "An unknown error occurred.";
          localProcessingSummary.errors++;
          localProcessingSummary.errorDetails.push(`Critical error: ${errorMessage}`);
          setProcessingSummary(localProcessingSummary);
          toast.error("File Processing Failed", { description: errorMessage, duration: 8000 });
          reject(configuredDataPoints); 
        }
      };
      reader.onerror = (e) => {
        const readErrorMsg = "Failed to read the file.";
        setProcessingSummary(prev => ({ ...(prev || { processed:0,updated:0,added:0,skipped:0,errors:0,errorDetails:[]}), errors: (prev?.errors || 0) + 1, errorDetails: [...(prev?.errorDetails || []), readErrorMsg] }));
        toast.error("File Read Error", { description: readErrorMsg });
        reject(configuredDataPoints);
      };

      if (fileToProcess.name.endsWith('.xlsx')) reader.readAsArrayBuffer(fileToProcess);
      else reader.readAsText(fileToProcess);
    });
  }, [configuredDataPoints, setPlantDetails]);


  const handleUploadAndProcess = useCallback(async () => {
    if (!file) {
      toast.warning("No file selected.");
      return;
    }
    setIsLoading(true); setProcessingSummary(null);
    try {
      const processedDataPoints = await parseAndProcessFile(file);
      setConfiguredDataPoints(processedDataPoints);
    } catch (error) {
       toast.error("Unhandled Processing Error", { description: "An unexpected critical error occurred." });
    } finally {
      setIsLoading(false);
    }
  }, [file, parseAndProcessFile, setConfiguredDataPoints]);

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setManualDataPoint(prev => ({ ...prev, [name]: value }));
      if (manualFormErrors[name]) setManualFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleManualSelectChange = (fieldName: keyof ManualDataPointState, value: string) => {
      setManualDataPoint(prev => ({ ...prev, [fieldName]: value as any }));
      if (manualFormErrors[fieldName as string]) setManualFormErrors(prev => ({ ...prev, [fieldName as string]: '' }));
  };
  
  const validateManualForm = (): boolean => {
      const errors: Record<string, string> = {};
      const trimmedId = manualDataPoint.id?.trim();
      const trimmedName = manualDataPoint.name?.trim();
      const trimmedNodeId = manualDataPoint.nodeId?.trim();
      if (!trimmedId) errors.id = "ID is required.";
      else if (configuredDataPoints.some(dp => dp.id === trimmedId)) errors.id = "This ID already exists.";
      if (!trimmedName) errors.name = "Name is required.";
      if (!trimmedNodeId) errors.nodeId = "OPC UA Node ID is required.";
      const iconTrimmed = manualDataPoint.icon?.trim();
      if (iconTrimmed && !getIconComponent(iconTrimmed)) errors.icon = "Icon name not found. Default will be used.";
      if (manualDataPoint.min && isNaN(Number(manualDataPoint.min))) errors.min = "Min must be a valid number.";
      if (manualDataPoint.max && isNaN(Number(manualDataPoint.max))) errors.max = "Max must be a valid number.";
      if (manualDataPoint.factor && isNaN(Number(manualDataPoint.factor))) errors.factor = "Factor must be a valid number.";

      setManualFormErrors(errors);
      return !errors.id && !errors.name && !errors.nodeId && !errors.min && !errors.max && !errors.factor;
  };

  const handleSaveManualDataPoint = () => {
      if (!validateManualForm()) {
          toast.error("Validation Error", { description: "Please fix the errors in the form."});
          return;
      }
      const iconString = manualDataPoint.icon?.trim() || initialManualDataPointState.icon || 'Tag';
      const IconComponent = getIconComponent(iconString) || DEFAULT_ICON;
      const finalLabel = manualDataPoint.label?.trim() || manualDataPoint.name!.trim() || manualDataPoint.id!;
      const parseNumericField = (value?: string): number | undefined => {
          if (value === undefined || value.trim() === '') return undefined;
          const num = Number(value);
          return isNaN(num) ? undefined : num;
      };

      const newPoint: DataPointConfig = {
          id: manualDataPoint.id!.trim(), name: manualDataPoint.name!.trim(), nodeId: manualDataPoint.nodeId!.trim(),
          label: finalLabel, dataType: manualDataPoint.dataType as DataPointConfig['dataType'], uiType: manualDataPoint.uiType as DataPointConfig['uiType'],
          icon: IconComponent, unit: manualDataPoint.unit?.trim() || undefined, min: parseNumericField(manualDataPoint.min),
          max: parseNumericField(manualDataPoint.max), description: manualDataPoint.description?.trim() || undefined,
          category: manualDataPoint.category?.trim() || 'General', factor: parseNumericField(manualDataPoint.factor),
          phase: manualDataPoint.phase?.trim() as DataPointConfig['phase'] || undefined, notes: manualDataPoint.notes?.trim() || undefined,
      };

      setConfiguredDataPoints(prev => [...prev, newPoint]);
      toast.success(`Data point "${newPoint.name}" added successfully!`);
      setShowManualForm(false);
      setManualDataPoint(initialManualDataPointState);
      setManualFormErrors({});
  };

  const handleCancelManualForm = () => {
      setShowManualForm(false);
      setManualDataPoint(initialManualDataPointState);
      setManualFormErrors({});
  };

  return (
    <motion.div
        key="datapoint-config-step-enhanced"
        variants={containerVariants}
        initial="hidden" animate="visible" exit="exit"
        className="space-y-4 sm:space-y-6 p-4 sm:p-6"
    >
        <motion.div variants={itemVariants(0)}>
            <Card className="shadow-xl dark:shadow-black/30 border-border/60 bg-gradient-to-br from-card via-card to-card/90 dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-800/90 backdrop-blur-lg">
                <CardHeader className="border-b border-border/50 dark:border-neutral-700/50 pb-4">
                    <div className="flex items-center space-x-3.5">
                        <Merge className="h-8 w-8 text-primary shrink-0"/>
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                                Advanced Data Point Configuration
                            </CardTitle>
                             <CardDescription className="text-sm text-muted-foreground mt-0.5">
                                Streamline setup by uploading files or adding points manually.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                 <CardContent className="pt-5 text-xs text-muted-foreground">
                    <p className="flex items-start">
                        <Info size={18} className="mr-2 mt-px text-sky-500 shrink-0"/>
                        <span>
                            Uploaded files (CSV, JSON, XLSX) can add new or update existing data points based on `id`. JSON can also modify plant settings.
                        </span>
                    </p>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.1)}>
            <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <Download className="h-6 w-6 text-sky-500 dark:text-sky-400 shrink-0"/>
                        <CardTitle className="text-lg sm:text-xl font-medium">Download Configuration Templates</CardTitle>
                    </div>
                     <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-1.5">
                        Start with our pre-formatted templates to ensure compatibility for uploads.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div {...buttonMotionProps(0, false)}>
                        <Button variant="outline" onClick={() => downloadTemplate('csv')} className="w-full group text-base py-6 border-green-500/50 hover:border-green-500 hover:bg-green-500/5">
                            <FileSpreadsheet className="h-5 w-5 mr-3 text-green-600 dark:text-green-400 transition-transform duration-200 group-hover:rotate-[-5deg] group-hover:scale-110"/>
                            Data Points (CSV)
                        </Button>
                    </motion.div>
                    <motion.div {...buttonMotionProps(0.05, false)}>
                         <Button variant="outline" onClick={() => downloadTemplate('json')} className="w-full group text-base py-6 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/5">
                            <FileJson className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 transition-transform duration-200 group-hover:rotate-[5deg] group-hover:scale-110"/>
                            Full Config (JSON)
                        </Button>
                    </motion.div>
                </CardContent>
                 <CardFooter className="pt-3">
                    <p className="text-xs text-muted-foreground flex items-center">
                       <ExternalLink size={14} className="mr-1.5 shrink-0"/> Icon names should match those on  <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors"> Lucide.dev</a>.
                    </p>
                </CardFooter>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.2)}>
            <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <CloudUpload className="h-6 w-6 text-indigo-500 dark:text-indigo-400 shrink-0"/>
                        <CardTitle className="text-lg sm:text-xl font-medium">Upload Your Configuration File</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <motion.div
                        variants={dropzoneVariants}
                        animate={isDraggingOver ? "dragging" : "idle"}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className={cn(
                            "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-out",
                            {"ring-2 ring-primary ring-offset-2 ring-offset-background": isDraggingOver}
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    >
                        <motion.div
                            animate={{ y: isDraggingOver ? -5 : 0 }}
                            transition={{type: "spring", stiffness:300, damping:10}}
                        >
                            <UploadCloud className={cn("h-12 w-12 mb-3 transition-colors", isDraggingOver ? "text-primary" : "text-gray-400 dark:text-gray-500")} />
                        </motion.div>
                        <p className={cn("text-base font-medium transition-colors", isDraggingOver ? "text-primary" : "text-gray-700 dark:text-gray-200")}>
                            {file ? `File: ${file.name}` : "Drag & drop your file here, or click to browse"}
                        </p>
                        <p className={cn("text-xs transition-colors mt-1.5", isDraggingOver ? "text-primary/80" : "text-muted-foreground")}>
                            Supports: CSV, JSON, XLSX
                        </p>
                        <Input
                            ref={fileInputRef} id="file-upload-dnd" type="file" className="hidden" 
                            onChange={handleFileChange}
                            accept=".csv, .json, application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xlsx"
                        />
                    </motion.div>
                     <AnimatePresence>
                     {file && (
                        <motion.div
                            layout initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -10, transition: {duration: 0.2}}}
                            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3"
                        >
                             <motion.div {...buttonMotionProps(0, true)} className="w-full sm:flex-grow">
                                <Button onClick={handleUploadAndProcess} disabled={isLoading || !file} size="lg" className="w-full group text-base py-3">
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 mr-2.5 animate-spin" />
                                    ) : (
                                        <ListChecks className="h-5 w-5 mr-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                                    )}
                                    {isLoading ? "Processing..." : `Process: ${file.name.length > 25 ? file.name.substring(0,22) + '...' : file.name }`}
                                </Button>
                            </motion.div>
                            <motion.div {...buttonMotionProps(0.05)} className="w-full sm:w-auto">
                                <Button variant="outline" size="lg" onClick={clearFileSelection} className="w-full group text-base py-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                    <Trash2 className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:scale-110" /> Clear File
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
        
        <motion.div variants={itemVariants(0.3)}>
            <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                            <PlusCircle className="h-6 w-6 text-teal-500 dark:text-teal-400 shrink-0"/>
                            <CardTitle className="text-lg sm:text-xl font-medium">Add Data Point Manually</CardTitle>
                        </div>
                        {!showManualForm && (
                             <motion.div {...buttonMotionProps(0, false)}>
                                <Button onClick={() => setShowManualForm(true)} variant="outline" size="sm" className="group">
                                    <PlusCircle className="h-4 w-4 mr-2 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors" />
                                    Add New
                                </Button>
                            </motion.div>
                        )}
                    </div>
                    <AnimatePresence>
                    {showManualForm && (
                       <motion.div initial={{opacity:0, height: 0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height: 0}}>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-2">
                                Fill in the details for the new data point. Fields marked * are required.
                            </CardDescription>
                       </motion.div>
                    )}
                    </AnimatePresence>
                </CardHeader>
                
                <AnimatePresence>
                {showManualForm && (
                    <motion.div
                        key="manual-form-content"
                        variants={contentAppearVariants}
                        initial="hidden" animate="visible" exit="exit"
                    >
                        <CardContent className="space-y-5 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-id">ID *</Label>
                                    <Input id="manual-id" name="id" value={manualDataPoint.id ?? ''} onChange={handleManualInputChange} placeholder="Unique identifier" />
                                    {manualFormErrors.id && <p className="text-xs text-red-500 pt-1">{manualFormErrors.id}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-name">Name *</Label>
                                    <Input id="manual-name" name="name" value={manualDataPoint.name ?? ''} onChange={handleManualInputChange} placeholder="Descriptive name" />
                                    {manualFormErrors.name && <p className="text-xs text-red-500 pt-1">{manualFormErrors.name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-nodeId">OPC UA Node ID *</Label>
                                    <Input id="manual-nodeId" name="nodeId" value={manualDataPoint.nodeId ?? ''} onChange={handleManualInputChange} placeholder="e.g., ns=2;s=Device.Boiler.Temp1" />
                                    {manualFormErrors.nodeId && <p className="text-xs text-red-500 pt-1">{manualFormErrors.nodeId}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-label">Label (UI Display)</Label>
                                    <Input id="manual-label" name="label" value={manualDataPoint.label ?? ''} onChange={handleManualInputChange} placeholder="Short name (uses Name if blank)" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-dataType">Data Type *</Label>
                                    <Select name="dataType" value={manualDataPoint.dataType} onValueChange={(value) => handleManualSelectChange('dataType', value)}>
                                        <SelectTrigger id="manual-dataType"><SelectValue placeholder="Select data type" /></SelectTrigger>
                                        <SelectContent>{DATA_TYPE_OPTIONS.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-uiType">UI Type *</Label>
                                    <Select name="uiType" value={manualDataPoint.uiType} onValueChange={(value) => handleManualSelectChange('uiType', value)}>
                                        <SelectTrigger id="manual-uiType"><SelectValue placeholder="Select UI type" /></SelectTrigger>
                                        <SelectContent>{UI_TYPE_OPTIONS.map(uit => <SelectItem key={uit} value={uit}>{uit}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-icon">Icon Name</Label>
                                    <Input id="manual-icon" name="icon" value={manualDataPoint.icon ?? ''} onChange={handleManualInputChange} placeholder="e.g., Thermometer" />
                                    {manualFormErrors.icon && <p className="text-xs text-orange-500 pt-1">{manualFormErrors.icon}</p>}
                                    <p className="text-xs text-muted-foreground pt-0.5">From <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Lucide.dev</a> (optional).</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-unit">Unit</Label>
                                    <Input id="manual-unit" name="unit" value={manualDataPoint.unit ?? ''} onChange={handleManualInputChange} placeholder="e.g., °C, kWh" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-category">Category</Label>
                                    <Input id="manual-category" name="category" value={manualDataPoint.category ?? ''} onChange={handleManualInputChange} placeholder="e.g., HVAC, Production" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-min">Min Value</Label>
                                    <Input id="manual-min" name="min" type="number" value={manualDataPoint.min ?? ''} onChange={handleManualInputChange} placeholder="Numeric minimum" />
                                    {manualFormErrors.min && <p className="text-xs text-red-500 pt-1">{manualFormErrors.min}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-max">Max Value</Label>
                                    <Input id="manual-max" name="max" type="number" value={manualDataPoint.max ?? ''} onChange={handleManualInputChange} placeholder="Numeric maximum" />
                                    {manualFormErrors.max && <p className="text-xs text-red-500 pt-1">{manualFormErrors.max}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-factor">Factor</Label>
                                    <Input id="manual-factor" name="factor" type="number" value={manualDataPoint.factor ?? ''} onChange={handleManualInputChange} placeholder="Multiplier (e.g., 0.1)" />
                                     {manualFormErrors.factor && <p className="text-xs text-red-500 pt-1">{manualFormErrors.factor}</p>}
                                </div>
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label htmlFor="manual-phase">Phase / Subsystem</Label>
                                    <Input id="manual-phase" name="phase" value={manualDataPoint.phase ?? ''} onChange={handleManualInputChange} placeholder="e.g., L1, Coolant Loop" />
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-description">Description</Label>
                                <Textarea id="manual-description" name="description" value={manualDataPoint.description ?? ''} onChange={handleManualInputChange} placeholder="Optional detailed description" className="min-h-[60px]" />
                            </div>
                             <div className="space-y-1.5">
                                <Label htmlFor="manual-notes">Internal Notes</Label>
                                <Textarea id="manual-notes" name="notes" value={manualDataPoint.notes ?? ''} onChange={handleManualInputChange} placeholder="Optional internal notes or remarks" className="min-h-[60px]" />
                            </div>
                        </CardContent>
                        <CardFooter className="pt-6 flex justify-end space-x-3 border-t border-border/50 dark:border-neutral-700/50">
                            <motion.div {...buttonMotionProps(0.05)}>
                                <Button variant="outline" onClick={handleCancelManualForm} className="group">
                                   <XCircle className="h-4 w-4 mr-2 group-hover:text-muted-foreground transition-colors" /> Cancel
                                </Button>
                            </motion.div>
                            <motion.div {...buttonMotionProps(0, true)}>
                                <Button onClick={handleSaveManualDataPoint} className="group">
                                    <Save className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> Save Data Point
                                </Button>
                            </motion.div>
                        </CardFooter>
                    </motion.div>
                )}
                </AnimatePresence>
            </Card>
        </motion.div>

        <AnimatePresence>
            {isLoading && !processingSummary && (
                 <motion.div
                    key="loading-indicator-main"
                    variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit"
                    className="flex flex-col items-center justify-center p-8 space-y-3.5 bg-card/50 dark:bg-neutral-800/40 rounded-lg shadow-inner"
                  >
                    <Loader2 className="h-10 w-10 text-primary animate-spin"/>
                    <p className="text-lg font-medium text-muted-foreground">Crunching the Data...</p>
                    <p className="text-sm text-muted-foreground/80">Hold tight, we're processing your configuration.</p>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {processingSummary && (
                <motion.div
                    key="processing-summary-card"
                    variants={contentAppearVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="mt-8" 
                >
                    <Card className={cn("shadow-xl dark:shadow-black/25 overflow-hidden", 
                        processingSummary.errors > 0 || processingSummary.skipped > 0
                            ? 'border-orange-500/70 dark:border-orange-600/70 bg-orange-50/30 dark:bg-orange-900/10'
                            : 'border-green-500/70 dark:border-green-600/70 bg-green-50/30 dark:bg-green-900/10'
                    )}>
                        <CardHeader className={cn("border-b pb-3",
                             processingSummary.errors > 0 || processingSummary.skipped > 0
                                ? 'border-orange-500/30 dark:border-orange-600/30 bg-orange-500/5 dark:bg-orange-800/10'
                                : 'border-green-500/30 dark:border-green-600/30 bg-green-500/5 dark:bg-green-800/10'
                        )}>
                             <div className="flex items-center space-x-3.5">
                                {processingSummary.errors > 0 || processingSummary.skipped > 0 ? (
                                    <AlertTriangle className="h-7 w-7 text-orange-500 shrink-0" />
                                ) : (
                                    <CheckCircle className="h-7 w-7 text-green-500 shrink-0" />
                                )}
                                <CardTitle className={cn("text-xl sm:text-2xl", 
                                    processingSummary.errors > 0 || processingSummary.skipped > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'
                                )}>
                                    File Processing Complete
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-6 space-y-4 text-sm">
                            {processingSummary.plantDetailsUpdated && (
                                <motion.div variants={itemVariants(0.05)} className="flex items-start p-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
                                    <Info className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
                                    <p>Plant-level configuration details from your JSON file were successfully applied.</p>
                                </motion.div>
                            )}
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-base"> 
                                <li className="flex justify-between"><span>Entries Processed:</span> <span className="font-semibold">{processingSummary.processed}</span></li>
                                <li className="flex justify-between text-sky-700 dark:text-sky-300"><span>Points Updated:</span> <span className="font-semibold">{processingSummary.updated}</span></li>
                                <li className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Points Added:</span> <span className="font-semibold">{processingSummary.added}</span></li>
                                
                                {processingSummary.skipped > 0 && (
                                   <li className="flex justify-between text-amber-700 dark:text-amber-400"><span>Entries Skipped:</span> <span className="font-semibold">{processingSummary.skipped}</span></li>
                                )}
                                <li className={cn("flex justify-between", processingSummary.errors > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300')}>
                                   <span>Field-Level Errors:</span> <span className="font-semibold">{processingSummary.errors}</span>
                                </li>
                            </ul>

                            {(processingSummary.errors > 0 || processingSummary.skipped > 0) && processingSummary.errorDetails.length > 0 && (
                                <motion.div variants={itemVariants(0.1)} className="pt-3">
                                    <p className="text-base font-medium text-gray-700 dark:text-gray-200 mb-1.5">Detailed Issues:</p>
                                    <ScrollArea className="max-h-52 rounded-lg border bg-background/70 dark:bg-neutral-800/50 p-3 shadow-inner">
                                        <ul className="space-y-1.5 text-xs">
                                            {processingSummary.errorDetails.map((err, i) => (
                                                <li key={i} className="flex items-start text-muted-foreground">
                                                     <AlertTriangle className="h-4 w-4 mr-2 mt-px text-orange-500/80 shrink-0"/>
                                                    <span>{err}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>

        <motion.div variants={itemVariants(0.4)} className="text-center">
            <div className="inline-flex items-center justify-center p-3 px-5 rounded-full bg-muted/60 dark:bg-neutral-800/50 border border-border/70 shadow-sm">
                <Database className="h-5 w-5 mr-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Total data points configured: <span className="font-semibold text-lg text-primary">{configuredDataPoints.length}</span>
                </p>
            </div>
        </motion.div>
    </motion.div>
  );
}