// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react'; // Added useLayoutEffect
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import { AlertTriangle, Check, LayoutList, Loader2, RotateCcw, X } from 'lucide-react';
import { motion } from 'framer-motion';

import {
  SLDWidgetProps, SLDLayout, CustomNodeType, CustomFlowEdge, CustomNodeData,
  SLDElementType, CustomFlowEdgeData, TextLabelNodeData,
} from '@/types/sld';
import {
  getThemeAwareColors, getNodeColor as getMiniMapNodeColor,
  getNodeStrokeColor as getMiniMapNodeStrokeColor, ThemeAwarePalette,
} from './ui/sldThemeUtils';
import { useWebSocket, WebSocketMessageToServer } from '@/hooks/useWebSocketListener';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { sldLayouts as constantSldLayouts } from '@/config/sldLayouts';

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


import AnimatedFlowEdge from './edges/AnimatedFlowEdge';
import SLDElementPalette from './ui/SLDElementPalette';
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementDetailSheet from './ui/SLDElementDetailSheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';
import FuseNode from './nodes/FuseNode';

interface WebSocketMessageFromServer {
  type: string;
  payload: { key?: string; layout?: SLDLayout; error?: string; };
}

const nodeTypes: NodeTypes = {
    [SLDElementType.DataLabel]: DataLabelNode,
    [SLDElementType.TextLabel]: TextLabelNode,
    [SLDElementType.Inverter]: InverterNode,
    [SLDElementType.Panel]: PanelNode,
    // Uncomment and ensure you have the component files if you use these types:
    [SLDElementType.Breaker]: BreakerNode,
    [SLDElementType.Fuse]: FuseNode, // Assuming same as Breaker for now
    [SLDElementType.Meter]: MeterNode,    
    [SLDElementType.Battery]: BatteryNode, 
    [SLDElementType.Contactor]: ContactorNode, 
    [SLDElementType.Grid]: GridNode,       
    [SLDElementType.Load]: LoadNode,       
    [SLDElementType.Busbar]: BusbarNode,   
    [SLDElementType.GenericDevice]: GenericDeviceNode,
    [SLDElementType.Transformer]: TransformerNode,
    [SLDElementType.Generator]: GeneratorNode,
    [SLDElementType.PLC]: PLCNode,
    [SLDElementType.Sensor]: SensorNode,

};
const edgeTypes: EdgeTypes = { animatedFlow: AnimatedFlowEdge };
const defaultEdgeOptions = { type: 'animatedFlow', style: { strokeWidth: 3 }, data: {} as CustomFlowEdgeData };
const fitViewOptions: FitViewOptions = { padding: 0.25, duration: 400, includeHiddenNodes: false }; // Slightly more padding
const PLACEHOLDER_NODE_ID = 'sld-placeholder-node';


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
  onLayoutIdChange?: (newLayoutId: string) => void;
}

const SLDWidgetCore: React.FC<SLDWidgetCoreProps> = ({
  layoutId,
  isEditMode: isEditModeFromProps,
  onLayoutIdChange,
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
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [currentLayoutIdKey, setCurrentLayoutIdKey] = useState<string>('');
  
  const currentLayoutLoadedFromServerOrInitialized = useRef(false); 
  const canEdit = useMemo(() => !!isEditModeFromProps, [isEditModeFromProps]);
  const initialFitViewDone = useRef(false); // Track if initial fitView has been performed for the current layout

  const LOCAL_STORAGE_KEY_PREFIX = 'sldLayout_';

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
    initialFitViewDone.current = false; // New content, allow fitView again on next layout effect
  }, [canEdit, reactFlowInstance, removePlaceholderIfNeeded]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = canEdit ? 'move' : 'none';
  }, [canEdit]);
  
  const handleElementClick = useCallback(
    (event: React.MouseEvent, element: Node | Edge) => {
      event.stopPropagation(); setSelectedElement(element as CustomNodeType | CustomFlowEdge);
      if (canEdit) setIsInspectorDialogOpen(true);
      else {
        setIsDetailSheetOpen(true); 
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
    setSelectedElement(null); setIsInspectorDialogOpen(false); setIsDetailSheetOpen(false);
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
    initialFitViewDone.current = false; // Content changed, allow fitView
  }, [canEdit]);

  const handleInternalLayoutSelect = useCallback((newLayoutId: string) => {
    if (newLayoutId !== layoutId && onLayoutIdChange) {
      if (isDirty) toast("Unsaved Changes", { 
          description: "Discard unsaved changes to switch layouts?", 
          action: { label: "Discard & Switch", onClick: () => { setIsDirty(false); onLayoutIdChange(newLayoutId); }}, 
          cancel: { label: "Stay", onClick: () => {} }, duration: Infinity });
      else onLayoutIdChange(newLayoutId);
    }
  }, [layoutId, onLayoutIdChange, isDirty]);

  const handleResetLayout = useCallback(() => {
    if (!canEdit || !layoutId) return;
    setNodes([createPlaceholderNode(layoutId, currentThemeHookValue)]);
    setEdges([]); setIsDirty(true); 
    toast.success("Layout Cleared", { description: "Canvas reset. Save to persist." });
    initialFitViewDone.current = false; // Content reset, allow fitView
  }, [canEdit, layoutId, currentThemeHookValue]);
  
  const persistLayout = useCallback((nodesToSave: CustomNodeType[], edgesToSave: CustomFlowEdge[], rfInstance: ReactFlowInstance | null, currentLayoutId: string, manualSave: boolean) => {
    if (!canEdit || !currentLayoutId) return false;
    const layoutKey = `${LOCAL_STORAGE_KEY_PREFIX}${currentLayoutId}`;
    const nodesForStorage = nodesToSave.filter(n => n.id !== PLACEHOLDER_NODE_ID);
    const viewport = rfInstance ? rfInstance.getViewport() : undefined;
    const layoutToPersist: SLDLayout = { layoutId: currentLayoutId, nodes: nodesForStorage.map(n=>({...n,data:{...n.data}})), edges: edgesToSave.map(e=>({...e,data:{...e.data}})), viewport };
    try {
        localStorage.setItem(layoutKey, JSON.stringify(layoutToPersist));
        if (manualSave) toast.success("Layout Saved Locally");
    } catch (error) {
        console.error(`PersistLayout: Error saving to LS:`, error);
        if (manualSave) toast.error("Local Save Failed");
    }
    if (isWebSocketConnected && sendJsonMessage) {
        sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${currentLayoutId}`, layout: layoutToPersist } });
        if (manualSave) toast.info("Syncing to Server...", { id: `save-pending-${currentLayoutId}` });
        return true; 
    } else {
        if (manualSave) toast.warning("Offline: Server Sync Skipped");
        return true; 
    }
  }, [canEdit, isWebSocketConnected, sendJsonMessage]);

  const debouncedAutoSave = useMemo(
      () => throttle((currentNodes, currentEdges, rfInst, layoutID) => {
        if (!layoutID) return;
        if (isDirty || currentNodes.some((n: { id: string; }) => n.id !== PLACEHOLDER_NODE_ID) || currentEdges.length > 0) {
             persistLayout(currentNodes, currentEdges, rfInst, layoutID, false);
        }
      }, 5000, { leading: false, trailing: true }),
      [persistLayout, isDirty] 
  );

  const handleManualSaveLayout = useCallback(() => {
      if (!canEdit || !layoutId) return;
      if (!isDirty && nodes.filter(n=>n.id !== PLACEHOLDER_NODE_ID).length === 0 && edges.length === 0 && 
          !(nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID)) {
          toast.info("No Changes to Save"); return;
      }
      persistLayout(nodes, edges, reactFlowInstance, layoutId, true);
  }, [nodes, edges, reactFlowInstance, layoutId, canEdit, isDirty, persistLayout]);

  useEffect(() => {
    if (layoutId) {
      const newKey = `sld_${layoutId}`; 
      if (newKey !== currentLayoutIdKey) {
        setCurrentLayoutIdKey(newKey);
        currentLayoutLoadedFromServerOrInitialized.current = false; 
        initialFitViewDone.current = false; // Reset fitView for new layout
        setNodes([]); setEdges([]); setIsDirty(false); setIsLoading(true);
        setSelectedElement(null); setIsInspectorDialogOpen(false); setIsDetailSheetOpen(false);
      }
    } else { 
      setCurrentLayoutIdKey(''); setNodes([]); setEdges([]); setIsLoading(false); 
      currentLayoutLoadedFromServerOrInitialized.current = false; initialFitViewDone.current = false;
      setIsDirty(false); setSelectedElement(null); setIsInspectorDialogOpen(false); setIsDetailSheetOpen(false);
    }
  }, [layoutId]); // Removed currentLayoutIdKey from dependencies as it's set here

  useEffect(() => {
    if (!layoutId || currentLayoutLoadedFromServerOrInitialized.current) {
      if (currentLayoutLoadedFromServerOrInitialized.current && !initialFitViewDone.current && reactFlowInstance && nodes.length > 0) {
           // This block ensures fitView is called after initial load IF it hasn't been done yet.
           // Useful if viewport wasn't part of the loaded layout or if default fitView is desired.
           setTimeout(() => { // Timeout ensures DOM is ready and nodes have dimensions
                console.log("SLDWidget: Attempting fitView in loading useEffect because currentLayoutLoaded but initialFitViewDone is false.");
                reactFlowInstance.fitView(fitViewOptions);
                initialFitViewDone.current = true;
            }, 100); // Slightly longer delay might be needed for complex nodes
      }
      if (currentLayoutLoadedFromServerOrInitialized.current) setIsLoading(false);
      return;
    }
    
    let loadedLayout: SLDLayout | null = null; let loadedFrom: string | null = null;

    if (constantSldLayouts[layoutId]) {
        loadedLayout = JSON.parse(JSON.stringify(constantSldLayouts[layoutId])); 
        loadedFrom = "constant definition";
    }
    if (!loadedLayout) {
        const localData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`);
        if (localData) try {
            loadedLayout = JSON.parse(localData);
            if (loadedLayout && loadedLayout.layoutId === layoutId && Array.isArray(loadedLayout.nodes)) loadedFrom = "LocalStorage";
            else { loadedLayout = null; localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`); }
        } catch (e) { loadedLayout = null; localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`); }
    }

    if (loadedLayout && loadedFrom) {
      console.log(`SLDWidget: Layout "${layoutId}" loaded from ${loadedFrom}.`);
      setNodes((loadedLayout.nodes || []).map(n => ({...n, selected: false})));
      setEdges(loadedLayout.edges || []);
      setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true; setIsDirty(false);
      initialFitViewDone.current = false; // Mark for fitView after this state update
      return;
    }

    if (isWebSocketConnected && currentLayoutIdKey) {
        setIsLoading(true); sendJsonMessage({ type: 'get-layout', payload: { key: currentLayoutIdKey } });
    } else if (isEditModeFromProps) {
        setNodes([createPlaceholderNode(layoutId, currentThemeHookValue)]); setEdges([]);
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true; setIsDirty(false);
        initialFitViewDone.current = false; // Mark for fitView
    } else {
        setNodes([createPlaceholderNode(layoutId + " (Connecting...)", currentThemeHookValue)]); setEdges([]);
        setIsLoading(true);
    }
  }, [layoutId, currentLayoutIdKey, isEditModeFromProps, isWebSocketConnected, sendJsonMessage, currentThemeHookValue, reactFlowInstance]); // reactFlowInstance added to dependencies for fitView logic inside

  // Dedicated effect for fitView after nodes/edges/instance are ready and a load has completed.
  useLayoutEffect(() => {
    if (reactFlowInstance && !isLoading && currentLayoutLoadedFromServerOrInitialized.current && !initialFitViewDone.current && nodes.length > 0) {
        const loadedLayoutConfig = constantSldLayouts[layoutId!] || JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${layoutId!}`) || '{}');
        
        if (loadedLayoutConfig.viewport) { // If layout has a saved viewport, use it
            console.log(`SLDWidget useLayoutEffect: Setting viewport for "${layoutId}" from loaded config.`);
            reactFlowInstance.setViewport(loadedLayoutConfig.viewport, { duration: fitViewOptions.duration });
        } else { // Otherwise, fit all elements
            console.log(`SLDWidget useLayoutEffect: Calling fitView for "${layoutId}". Nodes count: ${nodes.length}`);
            reactFlowInstance.fitView(fitViewOptions);
        }
        initialFitViewDone.current = true; // Mark fitView as done for this load cycle
    }
  }, [nodes, edges, reactFlowInstance, isLoading, layoutId, fitViewOptions]); // Listen to these critical states

  useEffect(() => {
    if (!lastJsonMessage || !currentLayoutIdKey) return;
    const message = lastJsonMessage as WebSocketMessageFromServer;
    if (message.payload?.key && message.payload.key !== currentLayoutIdKey && (message.type === 'layout-data' || message.type === 'layout-error')) return;
    const localLayoutId = layoutId; 
    switch (message.type) {
      case 'layout-data':
        const serverLayout = message.payload.layout as SLDLayout | null;
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true;
        initialFitViewDone.current = false; // New data from server, allow fitView
        if (serverLayout && serverLayout.nodes) {
            const validatedNodes = serverLayout.nodes.map(n => ({ ...n, type: n.type || n.data?.elementType || SLDElementType.TextLabel, position: n.position || { x: 0, y: 0 }, selected: false }));
            setNodes(removePlaceholderIfNeeded(validatedNodes));
            setEdges(serverLayout.edges || []);
            if (serverLayout.nodes.length === 0 && localLayoutId) setNodes(isEditModeFromProps ? [createPlaceholderNode(localLayoutId, currentThemeHookValue)] : []);
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${serverLayout.layoutId}`, JSON.stringify(serverLayout));
        } else { 
            if (isEditModeFromProps && localLayoutId) setNodes([createPlaceholderNode(localLayoutId, currentThemeHookValue)]);
            else if (localLayoutId) setNodes([createPlaceholderNode(localLayoutId + " (Not Found)", currentThemeHookValue)]);
            else setNodes([]);
            setEdges([]);
        }
        setIsDirty(false); break;
      case 'layout-error':
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true;
        initialFitViewDone.current = false; // Even on error, view might change to placeholder
        if (localLayoutId) setNodes([createPlaceholderNode(localLayoutId + " (Error)", currentThemeHookValue)]);
        else setNodes([]); 
        setEdges([]);
        toast.error("Server Load Error", { description: message.payload.error || "Failed." });
        break;
      case 'layout-saved-confirmation': 
        if (message.payload?.key === currentLayoutIdKey) { toast.success("Synced to Server!", { id: `save-confirm-${currentLayoutIdKey}`}); setIsDirty(false); } break;
      case 'layout-save-error': 
        if (message.payload?.key === currentLayoutIdKey) { toast.error("Server Sync Failed", { id: `save-error-${currentLayoutIdKey}`, description: message.payload.error || "Unknown." }); } break;
      default: break; 
    }
  }, [lastJsonMessage, currentLayoutIdKey, isEditModeFromProps, layoutId, currentThemeHookValue, removePlaceholderIfNeeded, reactFlowInstance]);

  useEffect(() => {
    if (canEdit && isDirty && layoutId && nodes && edges) { 
        if (nodes.filter(n => n.id !== PLACEHOLDER_NODE_ID).length > 0 || edges.length > 0 || (nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID && isDirty)) {
             debouncedAutoSave(nodes, edges, reactFlowInstance, layoutId);
        }
    }
    return () => { debouncedAutoSave.cancel(); };
  }, [nodes, edges, reactFlowInstance, layoutId, canEdit, isDirty, debouncedAutoSave]);

  const colors: ThemeAwarePalette = getThemeAwareColors(currentThemeHookValue);
  const themedNodeColor = useCallback((node: Node) => getMiniMapNodeColor(node as CustomNodeType, colors), [colors]);
  const themedNodeStrokeColor = useCallback((node: Node) => getMiniMapNodeStrokeColor(node as CustomNodeType, colors), [colors]);
    
  const showInitialLoadingSpinner = isLoading && !currentLayoutLoadedFromServerOrInitialized.current;
  const showConnectingMessage = !isWebSocketConnected && layoutId && showInitialLoadingSpinner && !isEditModeFromProps; 
  const showDisconnectedMessageForEdit = canEdit && layoutId && !isWebSocketConnected && currentLayoutLoadedFromServerOrInitialized.current; 
  const showPromptToSelectLayout = !layoutId && canEdit && onLayoutIdChange !== undefined;

  if (showConnectingMessage) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Connecting...</div>);
  if (showInitialLoadingSpinner) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Loading Diagram{layoutId ? ` for ${layoutId.replace(/_/g, ' ')}...` : '...'}</div>);
  if (showPromptToSelectLayout) return (<div className="sld-loader-container text-muted-foreground flex-col"> <LayoutList className="h-12 w-12 mb-4 opacity-50"/><p className="text-lg font-semibold mb-2">Select Layout</p><p className="text-sm mb-4">Choose layout.</p>{onLayoutIdChange !== undefined && (<Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''}><SelectTrigger className="w-[280px] mb-2"><SelectValue placeholder="Select layout..." /></SelectTrigger><SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.map(id => <SelectItem key={id} value={id}>{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select>)}</div>);
  if (showDisconnectedMessageForEdit) return (<div className="sld-loader-container text-muted-foreground flex-col"><svg className="sld-loader-svg !animate-none opacity-50" viewBox="0 0 50 50"><circle className="sld-loader-path !animate-none stroke-amber-500" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg><p className="my-2 font-semibold">Sync Disconnected</p><p className="text-xs mb-3">Edits local. Reconnect to sync.</p><Button onClick={() => { setIsLoading(true); connectWebSocket();}} variant="outline" size="sm">Reconnect</Button></div>);
  if (!layoutId && !canEdit) return (<div className="sld-loader-container text-muted-foreground">No diagram specified.</div>);

  const isEffectivelyEmpty = nodes.length === 0 || (nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID);

  return (
    <motion.div 
        className="h-full w-full flex relative bg-background" 
        ref={reactFlowWrapper}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "circOut" }}
    >
      {canEdit && onLayoutIdChange && layoutId && ( 
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
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onInit={(instance) => {
                setReactFlowInstance(instance);
                initialFitViewDone.current = false; // Explicitly mark false on new instance so layoutEffect handles first fit
            }} // Modified onInit to potentially help trigger fitView consistently
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions}
            onDrop={onDrop} onDragOver={onDragOver} onNodeClick={handleElementClick}  onEdgeClick={handleElementClick} 
            onNodeDragStop={onNodeDragStop} onPaneClick={onPaneClick}
            // fitView prop removed to give full control to programmatic fitView/setViewport via useLayoutEffect
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
                      {isWebSocketConnected && isDirty && (
                          <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium py-1 px-1.5 rounded-md bg-amber-500/10 flex items-center animate-pulse">
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin opacity-80" /> Saving...
                              </span></TooltipTrigger><TooltipContent><p>Auto-saving...</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      {isWebSocketConnected && !isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current && (
                          <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium py-1 px-1.5 rounded-md bg-green-500/10 flex items-center">
                                  <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Synced
                              </span></TooltipTrigger><TooltipContent><p>Layout synced</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      {!isWebSocketConnected && isDirty && (
                           <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                <span className="text-xs text-sky-600 dark:text-sky-400 font-medium py-1 px-1.5 rounded-md bg-sky-500/10 flex items-center">
                                    <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Saved Locally
                                </span></TooltipTrigger><TooltipContent><p>Changes saved locally. Offline.</p></TooltipContent></Tooltip></TooltipProvider>
                      )}
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" title="Clear Canvas" disabled={isEffectivelyEmpty && !isDirty}>
                                  <RotateCcw className="h-4 w-4 mr-1.5"/> Clear
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Reset SLD Layout?</AlertDialogTitle>
                              <AlertDialogDescription>Clear "{layoutId?.replace(/_/g, ' ')}"? This replaces content with placeholder. Saved on next action.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleResetLayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> Reset </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={handleManualSaveLayout} size="sm" variant="secondary" title="Save Now"  disabled={!isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current }> Save Now </Button>
                    </motion.div>
                )}
            </Panel>
        </ReactFlow>
      </div>
      {canEdit && selectedElement && ( <SLDInspectorDialog isOpen={isInspectorDialogOpen} onOpenChange={(open) => { setIsInspectorDialogOpen(open); if (!open) setSelectedElement(null);}} selectedElement={selectedElement} onUpdateElement={handleUpdateElement} onDeleteElement={handleDeleteElement}/> )}
      {!canEdit && selectedElement && (isNode(selectedElement) || isEdge(selectedElement)) && ( <SLDElementDetailSheet element={selectedElement} isOpen={isDetailSheetOpen} onOpenChange={(open) => { setIsDetailSheetOpen(open); if (!open) setSelectedElement(null);}} /> )}
      {isDrillDownOpen && drillDownLayoutId && ( <SLDDrillDownDialog isOpen={isDrillDownOpen} onOpenChange={(open) => { setIsDrillDownOpen(open); if (!open) { setDrillDownLayoutId(null); setSelectedElement(null); }}} layoutId={drillDownLayoutId} parentLabel={drillDownParentLabel} /> )}
    </motion.div>
  );
};

const SLDWidget: React.FC<SLDWidgetProps> = (props) => {
    if (!props.layoutId && !props.isEditMode) { 
      return <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-background p-4 text-center text-sm">Error: No SLD Layout ID.</div>;
    }
    return (<ReactFlowProvider><SLDWidgetCore {...props} /></ReactFlowProvider>);
};

export default React.memo(SLDWidget);