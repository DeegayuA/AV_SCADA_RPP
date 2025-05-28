"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AVAILABLE_SLD_LAYOUT_IDS } from "@/config/constants";
import {
  Copy, Save, FolderKanban, Upload, Download, Trash2, ChevronsUpDown,
  Info, DownloadCloud, FileJson, PlusCircle, Settings2, ExternalLink,
  FileUp, FileDown, Wrench, ServerCog, RefreshCcw, AlertCircle, Link2Off, Palette, BrainCircuit, CloudFog, MessageSquareWarning
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage"; // Keep if you have a specific hook
import SLDWidget from "@/app/circuit/sld/SLDWidget"; // Assuming path is corrected
import { motion, AnimatePresence, Variants } from "framer-motion";

// Shadcn UI Components (as before)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge"; // New component

const SLD_WIDGET_LOCAL_STORAGE_KEY_PREFIX = "sldLayout_";

interface SavedCircuit {
  name: string;
  code: string;
  layoutId: string;
  lastModified: string;
}

const formatLayoutIdForDisplay = (id: string) =>
  id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// Animation Variants
const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "circOut" } },
  out: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "circIn" } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

const cardEntryVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.6, -0.05, 0.01, 0.99] } },
};

export default function CircuitDesignerStudio() {
  const [selectedLayout, setSelectedLayout] = useState<string>(
    AVAILABLE_SLD_LAYOUT_IDS[0]
  );
  const [currentSldCode, setCurrentSldCode] = useState<string>("");
  const [initialCodeForLoadedDesign, setInitialCodeForLoadedDesign] = useState<string>("");
  const [actualLayoutIdFromWidget, setActualLayoutIdFromWidget] =
    useState<string>(AVAILABLE_SLD_LAYOUT_IDS[0]);

  const [isDesignsSheetOpen, setIsDesignsSheetOpen] = useState<boolean>(false);
  const [savedCircuits, setSavedCircuits] = useState<SavedCircuit[]>([]);
  const [currentCircuitName, setCurrentCircuitName] = useState<string>("");
  const [originalLoadedCircuitName, setOriginalLoadedCircuitName] = useState<string>("");

  const [sldWidgetRefreshKey, setSldWidgetRefreshKey] = useState<number>(0);

  const sldCodeTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCircuit, setIsLoadingCircuit] = useState(false);
  const [isConnectingBackend, setIsConnectingBackend] = useState(false);

  const getItem = (key: string) => typeof window !== "undefined" ? localStorage.getItem(key) : null;
  const setItem = (key: string, value: string) => typeof window !== "undefined" ? localStorage.setItem(key, value) : null;

  useEffect(() => {
    const savedData = getItem("studio_savedCircuits_v3"); // Versioning for potential schema changes
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as SavedCircuit[];
        if (Array.isArray(parsedData) && parsedData.every(item =>
            typeof item.name === "string" && typeof item.code === "string" &&
            typeof item.layoutId === "string" && typeof item.lastModified === "string")) {
          setSavedCircuits(parsedData);
        } else {
          setSavedCircuits([]); setItem("studio_savedCircuits_v3", JSON.stringify([]));
        }
      } catch (error) {
        setSavedCircuits([]); setItem("studio_savedCircuits_v3", JSON.stringify([]));
      }
    }
  }, []);

  const isDirty = currentSldCode !== initialCodeForLoadedDesign || (currentCircuitName !== originalLoadedCircuitName && originalLoadedCircuitName !== "");

  const handleSldWidgetCodeChange = useCallback(
    (code: string, layoutId: string) => {
      setCurrentSldCode(code);
      setActualLayoutIdFromWidget(layoutId);
      // If it's the first code emission after loading a design, set initialCode
      if (isLoadingCircuit && code !== "") {
        setInitialCodeForLoadedDesign(code);
        setIsLoadingCircuit(false); // Mark loading as complete
      } else if (!originalLoadedCircuitName && code !== "" && initialCodeForLoadedDesign === "") {
        // If starting fresh or after clearing, set initial code for new design
        setInitialCodeForLoadedDesign(code);
      }
    },
    [isLoadingCircuit, originalLoadedCircuitName, initialCodeForLoadedDesign]
  );

  const copyToClipboard = useCallback(async () => { /* ... same as before ... */
    if (!currentSldCode) { toast.info("No SLD code to copy."); return; }
    try { await navigator.clipboard.writeText(currentSldCode); toast.success("SLD code copied!"); }
    catch (err) {
      if (sldCodeTextAreaRef.current) {
        sldCodeTextAreaRef.current.select();
        try { document.execCommand("copy"); toast.success("SLD code copied (fallback)"); }
        catch (fallbackErr) { toast.error("Failed to copy."); }
      } else { toast.error("Failed to copy."); }
    }
  }, [currentSldCode]);

  const [isLayoutMismatchDialogOpen, setIsLayoutMismatchDialogOpen] = useState(false);
  const [isOverwriteDialogOpen, setIsOverwriteDialogOpen] = useState(false);
  const [circuitToOverwrite, setCircuitToOverwrite] = useState<SavedCircuit | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [circuitToDelete, setCircuitToDelete] = useState<string | null>(null);
  const [isSwitchLayoutDialogOpen, setIsSwitchLayoutDialogOpen] = useState(false);
  const [targetLayoutForSwitch, setTargetLayoutForSwitch] = useState<string | null>(null);
  const [isWidgetLayoutSwitchDialogOpen, setIsWidgetLayoutSwitchDialogOpen] = useState(false);
  const [layoutFromWidgetSwitch, setLayoutFromWidgetSwitch] = useState<string|null>(null);
  const [isClearCanvasConfirmOpen, setIsClearCanvasConfirmOpen] = useState(false);


  const saveCurrentCircuit = async () => {
    if (!currentCircuitName.trim()) { toast.error("Please enter a design name."); return; }
    if (!currentSldCode.trim()) { toast.error("No SLD data to save."); return; }
    setIsSaving(true);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 700));

    if (actualLayoutIdFromWidget !== selectedLayout && actualLayoutIdFromWidget) {
      setIsSaving(false);
      setIsLayoutMismatchDialogOpen(true);
    } else {
      proceedWithSave(selectedLayout);
    }
  };

  const proceedWithSave = (layoutIdToSaveWith: string, overwrite = false) => {
    const newCircuitData: SavedCircuit = {
      name: currentCircuitName.trim(), code: currentSldCode,
      layoutId: layoutIdToSaveWith, lastModified: new Date().toISOString(),
    };
    const existingIndex = savedCircuits.findIndex(c => c.name === newCircuitData.name);

    if (existingIndex >= 0 && !overwrite) {
      setCircuitToOverwrite(newCircuitData);
      setIsSaving(false);
      setIsOverwriteDialogOpen(true); return;
    }
    
    let updatedCircuits;
    if (existingIndex >= 0 && overwrite) {
      updatedCircuits = [...savedCircuits];
      updatedCircuits[existingIndex] = newCircuitData;
      toast.success(`Design "${newCircuitData.name}" updated.`);
    } else {
      updatedCircuits = [...savedCircuits, newCircuitData];
      toast.success(`Design "${newCircuitData.name}" saved.`);
    }
    setSavedCircuits(updatedCircuits);
    setItem("studio_savedCircuits_v3", JSON.stringify(updatedCircuits));
    setInitialCodeForLoadedDesign(currentSldCode); // Mark current state as saved
    setOriginalLoadedCircuitName(currentCircuitName);
    setIsLayoutMismatchDialogOpen(false); setIsOverwriteDialogOpen(false);
    setIsSaving(false);
  };

  const loadSavedCircuit = async (circuitName: string) => {
    if(isDirty){
      toast("Unsaved changes", {
        description: "You have unsaved changes. Load anyway and discard them?",
        action: { label: "Load & Discard", onClick: () => performLoad(circuitName)},
        cancel: { label: "Cancel", onClick: () => {} }
      });
      return;
    }
    performLoad(circuitName);
  };

  const performLoad = (circuitName: string) => {
    const circuitToLoad = savedCircuits.find((c) => c.name === circuitName);
    if (circuitToLoad) {
      setIsLoadingCircuit(true); // Set loading state for handleSldWidgetCodeChange
      localStorage.setItem(`${SLD_WIDGET_LOCAL_STORAGE_KEY_PREFIX}${circuitToLoad.layoutId}`, circuitToLoad.code);
      setCurrentCircuitName(circuitToLoad.name);
      setOriginalLoadedCircuitName(circuitToLoad.name);
      // Set initial code for dirty checking when loading a design, this will be refined by onSldCodeChange
      setInitialCodeForLoadedDesign("LOADING_PLACEHOLDER_CODE"); // A placeholder
      setCurrentSldCode(circuitToLoad.code); // Tentatively set, SLDWidget's onCodeChange will confirm


      if (selectedLayout === circuitToLoad.layoutId) {
        setSldWidgetRefreshKey((prev) => prev + 1);
      } else {
        setSelectedLayout(circuitToLoad.layoutId);
      }
      
      toast.success(`Design "${circuitToLoad.name}" loaded.`);
      setIsDesignsSheetOpen(false);
    } else {
      toast.error(`Design "${circuitName}" not found.`);
      setIsLoadingCircuit(false);
    }
  }
  
  const confirmDeleteCircuit = (circuitName: string) => { /* ... same ... */
    setCircuitToDelete(circuitName); setIsDeleteConfirmOpen(true);
  };
  const executeDeleteCircuit = () => { /* ... same ... */
    if(!circuitToDelete) return;
    const newSavedCircuits = savedCircuits.filter(c => c.name !== circuitToDelete);
    setSavedCircuits(newSavedCircuits); setItem("studio_savedCircuits_v3", JSON.stringify(newSavedCircuits));
    toast.success(`Design "${circuitToDelete}" deleted.`);
    if (currentCircuitName === circuitToDelete) {
        handleClearCanvas(false); // Clear canvas if deleted design was active
    }
    setIsDeleteConfirmOpen(false); setCircuitToDelete(null);
  };

  const exportCircuits = () => { /* ... same ... */
    if (savedCircuits.length === 0) { toast.info("No designs to export."); return; }
    const dataStr = JSON.stringify(savedCircuits, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `studio-circuit-designs-${new Date().toISOString().substring(0, 10)}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri); linkElement.setAttribute("download", exportFileDefaultName);
    document.body.appendChild(linkElement); linkElement.click(); document.body.removeChild(linkElement);
    toast.success("All designs exported.");
  };

  const handleImportCircuits = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... same, ensure UI updates ... */
    const file = event.target.files?.[0]; if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as SavedCircuit[];
        if (Array.isArray(parsedData) && parsedData.every(item =>
            item.name && item.code && item.layoutId && item.lastModified && AVAILABLE_SLD_LAYOUT_IDS.includes(item.layoutId))) {
          const combinedCircuitsMap = new Map<string, SavedCircuit>();
          savedCircuits.forEach(c => combinedCircuitsMap.set(c.name, c));
          parsedData.forEach(c => combinedCircuitsMap.set(c.name, c));
          const mergedCircuits = Array.from(combinedCircuitsMap.values());
          setSavedCircuits(mergedCircuits); setItem("studio_savedCircuits_v3", JSON.stringify(mergedCircuits));
          toast.success(`${parsedData.length} circuits imported/updated.`);
        } else { toast.error("Invalid file format or content."); }
      } catch (err) { toast.error("Failed to import. Invalid JSON."); }
      finally { if(event.target) event.target.value = ""; }
    };
    fileReader.readAsText(file, "UTF-8");
  };
  
  const handleLayoutSelectChange = (newLayoutId: string) => { /* ... same ... */
    if (newLayoutId !== selectedLayout) {
      setTargetLayoutForSwitch(newLayoutId); setIsSwitchLayoutDialogOpen(true);
    }
  };
  const executeSwitchLayout = () => { /* ... same ... */
    if (!targetLayoutForSwitch) return;
    setSelectedLayout(targetLayoutForSwitch);
    setCurrentCircuitName(""); 
    setOriginalLoadedCircuitName(""); // Reset tracking for new layout
    setInitialCodeForLoadedDesign(""); // New layout means new base code from SLDWidget
    setIsSwitchLayoutDialogOpen(false); setTargetLayoutForSwitch(null);
    toast.info(`Switched to ${formatLayoutIdForDisplay(targetLayoutForSwitch)} layout template.`);
  };
  
  const handleSLDWidgetLayoutChange = (newLayoutIdFromWidget: string) => { /* ... same ... */
    if (newLayoutIdFromWidget !== selectedLayout) {
      setLayoutFromWidgetSwitch(newLayoutIdFromWidget); setIsWidgetLayoutSwitchDialogOpen(true);
    }
  }
  const executeWidgetLayoutSwitch = () => { /* ... same ... */
    if (!layoutFromWidgetSwitch) return;
    setSelectedLayout(layoutFromWidgetSwitch);
    setCurrentCircuitName("");
    setOriginalLoadedCircuitName("");
    setInitialCodeForLoadedDesign("");
    setIsWidgetLayoutSwitchDialogOpen(false); setLayoutFromWidgetSwitch(null);
    toast.info(`Studio layout synced with SLD Widget: ${formatLayoutIdForDisplay(layoutFromWidgetSwitch)}.`);
  };

  const handleClearCanvas = (prompt = true) => {
    if (prompt) {
        setIsClearCanvasConfirmOpen(true);
    } else {
        // Directly clear, usually after deleting the active design
        localStorage.removeItem(`${SLD_WIDGET_LOCAL_STORAGE_KEY_PREFIX}${selectedLayout}`);
        setCurrentCircuitName("");
        setOriginalLoadedCircuitName("");
        setCurrentSldCode(""); // Trigger onCodeChange from SLDWidget for new empty state
        setInitialCodeForLoadedDesign("");
        setSldWidgetRefreshKey(prev => prev + 1); // Force SLDWidget to re-read (empty) localStorage
        toast.info("Canvas cleared. Select a layout or load a design.");
        setIsClearCanvasConfirmOpen(false);
    }
  };
  
  const executeClearCanvas = () => {
    handleClearCanvas(false); // Calls the logic with no prompt
  }

  const handleConnectBackend = () => {
    setIsConnectingBackend(true);
    toast.info("Attempting to connect to backend...", {
        icon: <ServerCog className="h-4 w-4 animate-spin" />,
        id: "backend-connect-toast"
    });

    const backendWindow = window.open("/api/opcua", "_blank"); // Ensure this route exists
    
    let closeTimeout: NodeJS.Timeout;

    if (backendWindow) {
        const checkWindowClosed = setInterval(() => {
            if (backendWindow.closed) {
                clearInterval(checkWindowClosed);
                clearTimeout(closeTimeout); // Clear the auto-close timeout
                toast.dismiss("backend-connect-toast");
                toast.success("Backend connection tab closed by user.", { duration: 4000});
                setIsConnectingBackend(false);
            }
        }, 500);

        closeTimeout = setTimeout(() => {
            if (!backendWindow.closed) {
                backendWindow.close();
            }
            clearInterval(checkWindowClosed); // Clear the interval if we auto-closed it
            toast.dismiss("backend-connect-toast");
            toast.warning("Backend connection tab auto-closed after 30s.", {duration: 4000});
            setIsConnectingBackend(false);
        }, 30000); // 30 seconds
    } else {
        toast.dismiss("backend-connect-toast");
        toast.error("Failed to open backend connection tab. Pop-up blocker?", {
            icon: <Link2Off className="h-4 w-4" />
        });
        setIsConnectingBackend(false);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div 
        className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-zinc-900 dark:to-neutral-950 text-foreground transition-colors duration-500"
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
      >
        {/* Header */}
        <motion.header 
          className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg shadow-sm"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.2, duration: 0.5, ease: "easeOut" } }}
        >
          <div className="container flex h-16 items-center space-x-4 px-4 md:px-6">
            <motion.div className="flex gap-2 items-center" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
              <BrainCircuit className="h-8 w-8 text-primary drop-shadow-[0_2px_4px_rgba(var(--primary-rgb),0.4)]" />
              <h1 className="text-2xl font-bold tracking-tight">
                SLD <span className="text-primary">Studio</span>
              </h1>
            </motion.div>
            <div className="flex-grow" /> {/* Spacer */}
            <div className="flex items-center space-x-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleConnectBackend} disabled={isConnectingBackend} className="hidden md:inline-flex">
                            {isConnectingBackend ? <ServerCog className="h-5 w-5 animate-spin" /> : <ServerCog className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Connect to Backend (OPC UA)</TooltipContent>
                </Tooltip>

              <Button variant="outline" size="sm" onClick={() => setIsDesignsSheetOpen(true)} className="shadow-sm">
                <FolderKanban className="mr-2 h-4 w-4" />
                My Designs
                {savedCircuits.length > 0 && (
                  <Badge variant="secondary" className="ml-2 scale-90">{savedCircuits.length}</Badge>
                )}
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-hidden"> {/* Added overflow-hidden for animation containment */}
          <motion.div 
            className="grid gap-6 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Left Column: SLD Widget and Main Controls */}
            <motion.div className="lg:col-span-2 flex flex-col gap-6" variants={itemVariants}>
              <motion.div variants={cardEntryVariants}>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center">
                            <Palette className="mr-2 h-5 w-5 text-primary/80"/>
                            Canvas Controls
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Select template, name your masterpiece, and save.
                        </CardDescription>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleClearCanvas()}>
                                <RefreshCcw className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Clear Current Canvas</TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4 items-end pt-2">
                  <div>
                    <Label htmlFor="layout-select" className="mb-1.5 block text-sm font-medium">
                      Base Layout
                    </Label>
                    <Select value={selectedLayout} onValueChange={handleLayoutSelectChange}>
                      <SelectTrigger id="layout-select" className="w-full shadow-sm">
                        <SelectValue placeholder="Select layout..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_SLD_LAYOUT_IDS.map((id) => (
                          <SelectItem key={id} value={id}>
                            {formatLayoutIdForDisplay(id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="circuit-name" className="text-sm font-medium flex justify-between items-center">
                        Design Name
                        {isDirty && (
                            <Tooltip>
                                <TooltipTrigger asChild><AlertCircle className="h-4 w-4 text-amber-500"/></TooltipTrigger>
                                <TooltipContent>Unsaved changes</TooltipContent>
                            </Tooltip>
                        )}
                    </Label>
                    <div className="flex gap-2">
                      <Input id="circuit-name" placeholder="e.g., Primary Substation" value={currentCircuitName}
                        onChange={(e) => setCurrentCircuitName(e.target.value)}
                        className="flex-grow shadow-sm"/>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={saveCurrentCircuit}
                            disabled={!currentCircuitName.trim() || !currentSldCode.trim() || isSaving || (!isDirty && originalLoadedCircuitName === currentCircuitName)}
                            className="shrink-0 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                            {isSaving ? <Save className="mr-2 h-4 w-4 animate-pulse" /> : <Save className="mr-2 h-4 w-4" />}
                            {isSaving ? "Saving..." : (originalLoadedCircuitName === currentCircuitName && currentCircuitName !== "" && !isDirty ? "Saved" : "Save")}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{originalLoadedCircuitName === currentCircuitName && currentCircuitName !== "" && !isDirty ? "No changes to save" : "Save current design"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>

              <motion.div 
                className="h-[600px] md:h-[calc(100vh-20rem)] max-h-[750px] border rounded-xl overflow-hidden bg-card relative shadow-xl focus-within:ring-2 focus-within:ring-primary/50 transition-all duration-300" 
                variants={cardEntryVariants}
              >
                <SLDWidget
                  key={`${selectedLayout}-${sldWidgetRefreshKey}`}
                  layoutId={selectedLayout} 
                  onCodeChange={handleSldWidgetCodeChange}
                  onLayoutIdChange={handleSLDWidgetLayoutChange} 
                  isEditMode={true}
                />
              </motion.div>
            </motion.div>

            {/* Right Column: Code Output and Actions */}
            <motion.div className="lg:col-span-1 flex flex-col gap-6" variants={itemVariants}>
              <motion.div variants={cardEntryVariants} className="flex-grow flex flex-col">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex-grow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><FileJson className="mr-2 h-5 w-5 text-primary/80"/>SLD Code</CardTitle>
                  <CardDescription>JSON for the current diagram. Read-only.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col p-0">
                  <ScrollArea className="h-full flex-grow">
                    <Textarea ref={sldCodeTextAreaRef} value={currentSldCode} readOnly
                      className="font-mono text-xs flex-grow min-h-[200px] resize-none bg-muted/20 border-0 rounded-none focus:ring-0"
                      placeholder="Design your SLD on the canvas... code will appear here."/>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button onClick={copyToClipboard} disabled={!currentSldCode} variant="outline" className="w-full shadow-sm">
                    <Copy className="mr-2 h-4 w-4" />Copy Code
                  </Button>
                </CardFooter>
              </Card>
              </motion.div>

              <motion.div variants={cardEntryVariants}>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary/80"/>Studio Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                    <Button onClick={exportCircuits} variant="outline" className="w-full shadow-sm">
                        <FileDown className="mr-2 h-4 w-4" />Export All
                    </Button>
                    <Button onClick={() => importFileInputRef.current?.click()} variant="outline" className="w-full shadow-sm">
                        <FileUp className="mr-2 h-4 w-4" />Import
                    </Button>
                  <input id="import-studio-designs-file-input" ref={importFileInputRef} type="file"
                    accept=".json" onChange={handleImportCircuits} className="hidden" aria-label="Import designs"/>
                </CardContent>
                 <CardFooter className="pt-3">
                    <Button onClick={handleConnectBackend} variant="secondary" className="w-full shadow-sm" disabled={isConnectingBackend}>
                        {isConnectingBackend ? <ServerCog className="mr-2 h-4 w-4 animate-spin" /> : <ServerCog className="mr-2 h-4 w-4" />}
                        {isConnectingBackend ? "Connecting..." : "Connect Backend"}
                    </Button>
                </CardFooter>
              </Card>
              </motion.div>
              
              <motion.div variants={cardEntryVariants} className="p-4 border rounded-lg bg-blue-50 dark:bg-sky-900/20 text-sm shadow-md text-blue-700 dark:text-sky-300">
                <div className="flex items-start gap-3">
                  <Info className="h-6 w-6 shrink-0 mt-0.5 text-blue-500 dark:text-sky-400" />
                  <div>
                    <h3 className="font-semibold">Quick Guide</h3>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-xs opacity-90">
                      <li>Use <strong>Base Layouts</strong> as diagram templates.</li>
                      <li>Name & <strong>Save</strong> to create a distinct <strong>Design</strong>.</li>
                      <li>Access all saved designs via <strong>My Designs</strong>.</li>
                      <li>SLD canvas auto-saves for the current template.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </main>

        {/* Designs Sheet */}
        <Sheet open={isDesignsSheetOpen} onOpenChange={setIsDesignsSheetOpen}>
          <SheetContent className="sm:max-w-md w-full flex flex-col bg-card p-0">
            <SheetHeader className="px-6 pt-6 pb-4">
              <SheetTitle className="text-xl flex items-center"><FolderKanban className="mr-3 h-6 w-6 text-primary"/>My Designs</SheetTitle>
              <SheetDescription>Load, manage, or delete your saved SLDs.</SheetDescription>
            </SheetHeader>
            <Separator />
            {savedCircuits.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <CloudFog className="h-20 w-20 text-muted-foreground/50 mb-6" />
                <p className="text-lg font-medium text-muted-foreground">No designs yet.</p>
                <p className="text-sm text-muted-foreground/80">Your saved designs will appear here.</p>
                <Button variant="link" className="mt-4 text-primary" onClick={() => setIsDesignsSheetOpen(false)}>Start Designing</Button>
              </div>
            ) : (
              <ScrollArea className="flex-grow px-4 py-4">
                <AnimatePresence>
                <motion.div className="space-y-3" initial="hidden" animate="visible" variants={{visible: {transition: {staggerChildren: 0.07}}}}>
                  {savedCircuits.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
                    .map((circuit, idx) => (
                      <motion.div key={circuit.name} variants={itemVariants} custom={idx} layout
                        className={`p-3 border rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer
                                  ${circuit.name === currentCircuitName ? "bg-primary/10 border-primary/50 ring-2 ring-primary/30" : "bg-background hover:bg-muted/50"}`}
                        onClick={() => loadSavedCircuit(circuit.name)}
                      >
                        <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-semibold ${circuit.name === currentCircuitName ? "text-primary" : "text-foreground"}`}>
                                {circuit.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Base: {formatLayoutIdForDisplay(circuit.layoutId)}
                              </p>
                            </div>
                            <motion.div className="flex gap-1" whileHover="hover">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <motion.div variants={{hover: {scale:1.15}}} transition={{type:"spring", stiffness:400, damping:10}}>
                                        <Button variant="ghost" size="icon" 
                                        onClick={(e) => { e.stopPropagation(); loadSavedCircuit(circuit.name); }}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary">
                                            <DownloadCloud className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Load this design</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <motion.div variants={{hover: {scale:1.15}}} transition={{type:"spring", stiffness:400, damping:10}}>
                                        <Button variant="ghost" size="icon"
                                        onClick={(e) => { e.stopPropagation(); confirmDeleteCircuit(circuit.name); }}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Delete this design</TooltipContent>
                                </Tooltip>
                            </motion.div>
                        </div>
                         <p className="text-xs text-muted-foreground/70 mt-1.5">
                            Saved: {new Date(circuit.lastModified).toLocaleDateString()} {new Date(circuit.lastModified).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                         </p>
                      </motion.div>
                    ))}
                </motion.div>
                </AnimatePresence>
              </ScrollArea>
            )}
            <Separator />
            <SheetFooter className="px-6 py-4 grid grid-cols-2 gap-3">
                <Button onClick={exportCircuits} variant="outline" className="shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Export All
                </Button>
                <Button onClick={() => importFileInputRef.current?.click()} variant="outline" className="shadow-sm">
                    <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* All AlertDialogs as before, no change needed for them structurally */}
        <AlertDialog open={isLayoutMismatchDialogOpen} onOpenChange={setIsLayoutMismatchDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Layout Mismatch</AlertDialogTitle>
              <AlertDialogDescription>
                Canvas is for "{formatLayoutIdForDisplay(actualLayoutIdFromWidget)}", but base is "{formatLayoutIdForDisplay(selectedLayout)}".
                Save under "{formatLayoutIdForDisplay(selectedLayout)}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => proceedWithSave(selectedLayout)}>Save with "{formatLayoutIdForDisplay(selectedLayout)}"</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isOverwriteDialogOpen} onOpenChange={setIsOverwriteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Overwrite Design?</AlertDialogTitle>
              <AlertDialogDescription>Design "{circuitToOverwrite?.name}" already exists. Overwrite it?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCircuitToOverwrite(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (circuitToOverwrite) proceedWithSave(circuitToOverwrite.layoutId, true); setCircuitToOverwrite(null); }}>Overwrite</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>Delete "{circuitToDelete}"? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCircuitToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeDeleteCircuit} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isSwitchLayoutDialogOpen} onOpenChange={setIsSwitchLayoutDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Switch Base Layout?</AlertDialogTitle>
                  <AlertDialogDescription>Unsaved changes to the current design may be lost. Switch to "{targetLayoutForSwitch ? formatLayoutIdForDisplay(targetLayoutForSwitch) : ''}"?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTargetLayoutForSwitch(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeSwitchLayout}>Switch Layout</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isWidgetLayoutSwitchDialogOpen} onOpenChange={setIsWidgetLayoutSwitchDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Sync Layout with Widget?</AlertDialogTitle>
                  <AlertDialogDescription>SLD Widget's layout changed to "{layoutFromWidgetSwitch ? formatLayoutIdForDisplay(layoutFromWidgetSwitch) : ''}". Update Studio to match?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setLayoutFromWidgetSwitch(null)}>Keep Studio Layout</AlertDialogCancel>
                <AlertDialogAction onClick={executeWidgetLayoutSwitch}>Update Studio Layout</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={isClearCanvasConfirmOpen} onOpenChange={setIsClearCanvasConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will remove all elements from the current canvas for the "{formatLayoutIdForDisplay(selectedLayout)}" layout.
                      This action does not delete any saved designs. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeClearCanvas} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Clear Canvas</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </motion.div>
    </TooltipProvider>
  );
}