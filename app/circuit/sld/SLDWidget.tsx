// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, ComponentType } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node, Edge, Connection, addEdge,
  NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges,
  SelectionMode, PanOnScrollMode, isNode, isEdge,
  Controls, MiniMap, Background, NodeTypes, EdgeTypes, ReactFlowInstance,
  FitViewOptions,
  Panel,
  BackgroundVariant,
  ReactFlowJsonObject, 
  NodeProps,
  Viewport, 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import { AlertTriangle, Check, Download, LayoutList, ListChecks, Loader2, RotateCcw, X, Upload, Zap } from 'lucide-react'; 
import { motion } from 'framer-motion';

import { Textarea } from "@/components/ui/textarea"; 
import {
  SLDLayout, CustomNodeType, CustomFlowEdge, CustomNodeData,
  SLDElementType, CustomFlowEdgeData, TextLabelNodeData, DataPoint, 
  AnimationFlowConfig, // This is the base type from types/sld.ts
  GlobalSLDAnimationSettings,
} from '@/types/sld';
import {
  getThemeAwareColors, getNodeColor as getMiniMapNodeColor,
  getNodeStrokeColor as getMiniMapNodeStrokeColor, ThemeAwarePalette,
} from './ui/sldThemeUtils';
import { useWebSocket, WebSocketMessageToServer } from '@/hooks/useWebSocketListener';
import { useAppStore, useSelectedElementForDetails } from '@/stores/appStore';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { sldLayouts as constantSldLayouts } from '@/config/sldLayouts';
import { dataPoints as appDataPoints } from '@/config/dataPoints';

import DataLabelNode from './nodes/DataLabelNode';
import TextLabelNode from './nodes/TextLabelNode';
import InverterNode from './nodes/InverterNode';
import PanelNode from './nodes/PanelNode';
import BreakerNode from './nodes/BreakerNode'; 
import MeterNode from './nodes/MeterNode';
import BatteryNode from './nodes/BatteryNode';
import ContactorNode from './nodes/ContactorNode';
import GridNode from './nodes/GridNode';
import LoadNode from './nodes/LoadNode';
import BusbarNode from './nodes/BusbarNode';
import GenericDeviceNode from './nodes/GenericDeviceNode';
import TransformerNode from './nodes/TransformerNode';
import GeneratorNode from './nodes/GeneratorNode';
import PLCNode from './nodes/PLCNode';
import SensorNode from './nodes/SensorNode';
import FuseNode from './nodes/FuseNode';
import GaugeNode from './nodes/GaugeNode';


import AnimatedFlowEdge from './edges/AnimatedFlowEdge';
import SLDElementPalette from './ui/SLDElementPalette';
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementControlPopup from './ui/SLDElementControlPopup';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';
import SwitchNode from './nodes/SwitchNode';
import AnimationFlowConfiguratorDialog, { 
  AnimationFlowConfiguratorMode, 
  DialogAnimationFlowConfig, 
  DialogGlobalAnimationSettings 
} from './ui/AnimationFlowConfiguratorDialog';


interface WebSocketMessageFromServer {
  type: string;
  payload: { key?: string; layout?: SLDLayout; error?: string; };
}

const nodeTypes: NodeTypes = {
    [SLDElementType.DataLabel]: DataLabelNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.TextLabel]: TextLabelNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Inverter]: InverterNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Panel]: PanelNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Breaker]: BreakerNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Fuse]: FuseNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Meter]: MeterNode as unknown as ComponentType<NodeProps>,    
    [SLDElementType.Battery]: BatteryNode as unknown as ComponentType<NodeProps>, 
    [SLDElementType.Contactor]: ContactorNode as unknown as ComponentType<NodeProps>, 
    [SLDElementType.Grid]: GridNode as unknown as ComponentType<NodeProps>,       
    [SLDElementType.Load]: LoadNode as unknown as ComponentType<NodeProps>,       
    [SLDElementType.Busbar]: BusbarNode as unknown as ComponentType<NodeProps>,   
    [SLDElementType.GenericDevice]: GenericDeviceNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Transformer]: TransformerNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Generator]: GeneratorNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.PLC]: PLCNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Sensor]: SensorNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Gauge]: GaugeNode as unknown as ComponentType<NodeProps>, 
    [SLDElementType.Switch]: SwitchNode as unknown as ComponentType<NodeProps>, 
};
const edgeTypes: EdgeTypes = { animatedFlow: AnimatedFlowEdge };
const defaultEdgeOptions = { type: 'animatedFlow', style: { strokeWidth: 3 }, data: {} as CustomFlowEdgeData };
const fitViewOptions: FitViewOptions = { padding: 0.25, duration: 400, includeHiddenNodes: false };
const PLACEHOLDER_NODE_ID = 'sld-placeholder-node';
const LOCAL_STORAGE_KEY_PREFIX = 'sldLayout_';


const placeholderTextColorGetter = (theme: string | undefined): string => {
    return theme === 'dark' ? '#aaaaaa' : '#666666'; 
};

const createPlaceholderNode = (layoutName: string, currentThemeArg?: string): CustomNodeType => ({
  id: PLACEHOLDER_NODE_ID,
  type: SLDElementType.TextLabel,
  position: { x: 300, y: 180 }, 
  data: {
    label: `Layout: ${layoutName.replace(/_/g, ' ')} (Placeholder)`,
    text: `Layout: ${layoutName.replace(/_/g, ' ')}\n\n${ layoutName.toLowerCase().includes("empty") || layoutName.toLowerCase().includes("new") ? "This is an empty canvas." : "Drag elements from the palette or use 'Clear Canvas' to start designing."}`,
    elementType: SLDElementType.TextLabel,
    styleConfig: { 
      fontSize: '16px',
      color: placeholderTextColorGetter(currentThemeArg),
      textAlign: 'center',
      backgroundColor: 'transparent',
    },
  } as TextLabelNodeData,
  draggable: false, selectable: false, zIndex: -1000,
});


interface SLDWidgetCoreProps extends SLDWidgetProps {
  onLayoutIdChangeProp?: (newLayoutId: string) => void;
  onCodeChange?: (code: string, layoutId: string) => void;
}

const SLDWidgetCore: React.FC<SLDWidgetCoreProps> = ({
  layoutId,
  isEditMode: isEditModeFromProps,
  onLayoutIdChangeProp,
  onCodeChange,
}) => {
  const { theme: currentThemeHookValue } = useTheme();
  const { sendJsonMessage, lastJsonMessage, isConnected: isWebSocketConnected, connect: connectWebSocket } = useWebSocket();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CustomNodeType[]>([]);
  const [edges, setEdges] = useState<CustomFlowEdge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedElement, setSelectedElement] = useState<CustomNodeType | CustomFlowEdge | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownLayoutId, setDrillDownLayoutId] = useState<string | null>(null);
  const [drillDownParentLabel, setDrillDownParentLabel] = useState<string | undefined>(undefined);
  const [isInspectorDialogOpen, setIsInspectorDialogOpen] = useState(false);
  const [isControlPopupOpen, setIsControlPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [currentLayoutIdKey, setCurrentLayoutIdKey] = useState<string>('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importJsonString, setImportJsonString] = useState('');
  
  // State for new AnimationFlowConfiguratorDialog
  const [animationConfiguratorTarget, setAnimationConfiguratorTarget] = useState<{
    mode: AnimationFlowConfiguratorMode,
    edge?: CustomFlowEdge | null // For single edge mode
  } | null>(null);
  // No longer need isBulkAnimationConfiguratorOpen; use animationConfiguratorTarget.mode
  // const [selectedEdgesForBulkConfig, setSelectedEdgesForBulkConfig] = useState<CustomFlowEdge[]>([]); // Replaced by direct use of selectedEdges
  
  const [activeGlobalAnimationSettings, setActiveGlobalAnimationSettings] = 
    useState<GlobalSLDAnimationSettings | undefined>(undefined); // From types/sld.ts
  
  const currentLayoutLoadedFromServerOrInitialized = useRef(false);
  const canEdit = useMemo(() => !!isEditModeFromProps, [isEditModeFromProps]);
  const initialFitViewDone = useRef(false);
  const storeSelectedElement = useSelectedElementForDetails();
  const { setSelectedElementForDetails } = useAppStore.getState();

  const selectedEdgesFromReactFlow = useMemo(() => edges.filter(edge => edge.selected), [edges]);


  const removePlaceholderIfNeeded = useCallback((currentNodes: CustomNodeType[]) => {
    const hasPlaceholder = currentNodes.some(n => n.id === PLACEHOLDER_NODE_ID);
    const hasOtherNodes = currentNodes.some(n => n.id !== PLACEHOLDER_NODE_ID);
    if (hasPlaceholder && hasOtherNodes) {
      return currentNodes.filter(n => n.id !== PLACEHOLDER_NODE_ID);
    }
    return currentNodes;
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!canEdit) return;
    setNodes((nds) => {
      const changedNds = applyNodeChanges(changes, nds);
      return removePlaceholderIfNeeded(changedNds);
    });
    if (changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) {
        setIsDirty(true);
    }
  }, [canEdit, removePlaceholderIfNeeded]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (!canEdit) return;
    setEdges((eds) => applyEdgeChanges(changes, eds));
    if (changes.some(c => c.type === 'add')) {
        setNodes(prevNodes => removePlaceholderIfNeeded(prevNodes));
    }
    if (changes.some(c => c.type !== 'select')) {
        setIsDirty(true);
    }
  }, [canEdit, removePlaceholderIfNeeded]);

  const onConnect = useCallback((connection: Connection) => {
    if (!canEdit) return;
    const newEdge = { ...connection, ...defaultEdgeOptions };
    setEdges((eds) => addEdge(newEdge, eds));
    setNodes(prevNodes => removePlaceholderIfNeeded(prevNodes));
    setIsDirty(true);
  }, [canEdit, removePlaceholderIfNeeded]);
  
  const onNodeDragStop = useCallback(() => { 
    if (canEdit) setIsDirty(true); 
  }, [canEdit]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault(); 
    if (!canEdit || !reactFlowInstance || !reactFlowWrapper.current) return;
    const typeString = event.dataTransfer.getData('application/reactflow-palette-item');
    const type = typeString as SLDElementType | undefined; 

    if (!type || !Object.values(SLDElementType).includes(type)) {
        console.error("SLDWidget onDrop: Invalid SLDElementType from dataTransfer:", typeString);
        toast.error("Drop Error", { description: `Invalid element type: ${typeString || 'None'}`});
        return;
    }
    if (!nodeTypes[type]) {
        console.error(`SLDWidget onDrop: Node type "${type}" not in 'nodeTypes'.`);
        toast.error("Drop Error", { description: `Node type "${type}" not configured.`});
        return;
    }
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
    const componentDataStr = event.dataTransfer.getData('application/reactflow-palette-data');
    const componentData = componentDataStr ? JSON.parse(componentDataStr) : {};
    const newNodeId = `${type}_${+new Date()}_${Math.random().toString(36).substring(2, 6)}`;
    const baseNewNodeData: CustomNodeData = {
        label: componentData.label || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        elementType: type, status: 'nominal', ...componentData };
    if (type === SLDElementType.TextLabel) {
        (baseNewNodeData as TextLabelNodeData).text = (componentData as TextLabelNodeData).text || `New ${type}`;
        (baseNewNodeData as TextLabelNodeData).styleConfig = (componentData as TextLabelNodeData).styleConfig || { fontSize: '12px', color: '#333' };
    }
    const newNode: CustomNodeType = { id: newNodeId, type, position, data: baseNewNodeData };
    setNodes((nds) => removePlaceholderIfNeeded(nds).concat(newNode));
    setIsDirty(true);
    initialFitViewDone.current = false;
  }, [canEdit, reactFlowInstance, removePlaceholderIfNeeded]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = canEdit ? 'move' : 'none';
  }, [canEdit]);
  
  const handleElementClick = useCallback(
    (event: React.MouseEvent, element: Node | Edge) => {
      event.stopPropagation();
      setSelectedElement(element as CustomNodeType | CustomFlowEdge);

      if (canEdit) {
        setIsInspectorDialogOpen(true);
      } else {
        setIsControlPopupOpen(true);
        if (isNode(element) && (element.data as CustomNodeData).isDrillable && (element.data as CustomNodeData).subLayoutId) {
          const nodeData = element.data as CustomNodeData;
          setDrillDownLayoutId(nodeData.subLayoutId!);
          setDrillDownParentLabel(nodeData.label);
          setIsDrillDownOpen(true);
        }
      }
    }, [canEdit]
  );

  const onPaneClick = useCallback(() => {
    setSelectedElement(null); 
    setIsInspectorDialogOpen(false); 
    setIsControlPopupOpen(false);
  }, []);

  const handleUpdateElement = useCallback((updatedElement: CustomNodeType | CustomFlowEdge) => {
    if (!canEdit) return;
    if (isNode(updatedElement)) setNodes(nds => nds.map(n => n.id === updatedElement.id ? updatedElement as CustomNodeType : n));
    else if (isEdge(updatedElement)) setEdges(eds => eds.map(e => e.id === updatedElement.id ? updatedElement as CustomFlowEdge : e));
    setIsDirty(true);
  }, [canEdit]);

  const handleDeleteElement = useCallback((elementId: string): void => {
    if (!canEdit) return;
    setNodes((nds) => nds.filter((node) => node.id !== elementId));
    setEdges((eds) => eds.filter((edge) => edge.id !== elementId && edge.source !== elementId && edge.target !== elementId));
    setIsDirty(true); setSelectedElement(null); setIsInspectorDialogOpen(false); 
    initialFitViewDone.current = false;
  }, [canEdit]);

  const handleInternalLayoutSelect = useCallback((newLayoutId: string) => {
    if (newLayoutId !== layoutId && onLayoutIdChangeProp) {
      if (isDirty) toast("Unsaved Changes", { 
          description: "Discard unsaved changes to switch layouts?", 
          action: { label: "Discard & Switch", onClick: () => { setIsDirty(false); onLayoutIdChangeProp(newLayoutId); }}, 
          cancel: { label: "Stay", onClick: () => {} }, duration: Infinity });
      else onLayoutIdChangeProp(newLayoutId);
    }
  }, [layoutId, onLayoutIdChangeProp, isDirty]);

  const handleResetLayout = useCallback(() => {
    if (!canEdit || !layoutId) return;
    setNodes([createPlaceholderNode(layoutId, currentThemeHookValue)]);
    setEdges([]); setIsDirty(true); 
    setActiveGlobalAnimationSettings(undefined); // Also reset global animation settings for this layout
    toast.success("Layout Cleared", { description: "Canvas reset. Save to persist." });
    initialFitViewDone.current = false;
  }, [canEdit, layoutId, currentThemeHookValue]);
  
  const persistLayout = useCallback((nodesToSave: CustomNodeType[], edgesToSave: CustomFlowEdge[], rfInstance: ReactFlowInstance | null, currentLayoutId: string, manualSave: boolean) => {
    if (!canEdit || !currentLayoutId) return false;
    const layoutKey = `${LOCAL_STORAGE_KEY_PREFIX}${currentLayoutId}`;
    const nodesForStorage = nodesToSave.filter(n => n.id !== PLACEHOLDER_NODE_ID);
    const viewport = rfInstance ? rfInstance.getViewport() : undefined;
    
    let currentMeta: SLDLayout['meta'] = {}; // Default to empty meta
    // Attempt to load existing meta to preserve fields not managed here (e.g., version, author)
    try {
        const existingLayoutString = localStorage.getItem(layoutKey);
        if (existingLayoutString) {
            const parsedExisting = JSON.parse(existingLayoutString) as SLDLayout;
            currentMeta = parsedExisting.meta || {}; // Use existing meta if available
        }
    } catch (e) {
        console.warn(`Error parsing existing layout meta from localStorage for key ${layoutKey}:`, e);
    }

    const layoutToPersist: SLDLayout = { 
        layoutId: currentLayoutId, 
        nodes: nodesForStorage.map(n => ({ ...n, data: { ...n.data } })), // Deep copy data
        edges: edgesToSave.map(e => ({ ...e, data: { ...e.data } })),     // Deep copy data
        viewport,
        meta: { 
            ...currentMeta, // Preserve other existing meta fields
            globalAnimationSettings: activeGlobalAnimationSettings // Overwrite/set with current global settings
        },
    };
    const layoutJsonString = JSON.stringify(layoutToPersist);

    try {
        localStorage.setItem(layoutKey, layoutJsonString);
        if (manualSave) toast.success("Layout Saved Locally");
    } catch (error) {
        console.error(`PersistLayout: Error saving to LS:`, error);
        if (manualSave) toast.error("Local Save Failed");
    }

    if (onCodeChange) {
        onCodeChange(layoutJsonString, currentLayoutId);
    }

    if (isWebSocketConnected && sendJsonMessage) {
        sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${currentLayoutId}`, layout: layoutToPersist } });
        if (manualSave) toast.info("Syncing to Server...", { id: `save-pending-${currentLayoutId}` });
        return true; 
    } else {
        if (manualSave && isWebSocketConnected === false) toast.warning("Offline: Server Sync Skipped");
        return true; 
    }
  }, [canEdit, isWebSocketConnected, sendJsonMessage, onCodeChange, activeGlobalAnimationSettings]); 

  const debouncedAutoSave = useMemo(
      () => throttle((currentNodes, currentEdges, rfInst, layoutID) => {
        if (!layoutID) return;
        const hasRealContent = currentNodes.some((n: CustomNodeType) => n.id !== PLACEHOLDER_NODE_ID) || currentEdges.length > 0;
        if (isDirty || (hasRealContent && !currentLayoutLoadedFromServerOrInitialized.current) ) { 
             persistLayout(currentNodes, currentEdges, rfInst, layoutID, false);
        }
      }, 5000, { leading: false, trailing: true }),
      [persistLayout, isDirty] 
  );

  const handleManualSaveLayout = useCallback(() => {
      if (!canEdit || !layoutId) return;
      const hasContentOrIsDirtyPlaceholder = nodes.filter(n => n.id !== PLACEHOLDER_NODE_ID).length > 0 || 
                                           edges.length > 0 || 
                                           (nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID && isDirty);

      if (!isDirty && !hasContentOrIsDirtyPlaceholder && currentLayoutLoadedFromServerOrInitialized.current) {
          toast.info("No Changes to Save"); 
          return;
      }
      persistLayout(nodes, edges, reactFlowInstance, layoutId, true);
  }, [nodes, edges, reactFlowInstance, layoutId, canEdit, isDirty, persistLayout]);


  const handleImportLayout = useCallback(() => {
    if (!canEdit || !layoutId || !reactFlowInstance) {
      toast.error("Import cannot be performed at this time.");
      return;
    }

    try {
      const parsedLayout = JSON.parse(importJsonString) as SLDLayout;

      if (!parsedLayout || typeof parsedLayout !== 'object') {
        toast.error("Invalid JSON format.", { description: "The input is not a valid JSON object." });
        return;
      }
      if (typeof parsedLayout.layoutId !== 'string' || !Array.isArray(parsedLayout.nodes) || !Array.isArray(parsedLayout.edges)) {
        toast.error("Invalid SLDLayout Structure.", { description: "Missing required 'layoutId', 'nodes', or 'edges'." });
        return;
      }
      
      const isValidNodes = parsedLayout.nodes.every(n => 
        typeof n.id === 'string' && 
        typeof n.position === 'object' && n.position !== null && 
        typeof n.data === 'object' && n.data !== null &&
        typeof n.type === 'string' 
      );
      const isValidEdges = parsedLayout.edges.every(e =>
        typeof e.id === 'string' &&
        typeof e.source === 'string' &&
        typeof e.target === 'string' &&
        (typeof e.type === 'string' || e.type === undefined) // type is optional for edges, defaults elsewhere
      );

      if (!isValidNodes) {
        toast.error("Invalid Node Structure.", { description: "Nodes missing id, position, data, or type." });
        return;
      }
      if (!isValidEdges) {
        toast.error("Invalid Edge Structure.", { description: "Edges missing id, source, or target." });
        return;
      }
      
      if (parsedLayout.layoutId !== layoutId) {
        toast.info("Importing Content to Current Layout", {
          description: `Content from '${parsedLayout.layoutId.replace(/_/g, ' ')}' imported into '${layoutId.replace(/_/g, ' ')}'. Original layout ID ignored for saving.`,
          duration: 8000,
        });
      }
      
      const validatedNodes = parsedLayout.nodes.map(n => ({ 
          ...n, 
          selected: false, 
          type: n.type || n.data?.elementType || SLDElementType.TextLabel, 
      }));

      setNodes(removePlaceholderIfNeeded(validatedNodes));
      setEdges(parsedLayout.edges.map(e => ({ ...e, type: e.type || defaultEdgeOptions.type })) || []); 
      setActiveGlobalAnimationSettings(parsedLayout.meta?.globalAnimationSettings || undefined);


      if (parsedLayout.viewport && reactFlowInstance) {
        reactFlowInstance.setViewport(parsedLayout.viewport, { duration: fitViewOptions.duration });
      } else if (reactFlowInstance) {
        reactFlowInstance.fitView(fitViewOptions);
      }
      initialFitViewDone.current = true; 

      persistLayout(validatedNodes, parsedLayout.edges || [], reactFlowInstance, layoutId, true);
      setIsDirty(false);

      toast.success("Layout Imported Successfully", { description: `Content imported into layout '${layoutId.replace(/_/g, ' ')}'.` });
      setIsImportDialogOpen(false);
      setImportJsonString('');

    } catch (error: any) {
      console.error("Error importing SLD layout:", error);
      toast.error("Import Failed", { description: error.message || "Could not parse or apply JSON." });
    }
  }, [canEdit, layoutId, reactFlowInstance, importJsonString, persistLayout, removePlaceholderIfNeeded, fitViewOptions.duration]);


  const handleExportAllLayouts = useCallback(() => {
    if (!canEdit) {
      toast.error("Export is only available in edit mode.");
      return;
    }
    const allLayoutsData: { [key: string]: SLDLayout } = {};
    let layoutsFound = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        const layoutIdFromKey = key.substring(LOCAL_STORAGE_KEY_PREFIX.length);
        const layoutJSON = localStorage.getItem(key);
        if (layoutJSON) {
          try {
            const layoutData = JSON.parse(layoutJSON) as SLDLayout;
            if (layoutData && layoutData.layoutId === layoutIdFromKey && Array.isArray(layoutData.nodes)) {
              allLayoutsData[layoutIdFromKey] = layoutData;
              layoutsFound++;
            } else {
              console.warn(`SLDWidget: Invalid LS item ${key}.`);
            }
          } catch (e) { console.error(`SLDWidget: Error parsing LS item ${key}:`, e); }
        }
      }
    }
    if (layoutsFound === 0) {
      toast.info("No SLD layouts found in local storage to export.");
      return;
    }
    try {
      const dataStr = JSON.stringify(allLayoutsData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `all_sld_layouts_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(linkElement); 
      linkElement.click();
      document.body.removeChild(linkElement);
      toast.success(`${layoutsFound} SLD layout(s) exported successfully.`);
    } catch (error) {
      console.error("SLDWidget: Error during export:", error);
      toast.error("Failed to export layouts.");
    }
  }, [canEdit]);


  useEffect(() => {
    if (layoutId) {
      const newKey = `sld_${layoutId}`; 
      if (newKey !== currentLayoutIdKey) {
        setCurrentLayoutIdKey(newKey);
        currentLayoutLoadedFromServerOrInitialized.current = false; 
        initialFitViewDone.current = false;
        setNodes([]); setEdges([]); setIsDirty(false); setIsLoading(true);
        setActiveGlobalAnimationSettings(undefined); // Reset for new layout
        setSelectedElement(null); setIsInspectorDialogOpen(false); setIsControlPopupOpen(false);
      }
    } else { 
      setCurrentLayoutIdKey(''); setNodes([]); setEdges([]); setIsLoading(false); 
      currentLayoutLoadedFromServerOrInitialized.current = false; initialFitViewDone.current = false;
      setIsDirty(false); setActiveGlobalAnimationSettings(undefined);
      setSelectedElement(null); setIsInspectorDialogOpen(false); setIsControlPopupOpen(false);
    }
  }, [layoutId]);

  useEffect(() => {
    if (!layoutId || currentLayoutLoadedFromServerOrInitialized.current) {
      if (currentLayoutLoadedFromServerOrInitialized.current && !initialFitViewDone.current && reactFlowInstance && nodes.length > 0) {
           setTimeout(() => { 
                reactFlowInstance.fitView(fitViewOptions);
                initialFitViewDone.current = true;
            }, 100);
      }
      if (currentLayoutLoadedFromServerOrInitialized.current) setIsLoading(false);
      return;
    }
    
    let loadedLayout: SLDLayout | null = null; let loadedFrom: string | null = null;

    // Try constant layouts first
    if (constantSldLayouts[layoutId]) {
        loadedLayout = JSON.parse(JSON.stringify(constantSldLayouts[layoutId])); 
        loadedFrom = "constant definition";
    }
    
    // Override with localStorage if an edited version exists
    const localData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`);
    if (localData) {
        try {
            const localLayoutParsed = JSON.parse(localData) as SLDLayout;
            if (localLayoutParsed && localLayoutParsed.layoutId === layoutId && Array.isArray(localLayoutParsed.nodes)) {
                loadedLayout = localLayoutParsed; // Prioritize LS version
                loadedFrom = "LocalStorage (override)";
            } else { 
                console.warn(`SLDWidget: Invalid layout data in LS for ${layoutId}. Clearing.`);
                localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`); 
            }
        } catch (e) { 
            console.error(`SLDWidget: Error parsing LS for ${layoutId}. Clearing.`, e);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`); 
        }
    }

    if (loadedLayout) { // No need for loadedFrom check here
      console.log(`SLDWidget: Layout "${layoutId}" loaded from ${loadedFrom || 'unknown source'}.`);
      setNodes((loadedLayout.nodes || []).map(n => ({...n, selected: false})));
      setEdges(loadedLayout.edges || []);
      setActiveGlobalAnimationSettings(loadedLayout.meta?.globalAnimationSettings || undefined);
      setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true; setIsDirty(false);
      initialFitViewDone.current = false;
      if (onCodeChange) {
          onCodeChange(JSON.stringify(loadedLayout), layoutId);
      }
      return;
    }

    if (isWebSocketConnected && currentLayoutIdKey) {
        setIsLoading(true); sendJsonMessage({ type: 'get-layout', payload: { key: currentLayoutIdKey } });
    } else if (isEditModeFromProps) {
        const placeholderNodes = [createPlaceholderNode(layoutId, currentThemeHookValue)];
        setNodes(placeholderNodes); setEdges([]);
        setActiveGlobalAnimationSettings(undefined);
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true; setIsDirty(false);
        initialFitViewDone.current = false; 
        if (onCodeChange) { 
            onCodeChange(JSON.stringify({ layoutId, nodes: [], edges: [], viewport: undefined, meta: { globalAnimationSettings: undefined } }), layoutId);
        }
    } else { 
        setNodes([createPlaceholderNode(layoutId + " (Connecting...)", currentThemeHookValue)]); setEdges([]);
        setActiveGlobalAnimationSettings(undefined); 
        setIsLoading(true); 
    }
  }, [layoutId, currentLayoutIdKey, isEditModeFromProps, isWebSocketConnected, sendJsonMessage, currentThemeHookValue, reactFlowInstance, onCodeChange]);


  useLayoutEffect(() => {
    if (reactFlowInstance && !isLoading && currentLayoutLoadedFromServerOrInitialized.current && !initialFitViewDone.current && (nodes.length > 0 || edges.length > 0)) {
        let viewportToSet: Viewport | undefined = undefined;
        const localData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId!}`);
        if (localData) {
            try { 
                const parsed = JSON.parse(localData) as SLDLayout;
                viewportToSet = parsed.viewport;
            } catch (e) { /* ignore */ }
        }
        if (!viewportToSet && layoutId && constantSldLayouts[layoutId!]?.viewport) {
            viewportToSet = constantSldLayouts[layoutId!]!.viewport;
        }
        
        if (viewportToSet) {
            console.log(`SLDWidget useLayoutEffect: Setting viewport for "${layoutId}" from loaded config.`);
            reactFlowInstance.setViewport(viewportToSet, { duration: fitViewOptions.duration });
        } else if (nodes.length > 0 && nodes[0].id !== PLACEHOLDER_NODE_ID) {
            console.log(`SLDWidget useLayoutEffect: Calling fitView for "${layoutId}". Nodes: ${nodes.length}`);
            reactFlowInstance.fitView(fitViewOptions);
        } else if (nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID) {
             const defaultViewport = { x: (reactFlowWrapper.current?.clientWidth || 800)/2 - nodes[0].position.x - (nodes[0].width || 200)/2 , y: 100, zoom: 1 };
             reactFlowInstance.setViewport(defaultViewport, { duration: fitViewOptions.duration });
             console.log(`SLDWidget useLayoutEffect: Centered placeholder for "${layoutId}".`);
        }
        initialFitViewDone.current = true;
    }
  }, [nodes, edges, reactFlowInstance, isLoading, layoutId, fitViewOptions]);

  useEffect(() => {
    if (!lastJsonMessage || !currentLayoutIdKey) return;
    const message = lastJsonMessage as WebSocketMessageFromServer;
    if (message.payload?.key && message.payload.key !== currentLayoutIdKey && (message.type === 'layout-data' || message.type === 'layout-error')) return;
    const localLayoutId = layoutId; 
    switch (message.type) {
      case 'layout-data':
        const serverLayout = message.payload.layout as SLDLayout | null;
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true;
        initialFitViewDone.current = false;
        if (serverLayout && serverLayout.nodes) {
            const validatedNodes = serverLayout.nodes.map(n => ({ ...n, type: n.type || n.data?.elementType || SLDElementType.TextLabel, position: n.position || { x: 0, y: 0 }, selected: false }));
            setNodes(removePlaceholderIfNeeded(validatedNodes));
            setEdges(serverLayout.edges || []);
            setActiveGlobalAnimationSettings(serverLayout.meta?.globalAnimationSettings || undefined);
            if (serverLayout.nodes.length === 0 && localLayoutId) setNodes(isEditModeFromProps ? [createPlaceholderNode(localLayoutId, currentThemeHookValue)] : []);
            
            const serverLayoutString = JSON.stringify(serverLayout);
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${serverLayout.layoutId}`, serverLayoutString);
            if (onCodeChange) onCodeChange(serverLayoutString, serverLayout.layoutId);

        } else { 
            const emptyLayoutNodes = isEditModeFromProps && localLayoutId ? [createPlaceholderNode(localLayoutId, currentThemeHookValue)] : (localLayoutId ? [createPlaceholderNode(localLayoutId + " (Not Found)", currentThemeHookValue)] : []);
            setNodes(emptyLayoutNodes);
            setEdges([]);
            setActiveGlobalAnimationSettings(undefined);
            if (onCodeChange && localLayoutId) {
                onCodeChange(JSON.stringify({layoutId: localLayoutId, nodes: [], edges:[], viewport: undefined, meta: {globalAnimationSettings: undefined} }), localLayoutId);
            }
        }
        setIsDirty(false); break;
      case 'layout-error':
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true;
        initialFitViewDone.current = false;
        if (localLayoutId) setNodes([createPlaceholderNode(localLayoutId + " (Error)", currentThemeHookValue)]);
        else setNodes([]); 
        setEdges([]);
        setActiveGlobalAnimationSettings(undefined);
        toast.error("Server Load Error", { description: message.payload.error || "Failed." });
        if (onCodeChange && localLayoutId) {
            onCodeChange(JSON.stringify({layoutId: localLayoutId, nodes: [], edges:[], viewport: undefined, meta: {globalAnimationSettings: undefined} }), localLayoutId);
        }
        break;
      case 'layout-saved-confirmation': 
        if (message.payload?.key === currentLayoutIdKey) { 
            toast.success("Synced to Server!", { id: `save-confirm-${currentLayoutIdKey}`}); 
            setIsDirty(false); 
        } break;
      case 'layout-save-error': 
        if (message.payload?.key === currentLayoutIdKey) { 
            toast.error("Server Sync Failed", { id: `save-error-${currentLayoutIdKey}`, description: message.payload.error || "Unknown." }); 
        } break;
      default: break; 
    }
  }, [lastJsonMessage, currentLayoutIdKey, isEditModeFromProps, layoutId, currentThemeHookValue, removePlaceholderIfNeeded, reactFlowInstance, onCodeChange]);

  useEffect(() => {
    if (canEdit && isDirty && layoutId && (nodes.length > 0 || edges.length > 0)) {
        const isPlaceholderOnly = nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID;
        const hasContent = nodes.filter(n => n.id !== PLACEHOLDER_NODE_ID).length > 0 || edges.length > 0;

        if (hasContent || (isPlaceholderOnly && isDirty)) { 
             debouncedAutoSave(nodes, edges, reactFlowInstance, layoutId);
        }
    }
    return () => { debouncedAutoSave.cancel(); };
  }, [nodes, edges, reactFlowInstance, layoutId, canEdit, isDirty, debouncedAutoSave]);


  useEffect(() => {
    if (storeSelectedElement && !canEdit) {
      setSelectedElement(storeSelectedElement);
      setIsControlPopupOpen(true);
      if (isNode(storeSelectedElement) && storeSelectedElement.data.isDrillable && storeSelectedElement.data.subLayoutId) {
        setDrillDownLayoutId(storeSelectedElement.data.subLayoutId);
        setDrillDownParentLabel(storeSelectedElement.data.label);
        setIsDrillDownOpen(true);
      }
    } else if (!storeSelectedElement && isControlPopupOpen) {
      // Managed by onOpenChange
    }
  }, [storeSelectedElement, canEdit, setIsControlPopupOpen, setDrillDownLayoutId, setDrillDownParentLabel, setIsDrillDownOpen, isControlPopupOpen]);

  useEffect(() => {
    if (!isControlPopupOpen && storeSelectedElement) {
        if (!selectedElement || selectedElement.id !== storeSelectedElement.id) {
             setSelectedElementForDetails(null);
        } else if (selectedElement && selectedElement.id === storeSelectedElement.id && !isDrillDownOpen){
            setSelectedElementForDetails(null);
        }
    }
  }, [isControlPopupOpen, storeSelectedElement, selectedElement, setSelectedElementForDetails, isDrillDownOpen]);


  const colors: ThemeAwarePalette = getThemeAwareColors(currentThemeHookValue);
  const themedNodeColor = useCallback((node: Node) => getMiniMapNodeColor(node as CustomNodeType, colors), [colors]);
  const themedNodeStrokeColor = useCallback((node: Node) => getMiniMapNodeStrokeColor(node as CustomNodeType, colors), [colors]);
    
  //This function in SLDInspectorDialog is for global config - passed here
  const handleConfigureGlobalAnimationSettings = useCallback(() => {
    setAnimationConfiguratorTarget({ mode: 'global' });
  }, []);

  const edgesWithGlobalAndSpecificSettings = useMemo(() => {
    return edges.map(edge => {
      let resolvedAnimSettings = edge.data?.animationSettings; // Specific settings on edge

      // If no specific settings or type is 'none', AND global settings are enabled & provide a type
      if (
        activeGlobalAnimationSettings?.isEnabled !== false && // Global is ON or undefined (assume ON)
        (!resolvedAnimSettings || resolvedAnimSettings.animationType === 'none') && // Edge is 'none' or no settings
        activeGlobalAnimationSettings?.animationType && // Global has a type
        activeGlobalAnimationSettings.animationType !== 'none' // Global type is not 'none'
      ) {
        // Merge global into what the edge consumes. The edge doesn't need 'isEnabled' or the global master invert flag directly in its animationSettings.
        // The global master invert flag `globallyInvertDefaultFlowForAllEdges` is handled inside AnimatedFlowEdge using the passed global context.
        resolvedAnimSettings = {
          ...activeGlobalAnimationSettings, // take all DPs, speeds, local invert etc.
        };
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          // Pass both resolved (merged) animationSettings for the edge AND the raw global context for AnimatedFlowEdge
          animationSettings: resolvedAnimSettings, 
          // This is passed to AnimatedFlowEdge so it knows about the MASTER global invert for dynamic flow.
          // Its name in AnimatedFlowEdge is 'globallyInvertDefaultDynamicFlowLogic'
          // The types/sld.ts name for GlobalSLDAnimationSettings is globallyInvertDefaultFlowForAllEdges
          // Make sure AnimatedFlowEdge is using the correct property from types/sld
          globallyInvertDefaultFlowForAllEdges: activeGlobalAnimationSettings?.globallyInvertDefaultFlowForAllEdges ?? false, 
        }
      };
    });
  }, [edges, activeGlobalAnimationSettings]);


  const showInitialLoadingSpinner = isLoading && !currentLayoutLoadedFromServerOrInitialized.current;
  const showConnectingMessage = !isWebSocketConnected && layoutId && showInitialLoadingSpinner && !isEditModeFromProps; 
  const showDisconnectedMessageForEdit = canEdit && layoutId && !isWebSocketConnected && currentLayoutLoadedFromServerOrInitialized.current; 
  const showPromptToSelectLayout = !layoutId && canEdit && onLayoutIdChangeProp !== undefined; 

  if (showConnectingMessage) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Connecting...</div>);
  if (showInitialLoadingSpinner) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Loading Diagram{layoutId ? ` for ${layoutId.replace(/_/g, ' ')}...` : '...'}</div>);
  if (showPromptToSelectLayout) return (<div className="sld-loader-container text-muted-foreground flex-col"> <LayoutList className="h-12 w-12 mb-4 opacity-50"/><p className="text-lg font-semibold mb-2">Select Layout</p><p className="text-sm mb-4">Choose layout.</p>{onLayoutIdChangeProp !== undefined && (<Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''}><SelectTrigger className="w-[280px] mb-2"><SelectValue placeholder="Select layout..." /></SelectTrigger><SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.map(id => <SelectItem key={id} value={id}>{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select>)}</div>);
  if (showDisconnectedMessageForEdit) return (<div className="sld-loader-container text-muted-foreground flex-col"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3"/><p className="my-2 font-semibold">Sync Disconnected</p><p className="text-xs mb-3">Edits local. Reconnect to sync.</p><Button onClick={() => { setIsLoading(true); connectWebSocket();}} variant="outline" size="sm">Reconnect</Button></div>);
  if (!layoutId && !canEdit) return (<div className="sld-loader-container text-muted-foreground">No diagram specified.</div>);

  const isEffectivelyEmpty = nodes.length === 0 || (nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID);

  const handleControlPopupOpenChange = (open: boolean) => {
    setIsControlPopupOpen(open);
    if (!open) {
        setSelectedElement(null);
        if (storeSelectedElement) setSelectedElementForDetails(null);
    }
  };

  const handleDrillDownOpenChange = (open: boolean) => {
    setIsDrillDownOpen(open);
    if (!open) {
        setDrillDownLayoutId(null);
        setSelectedElement(null);
        if (storeSelectedElement) setSelectedElementForDetails(null);
    }
  };

  const handleOpenBulkAnimationConfigurator = () => {
    if (selectedEdgesFromReactFlow.length > 0) {
      setAnimationConfiguratorTarget({
        mode: 'selected_edges',
        // For bulk, we might pass the first selected edge if dialog needs one to prefill from, or null.
        // The dialog `edge` prop is optional for 'selected_edges'.
        edge: selectedEdgesFromReactFlow[0] 
      });
    } else {
      toast.info("No edges selected for bulk configuration.");
    }
  };


  return (
    <motion.div 
        className="h-full w-full flex relative bg-background" 
        ref={reactFlowWrapper}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "circOut" }}
    >
      {canEdit && onLayoutIdChangeProp && layoutId && ( 
          <div className="absolute top-3 left-3 z-20 bg-background/80 backdrop-blur-sm p-1.5 rounded-md shadow-md border w-auto min-w-[14rem]">
            <Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''}>
              <SelectTrigger className="h-9 text-xs"><div className="flex items-center"><LayoutList className="h-3.5 w-3.5 mr-1.5 opacity-70"/><SelectValue placeholder="Switch Layout..." /></div></SelectTrigger>
              <SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.map(id => (<SelectItem key={id} value={id} className="text-xs">{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent>
            </Select>
          </div>
      )}

      {canEdit && (
        <motion.div className="w-60 h-full border-r border-border shadow-md z-10 bg-card overflow-y-auto"
            initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 0.3, ease: "circOut", delay: 0.1 }}>
            <SLDElementPalette />
        </motion.div>
      )}
      <div className="flex-grow h-full relative">
        <ReactFlow
            nodes={nodes} 
            edges={edgesWithGlobalAndSpecificSettings} // Use this prop which correctly merges settings
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onInit={(instance) => {
                setReactFlowInstance(instance);
                initialFitViewDone.current = false;
            }}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions}
            onDrop={onDrop} onDragOver={onDragOver} onNodeClick={handleElementClick}  onEdgeClick={handleElementClick} 
            onNodeDragStop={onNodeDragStop} onPaneClick={onPaneClick}
            fitViewOptions={fitViewOptions} 
            selectionMode={SelectionMode.Partial}
            elementsSelectable={canEdit || !isEffectivelyEmpty}
            panOnScroll panOnScrollMode={PanOnScrollMode.Free} proOptions={{ hideAttribution: true }}
            elevateNodesOnSelect={canEdit} deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
            nodesDraggable={canEdit} nodesConnectable={canEdit}
            connectionRadius={35}
            minZoom={0.05} maxZoom={4} 
        >
            <Controls showInteractive={canEdit} />
            <MiniMap pannable zoomable nodeColor={themedNodeColor} nodeStrokeColor={themedNodeStrokeColor} nodeStrokeWidth={2} nodeBorderRadius={2}
                style={{ backgroundColor: colors.miniMapBg, border: `1px solid ${colors.miniMapBorder}` }} maskColor={colors.maskBg} maskStrokeColor={colors.maskStroke}/>
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color={colors.backgroundDots} className="opacity-60" />
            
            <Panel position="top-right" className="!m-0 !p-0">
                {canEdit && layoutId && ( 
                    <motion.div className="flex items-center gap-2 p-2.5 bg-background/80 backdrop-blur-sm border-border border rounded-bl-lg shadow-lg"
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}>
                      {/* Dirty/Saving status indicators */}
                      {isWebSocketConnected && isDirty && (
                          <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium py-1 px-1.5 rounded-md bg-amber-500/10 flex items-center animate-pulse">
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin opacity-80" /> Saving...
                              </span></TooltipTrigger><TooltipContent><p>Auto-saving and syncing...</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      {isWebSocketConnected && !isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current && (
                          <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium py-1 px-1.5 rounded-md bg-green-500/10 flex items-center">
                                  <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Synced
                              </span></TooltipTrigger><TooltipContent><p>Layout saved and synced with server.</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      {!isWebSocketConnected && isDirty && ( 
                           <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                <span className="text-xs text-sky-600 dark:text-sky-400 font-medium py-1 px-1.5 rounded-md bg-sky-500/10 flex items-center">
                                    <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Saved Locally
                                </span></TooltipTrigger><TooltipContent><p>Changes saved locally. Offline, server sync pending.</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                       {!isWebSocketConnected && !isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current && (
                           <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium py-1 px-1.5 rounded-md bg-slate-500/10 flex items-center">
                                    <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Local
                                </span></TooltipTrigger><TooltipContent><p>Layout loaded from local storage. Offline.</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      
                      {/* Action Buttons */}
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" title="Clear Canvas" disabled={isEffectivelyEmpty && !isDirty && currentLayoutLoadedFromServerOrInitialized.current}>
                                  <RotateCcw className="h-4 w-4 mr-1.5"/> Clear
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Reset SLD Layout?</AlertDialogTitle>
                              <AlertDialogDescription>Clear "{layoutId?.replace(/_/g, ' ')}"? This replaces content with a placeholder and clears global animation settings for this layout. Changes saved via auto/manual save.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleResetLayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> Reset </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={handleManualSaveLayout} size="sm" variant="secondary" title="Save Now & Sync"  disabled={!isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current }> Save Now </Button>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleExportAllLayouts} size="sm" variant="outline" title="Export All Locally Stored Layouts">
                                    <Download className="h-4 w-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Export All Stored Layouts</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                       
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => setIsImportDialogOpen(true)} size="sm" variant="outline" title="Import Layout from JSON">
                                        <Upload className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Import Layout from JSON</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        title="Bulk Configure Edge Animations"
                                        disabled={!canEdit || selectedEdgesFromReactFlow.length === 0}
                                        onClick={handleOpenBulkAnimationConfigurator} // Use new handler
                                    >
                                        <ListChecks className="h-4 w-4 mr-1.5" />
                                        Bulk Anim
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Bulk Configure Edge Animations ({selectedEdgesFromReactFlow.length} selected)</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </motion.div>
                )}
            </Panel>
        </ReactFlow>
      </div>
      
      {canEdit && layoutId && (
        <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <AlertDialogContent className="max-w-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Import SLD Layout from JSON</AlertDialogTitle>
                    <AlertDialogDescription>
                        Paste the JSON content of a single SLDLayout object below. This will overwrite the current layout ({layoutId.replace(/_/g, ' ')}).
                        The imported layout's global animation settings will also apply.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                    placeholder="Paste SLDLayout JSON here..."
                    value={importJsonString}
                    onChange={(e) => setImportJsonString(e.target.value)}
                    className="min-h-[200px] max-h-[400px] text-xs font-mono"
                    aria-label="SLD Layout JSON Input"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setImportJsonString('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImportLayout}>Import</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {canEdit && selectedElement && ( 
        <SLDInspectorDialog 
            isOpen={isInspectorDialogOpen} 
            onOpenChange={(open) => { setIsInspectorDialogOpen(open); if (!open) setSelectedElement(null);}} 
            selectedElement={selectedElement} 
            onUpdateElement={handleUpdateElement} 
            onDeleteElement={handleDeleteElement} 
            onSetGlobalAnimationSettings={handleConfigureGlobalAnimationSettings} // Changed to match expected prop name
            onConfigureEdgeAnimation={(edgeToConfig) => { // New Prop
                setAnimationConfiguratorTarget({ mode: 'single_edge', edge: edgeToConfig});
            }}
            currentGlobalAnimationSettings={activeGlobalAnimationSettings} // New Prop
        /> 
      )}
      {!canEdit && selectedElement && (isNode(selectedElement) || isEdge(selectedElement)) && ( <SLDElementControlPopup element={selectedElement} isOpen={isControlPopupOpen} onOpenChange={handleControlPopupOpenChange} /> )}
      {isDrillDownOpen && drillDownLayoutId && ( <SLDDrillDownDialog isOpen={isDrillDownOpen} onOpenChange={handleDrillDownOpenChange} layoutId={drillDownLayoutId} parentLabel={drillDownParentLabel} /> )}
      
{animationConfiguratorTarget && canEdit && (
  <AnimationFlowConfiguratorDialog
    isOpen={!!animationConfiguratorTarget}
    onOpenChange={(open) => {
      if (!open) setAnimationConfiguratorTarget(null);
    }}
    edge={ // Edge prop is for single_edge mode, or first of selected_edges to prefill from.
      animationConfiguratorTarget.mode === 'single_edge'
        ? animationConfiguratorTarget.edge || null
        : animationConfiguratorTarget.mode === 'selected_edges' && selectedEdgesFromReactFlow.length > 0
        ? selectedEdgesFromReactFlow[0]
        : null
    }
    availableDataPoints={Object.values(appDataPoints)}
    mode={animationConfiguratorTarget.mode}
    initialGlobalSettings={activeGlobalAnimationSettings as DialogGlobalAnimationSettings | undefined}
    onConfigure={(
      config: DialogAnimationFlowConfig, 
      applyToMode: AnimationFlowConfiguratorMode,
      setGlobalInvertFlag?: boolean 
    ) => {
      if (applyToMode === 'global') {
        const newGlobalSettings: GlobalSLDAnimationSettings = {
          isEnabled: activeGlobalAnimationSettings?.isEnabled, // Preserve isEnabled
          // Base animation fields from config
          animationType: config.animationType,
          generationDataPointId: config.generationDataPointId,
          usageDataPointId: config.usageDataPointId,
          gridNetFlowDataPointId: config.gridNetFlowDataPointId,
          speedMultiplier: config.speedMultiplier,
          invertFlowDirection: config.invertFlowDirection,
          constantFlowDirection: config.constantFlowDirection,
          constantFlowSpeed: config.constantFlowSpeed,
          constantFlowActivationDataPointId: config.constantFlowActivationDataPointId,
          // Global specific flag
          globallyInvertDefaultFlowForAllEdges: setGlobalInvertFlag, 
        };
        setActiveGlobalAnimationSettings(newGlobalSettings);
        setIsDirty(true);

      } else if (applyToMode === 'selected_edges') {
        const selectedEdgeIds = new Set(selectedEdgesFromReactFlow.map(e => e.id));
        setEdges(currentEdges =>
          currentEdges.map(edge => {
            if (!selectedEdgeIds.has(edge.id)) {
              return edge;
            }
            // Construct AnimationFlowConfig from DialogAnimationFlowConfig
            const newEdgeSpecificSettings: AnimationFlowConfig = {
                animationType: config.animationType,
                generationDataPointId: config.generationDataPointId,
                usageDataPointId: config.usageDataPointId,
                gridNetFlowDataPointId: config.gridNetFlowDataPointId,
                speedMultiplier: config.speedMultiplier,
                invertFlowDirection: config.invertFlowDirection,
                constantFlowDirection: config.constantFlowDirection,
                constantFlowSpeed: config.constantFlowSpeed,
                constantFlowActivationDataPointId: config.constantFlowActivationDataPointId,
            };
            
            let edgeData: CustomFlowEdgeData = { ...(edge.data || {}) };
            edgeData.animationSettings = newEdgeSpecificSettings;
            
            if (newEdgeSpecificSettings.animationType !== 'none') {
                edgeData.dataPointLinks = (edgeData.dataPointLinks || []).filter(link =>
                    !['isEnergized', 'flowDirection', 'animationSpeedFactor'].includes(link.targetProperty)
                );
                if (edgeData.dataPointLinks?.length === 0) {
                    delete edgeData.dataPointLinks;
                }
            }
            return { ...edge, data: edgeData };
          })
        );
        setIsDirty(true);
      } else if (applyToMode === 'single_edge' && animationConfiguratorTarget?.edge) {
        const targetEdgeId = animationConfiguratorTarget.edge.id;
        setEdges(currentEdges =>
          currentEdges.map(edge => {
            if (edge.id !== targetEdgeId) return edge;
            
            const newEdgeSpecificSettings: AnimationFlowConfig = {
                animationType: config.animationType,
                generationDataPointId: config.generationDataPointId,
                usageDataPointId: config.usageDataPointId,
                gridNetFlowDataPointId: config.gridNetFlowDataPointId,
                speedMultiplier: config.speedMultiplier,
                invertFlowDirection: config.invertFlowDirection,
                constantFlowDirection: config.constantFlowDirection,
                constantFlowSpeed: config.constantFlowSpeed,
                constantFlowActivationDataPointId: config.constantFlowActivationDataPointId,
            };

            let edgeData: CustomFlowEdgeData = { ...(edge.data || {}) };
            edgeData.animationSettings = newEdgeSpecificSettings;

            if (newEdgeSpecificSettings.animationType !== 'none') {
                edgeData.dataPointLinks = (edgeData.dataPointLinks || []).filter(link =>
                    !['isEnergized', 'flowDirection', 'animationSpeedFactor'].includes(link.targetProperty)
                );
                if (edgeData.dataPointLinks?.length === 0) {
                    delete edgeData.dataPointLinks;
                }
            }
            return { ...edge, data: edgeData };
          })
       );
       setIsDirty(true);
      }
      setAnimationConfiguratorTarget(null); 
    }}
  />
)}
    </motion.div>
  );
};

export interface SLDWidgetProps {
  layoutId: string | null;
  isEditMode?: boolean;
  onLayoutIdChange?: (newLayoutId: string) => void;
  onCodeChange?: (code: string, layoutId: string) => void; 
}

const SLDWidget: React.FC<SLDWidgetProps> = (props) => {
    if (!props.layoutId && !props.isEditMode) { 
      return <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-background p-4 text-center text-sm">Error: No SLD Layout ID specified for view mode.</div>;
    }
    return (<ReactFlowProvider><SLDWidgetCore {...props} onLayoutIdChangeProp={props.onLayoutIdChange} /></ReactFlowProvider>);
};

export default React.memo(SLDWidget);