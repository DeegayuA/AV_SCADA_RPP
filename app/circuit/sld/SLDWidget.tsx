// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node, Edge, Connection, addEdge,
  NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges,
  SelectionMode, PanOnScrollMode, isNode, isEdge,
  Controls, MiniMap, Background, NodeTypes, EdgeTypes, ReactFlowInstance,
  FitViewOptions,
  useReactFlow,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import { AlertTriangle, Check, LayoutList, Loader2, RotateCcw, X } from 'lucide-react';
import { motion } from 'framer-motion'; // Optional: for subtle animations

import {
  SLDWidgetProps, SLDLayout, CustomNodeType, CustomFlowEdge, CustomNodeData,
  SLDElementType, CustomFlowEdgeData,
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

import DataLabelNode from './nodes/DataLabelNode';
import TextLabelNode from './nodes/TextLabelNode';
import InverterNode from './nodes/InverterNode';
import PanelNode from './nodes/PanelNode';
// ... other node imports

import AnimatedFlowEdge from './edges/AnimatedFlowEdge';
import SLDElementPalette from './ui/SLDElementPalette';
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementDetailSheet from './ui/SLDElementDetailSheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';

interface WebSocketMessageFromServer {
  type: string;
  payload: { key?: string; layout?: SLDLayout; error?: string; };
}

const nodeTypes: NodeTypes = {
    [SLDElementType.DataLabel]: DataLabelNode,
    [SLDElementType.TextLabel]: TextLabelNode,
    [SLDElementType.Inverter]: InverterNode,
    [SLDElementType.Panel]: PanelNode,
    // ... other node types
};
const edgeTypes: EdgeTypes = { animatedFlow: AnimatedFlowEdge };
const defaultEdgeOptions = { type: 'animatedFlow', style: { strokeWidth: 3 }, data: {} as CustomFlowEdgeData };
const fitViewOptions: FitViewOptions = { padding: 0.2, duration: 300 };
const PLACEHOLDER_NODE_ID = 'sld-placeholder-node';

const createPlaceholderNode = (layoutName: string): CustomNodeType => ({
  id: PLACEHOLDER_NODE_ID,
  type: SLDElementType.TextLabel,
  position: { x: 200, y: 100 },
  data: {
    label: `Layout: ${layoutName.replace(/_/g, ' ')}\n\nDrag elements from the palette to build your diagram.\nOr click "Reset Layout" to clear the canvas.`,
    elementType: SLDElementType.TextLabel,
    fontSize: 15,
    // textColor: getThemeAwareColors(undefined).foreground, // Use themed color
    backgroundColor: 'transparent', // Or a very light background
    textAnchor: 'middle',
    width: 350,
    height: 100,
  } as CustomNodeData,
  draggable: false,
  selectable: false,
  zIndex: -1000, // Keep it in the background
});

interface SLDWidgetCoreProps extends SLDWidgetProps {
  onLayoutIdChange?: (newLayoutId: string) => void;
}

const SLDWidgetCore: React.FC<SLDWidgetCoreProps> = ({
  layoutId,
  isEditMode: isEditModeFromProps,
  onLayoutIdChange,
}) => {
  const { theme: currentTheme } = useTheme();
  const { sendJsonMessage, lastJsonMessage, isConnected: isWebSocketConnected, connect: connectWebSocket } = useWebSocket();
  const rfInstanceHook = useReactFlow(); // Alternative way to get instance for certain actions

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

  useEffect(() => {
    if (layoutId) {
        const newKey = `sld_${layoutId}`;
        if (newKey !== currentLayoutIdKey) {
            setCurrentLayoutIdKey(newKey);
            currentLayoutLoadedFromServerOrInitialized.current = false; 
            setIsDirty(false); 
            setIsLoading(true); 
        }
    } else {
        setCurrentLayoutIdKey(''); setNodes([]); setEdges([]);
        setIsLoading(false);
        currentLayoutLoadedFromServerOrInitialized.current = false;
    }
  }, [layoutId, currentLayoutIdKey]);

  // Effect for data loading or client-side initialization
  useEffect(() => {
    if (!layoutId || !currentLayoutIdKey) {
        setIsLoading(false); setNodes([]); setEdges([]);
        currentLayoutLoadedFromServerOrInitialized.current = false;
        return;
    }

    if (isEditModeFromProps && !currentLayoutLoadedFromServerOrInitialized.current) {
        console.log(`SLDWidget: Edit mode for new/unloaded layout: ${currentLayoutIdKey}. Initializing client-side with placeholder.`);
        setNodes([createPlaceholderNode(layoutId)]); 
        setEdges([]);
        setIsLoading(false);
        currentLayoutLoadedFromServerOrInitialized.current = true; 
        setIsDirty(false); // Initially not dirty with placeholder
        setSelectedElement(null);
        setIsInspectorDialogOpen(false);
        if (reactFlowInstance) {
            setTimeout(() => reactFlowInstance.fitView(fitViewOptions), 50);
        }
        return; 
    }

    if (!isEditModeFromProps && isWebSocketConnected && !currentLayoutLoadedFromServerOrInitialized.current) {
        console.log(`SLDWidget: View mode. Requesting layout via WS for: ${currentLayoutIdKey}`);
        setIsLoading(true); setSelectedElement(null); setIsInspectorDialogOpen(false);
        sendJsonMessage({ type: 'get-layout', payload: { key: currentLayoutIdKey } });
    } else if (currentLayoutLoadedFromServerOrInitialized.current) {
        setIsLoading(false);
    } else if (!isEditModeFromProps && !isWebSocketConnected) {
        console.warn(`SLDWidget: View mode. Waiting for WebSocket connection to load layout ${currentLayoutIdKey}...`);
        setIsLoading(true);
    } else {
        setIsLoading(false);
    }
  }, [ layoutId, currentLayoutIdKey, isWebSocketConnected, sendJsonMessage, isEditModeFromProps, reactFlowInstance ]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastJsonMessage || !currentLayoutIdKey) return;
    const message = lastJsonMessage as WebSocketMessageFromServer;

    if (message.payload?.key && message.payload.key !== currentLayoutIdKey && 
        (message.type === 'layout-data' || message.type === 'layout-error' || message.type === 'layout-saved-confirmation' || message.type === 'layout-save-error') ) {
      return;
    }
    
    switch (message.type) {
      case 'layout-data':
        const layout = message.payload.layout as SLDLayout | null;
        setIsLoading(false);
        currentLayoutLoadedFromServerOrInitialized.current = true; 
        let appliedSpecificViewport = false;
        if (layout?.nodes !== undefined && layout.nodes.length > 0) { // Only update if server has actual nodes
          const validatedNodes = layout.nodes.map(n => ({
            ...n, type: n.type || n.data?.elementType || SLDElementType.TextLabel,
            position: n.position || { x: 0, y: 0 },
          }));
          setNodes(validatedNodes);
          setEdges(layout.edges || []);
          if (reactFlowInstance && layout.viewport) {
            setTimeout(() => { if (layout.viewport) reactFlowInstance.setViewport(layout.viewport, { duration: 300 }); }, 50);
            appliedSpecificViewport = true;
          }
        } else if (layout?.nodes?.length === 0) { // Server explicitly sent an empty layout
          setNodes([]); setEdges([]);
        } else if (isEditModeFromProps && nodes.length === 1 && nodes[0].id === PLACEHOLDER_NODE_ID) {
           // If in edit mode and current nodes are just the placeholder, and server sends null/no nodes, keep placeholder
           console.log(`SLDWidget: Server has no layout for ${currentLayoutIdKey}, keeping client-side placeholder.`);
        } else { // Server has no layout, and we are not in placeholder-only edit mode
          setNodes(isEditModeFromProps ? [createPlaceholderNode(layoutId!)] : []); 
          setEdges([]);
          console.warn(`SLDWidget: Received null or missing nodes in layout-data for ${currentLayoutIdKey}. Using placeholder or empty.`);
        }
        if (reactFlowInstance && !appliedSpecificViewport) {
          setTimeout(() => reactFlowInstance.fitView(fitViewOptions), 50);
        }
        setIsDirty(false); 
        break;

      case 'layout-error':
        setIsLoading(false); 
        if(isEditModeFromProps) setNodes([createPlaceholderNode(layoutId!)]); else setNodes([]);
        setEdges([]);
        currentLayoutLoadedFromServerOrInitialized.current = true;
        toast.error("Error Loading SLD Layout", { description: message.payload.error });
        if (reactFlowInstance) setTimeout(() => reactFlowInstance.fitView(fitViewOptions), 50);
        break;
      case 'layout-saved-confirmation': // ... same as before ...
        if (message.payload?.key === currentLayoutIdKey) {
            toast.success("SLD Layout Saved to Server!", { id: `save-confirm-${currentLayoutIdKey}`});
            setIsDirty(false);
        }
        break;
      case 'layout-save-error':  // ... same as before ...
        if (message.payload?.key === currentLayoutIdKey) {
            toast.error("Failed to Save SLD to Server", { id: `save-error-${currentLayoutIdKey}`, description: message.payload.error});
        }
        break;
    }
  }, [lastJsonMessage, currentLayoutIdKey, reactFlowInstance, isEditModeFromProps, layoutId, nodes]); // Added nodes to deps for placeholder logic

    // Internal Save Logic
    const internalSaveLayout = useCallback((currentNodes: CustomNodeType[], currentEdges: CustomFlowEdge[], manualSave: boolean) => {
        if (!canEdit || !currentLayoutIdKey ) return false;
        if (!isWebSocketConnected) {
            toast.error("Cannot Save: Offline", { description: "WebSocket disconnected. Layout changes cannot be saved to server."});
            return false;
        }
        if (!sendJsonMessage || !reactFlowInstance ) return false;
        
        const nodesToSave = currentNodes.filter(n => n.id !== PLACEHOLDER_NODE_ID); // Exclude placeholder

        // Prevent auto-save if it's pristine and effectively empty (or just the placeholder)
        if (!manualSave && nodesToSave.length === 0 && currentEdges.length === 0 && !isDirty) {
            if (onLayoutIdChange !== undefined || (currentNodes.length === 1 && currentNodes[0].id === PLACEHOLDER_NODE_ID)) {
                console.log("SLDWidget: Auto-save skipped for pristine or placeholder-only layout.");
                return false;
            }
        }

        const currentViewport = reactFlowInstance.getViewport();
        const layoutToSave: SLDLayout = {
            layoutId: layoutId!, 
            nodes: nodesToSave.map(n => ({...n, data: {...n.data}})), 
            edges: currentEdges.map(e => ({...e, data: {...e.data}})), 
            viewport: currentViewport
        };
        const messageToServer: WebSocketMessageToServer = {
            type: 'save-sld-widget-layout',
            payload: { key: currentLayoutIdKey, layout: layoutToSave },
        };
        sendJsonMessage(messageToServer);
        if (manualSave) {
            toast.info("Saving SLD Layout to Server...", { id: `save-pending-${currentLayoutIdKey}`, duration: 4000 });
        }
        return true;
    }, [canEdit, sendJsonMessage, reactFlowInstance, currentLayoutIdKey, layoutId, isWebSocketConnected, isDirty, onLayoutIdChange]);

    const debouncedAutoSave = useMemo(
        () => throttle((cn, ce) => internalSaveLayout(cn, ce, false), 3000, { leading: false, trailing: true }),
        [internalSaveLayout]
    );

    useEffect(() => {
        if (canEdit && isDirty && isWebSocketConnected) { 
            debouncedAutoSave(nodes, edges);
        }
        return () => { debouncedAutoSave.cancel(); };
    }, [nodes, edges, canEdit, isDirty, debouncedAutoSave, isWebSocketConnected]);

    const handleManualSaveLayout = useCallback(() => {
        internalSaveLayout(nodes, edges, true);
    }, [nodes, edges, internalSaveLayout]);

    const removePlaceholderIfNeeded = useCallback((currentNodes: CustomNodeType[]) => {
        if (currentNodes.length > 1 && currentNodes.some(n => n.id === PLACEHOLDER_NODE_ID)) {
            return currentNodes.filter(n => n.id !== PLACEHOLDER_NODE_ID);
        }
        return currentNodes;
    }, []);
    
    const onNodesChange = useCallback((changes: NodeChange[]) => { 
        if (!canEdit) return; 
        setNodes((nds) => {
            const newNodes = applyNodeChanges(changes, nds);
            // If a node was added (typically from drop, not 'add' type in NodeChange for drag),
            // or any change happens when placeholder is the only node.
            if (changes.some(c => c.type === 'add') || (newNodes.length > 1 && newNodes.some(n => n.id === PLACEHOLDER_NODE_ID))) {
                return removePlaceholderIfNeeded(newNodes);
            }
            return newNodes;
        }); 
        if (changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) setIsDirty(true); 
    }, [canEdit, removePlaceholderIfNeeded]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => { 
      if (!canEdit) return; 
      setEdges((eds) => applyEdgeChanges(changes, eds)); 
      // Remove placeholder if an edge is created and placeholder exists
      if (changes.some(c => c.type === 'add')) {
          setNodes(prevNodes => removePlaceholderIfNeeded(prevNodes));
      }
      if (changes.some(c => c.type !== 'select')) setIsDirty(true); 
    }, [canEdit, removePlaceholderIfNeeded]);

  const onConnect = useCallback((connection: Connection) => { 
      if (!canEdit) return; 
      setEdges((eds) => addEdge({...connection, ...defaultEdgeOptions}, eds)); 
      setNodes(prevNodes => removePlaceholderIfNeeded(prevNodes)); // Remove placeholder on connect
      setIsDirty(true); 
    }, [canEdit, removePlaceholderIfNeeded]);
  
  const onNodeDragStop = useCallback(() => { if (canEdit) setIsDirty(true); }, [canEdit]);

  const onDrop = useCallback( (event: React.DragEvent) => {
      if (!canEdit || !reactFlowInstance || !reactFlowWrapper.current) return;
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow-palette-item') as SLDElementType | undefined;
      const componentDataStr = event.dataTransfer.getData('application/reactflow-palette-data');
      const componentData = componentDataStr ? JSON.parse(componentDataStr) : {};
      if (!type) return;
      const position = reactFlowInstance.project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
      const newNode: CustomNodeType = { id: `${type}_${+new Date()}`, type, position, data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`, elementType: type, status: 'nominal', ...componentData } as CustomNodeData };
      
      setNodes((nds) => removePlaceholderIfNeeded(nds).concat(newNode)); 
      setIsDirty(true);
    }, [canEdit, reactFlowInstance, removePlaceholderIfNeeded] );

  const onDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
  }, []);

  // ... other handlers (handleElementClick, handleUpdateElement, handleDeleteElement, onPaneClick) ... remain similar

    const handleDeleteElement = useCallback((elementId: string): void => {
    if (!canEdit) return;
    setNodes((nds) => nds.filter((node) => node.id !== elementId));
    setEdges((eds) => eds.filter((edge) => edge.id !== elementId && edge.source !== elementId && edge.target !== elementId));
    setIsDirty(true);
    setSelectedElement(null);
    setIsInspectorDialogOpen(false);
    toast.info(`Element ${elementId} deleted.`); // Optional feedback
  }, [canEdit, setNodes, setEdges]); 

  const handleInternalLayoutSelect = (newLayoutId: string) => { /* ... as before ... */ 
    if (newLayoutId !== layoutId && onLayoutIdChange) {
      if (isDirty) {
        toast("Unsaved Changes", { description: "You have unsaved changes. Save or discard them before switching layouts.", action: { label: "Discard & Switch", onClick: () => { onLayoutIdChange(newLayoutId); setIsDirty(false); }}, });
      } else {
        onLayoutIdChange(newLayoutId);
      }
    }
  };
  
  const handleResetLayout = useCallback(() => {
    if (!layoutId) return;
    setNodes([createPlaceholderNode(layoutId)]);
    setEdges([]);
    setIsDirty(true);
    toast.success("Layout Cleared", { description: "Canvas has been reset. Your changes will be saved." });
    if (reactFlowInstance) {
        setTimeout(() => reactFlowInstance.fitView(fitViewOptions), 50);
    }
  }, [layoutId, reactFlowInstance]);

  // Render logic for states (loading, connecting, etc.)
  const showLoadingSpinner = isLoading && !currentLayoutLoadedFromServerOrInitialized.current && (!isEditModeFromProps || !isWebSocketConnected);
  const showConnectingMessage = !isWebSocketConnected && layoutId && isLoading && !currentLayoutLoadedFromServerOrInitialized.current && !isEditModeFromProps;
  const showDisconnectedMessageForEdit = canEdit && layoutId && !isWebSocketConnected && !showConnectingMessage && currentLayoutLoadedFromServerOrInitialized.current;
  const showPromptToSelectLayout = !layoutId && canEdit && onLayoutIdChange !== undefined; // Corrected typeof check


  if (showLoadingSpinner) { return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Loading Diagram...</div>); }
  if (showConnectingMessage) { return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Connecting...</div>); }
  if (showPromptToSelectLayout) { return (<div className="sld-loader-container text-muted-foreground flex-col"> <LayoutList className="h-12 w-12 mb-4 opacity-50"/><p className="text-lg font-semibold mb-2">Select Layout</p><p className="text-sm mb-4">Choose an existing layout to edit or start a new one.</p>{onLayoutIdChange && (<Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''}><SelectTrigger className="w-[280px] mb-2"><SelectValue placeholder="Select layout..." /></SelectTrigger><SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.map(id => <SelectItem key={id} value={id}>{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select>)}</div>); }
  if (showDisconnectedMessageForEdit){ return (<div className="sld-loader-container text-muted-foreground flex-col"><svg className="sld-loader-svg !animate-none opacity-50" viewBox="0 0 50 50"><circle className="sld-loader-path !animate-none stroke-amber-500" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg><p className="my-2">Sync Disconnected.</p><p className="text-xs mb-3">Edits are local. Reconnect to save to server.</p><Button onClick={() => { setIsLoading(true); connectWebSocket();}} variant="outline" size="sm">Reconnect</Button></div>); }
  if (!layoutId && !canEdit) { return (<div className="sld-loader-container text-muted-foreground">No diagram specified.</div>); }

  const colors: ThemeAwarePalette = getThemeAwareColors(currentTheme);
  const themedNodeColor = (node: Node) => getMiniMapNodeColor(node as CustomNodeType, colors);
  const themedNodeStrokeColor = (node: Node) => getMiniMapNodeStrokeColor(node as CustomNodeType, colors);

  const handleElementClick = useCallback( // THIS IS WHERE THE ERROR POINTS
    (event: React.MouseEvent, element: Node | Edge) => {
      event.stopPropagation(); // Prevent triggering onPaneClick
      setSelectedElement(element as CustomNodeType | CustomFlowEdge);
      
      if (canEdit) { // Conditional logic INSIDE a hook's callback is FINE
        setIsInspectorDialogOpen(true);
      } else {
        setIsDetailSheetOpen(true);
        if (isNode(element) && 'drillDownLayoutId' in (element as CustomNodeType).data) {
          const nodeData = (element as CustomNodeType).data;
          const drillDownId = (nodeData as any).drillDownLayoutId;
          setDrillDownLayoutId(drillDownId as string);
          setDrillDownParentLabel(nodeData.label);
          setIsDrillDownOpen(true);
        }
      }
    },
    [canEdit] // Dependency array
  );

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
    setIsInspectorDialogOpen(false);
    setIsDetailSheetOpen(false);
  }, []);

  const handleUpdateElement = useCallback((updatedElement: CustomNodeType | CustomFlowEdge) => {
    if (isNode(updatedElement)) {
      setNodes(nds => nds.map(n => n.id === updatedElement.id ? updatedElement as CustomNodeType : n));
    } else if (isEdge(updatedElement)) {
      setEdges(eds => eds.map(e => e.id === updatedElement.id ? updatedElement as CustomFlowEdge : e));
    }
    setIsDirty(true);
  },[canEdit, setNodes, setEdges]);

  return (
    <motion.div 
        className="h-full w-full flex relative bg-background" 
        ref={reactFlowWrapper}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
    >
      {/* ... Internal Layout Switcher (if onLayoutIdChange prop is provided) ... as before */}

      {canEdit && (
        <motion.div 
            className="w-60 h-full border-r border-border shadow-md z-10 bg-card overflow-y-auto"
            initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 0.3, ease: "circOut" }}
        >
            <SLDElementPalette />
        </motion.div>
      )}
      <div className="flex-grow h-full relative">
        <ReactFlow /* ... props as before ... */
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions}
            onDrop={onDrop} onDragOver={onDragOver}
            onNodeClick={handleElementClick}  onEdgeClick={handleElementClick} 
            onNodeDragStop={onNodeDragStop} onPaneClick={onPaneClick}
            fitView fitViewOptions={fitViewOptions}
            selectionMode={SelectionMode.Partial}
            panOnScroll panOnScrollMode={PanOnScrollMode.Free}
            proOptions={{ hideAttribution: true }}
            elevateNodesOnSelect={canEdit}
            deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
            multiSelectionKeyCode={canEdit ? ['Meta', 'Shift'] : null} 
            zoomActivationKeyCode={'Meta'}
            nodesDraggable={canEdit} nodesConnectable={canEdit} elementsSelectable={true}
            connectionRadius={35}
        >
            <Controls showInteractive={canEdit} />
            <MiniMap pannable zoomable nodeColor={themedNodeColor} nodeStrokeColor={themedNodeStrokeColor} nodeStrokeWidth={2} nodeBorderRadius={2}
                style={{ backgroundColor: colors.miniMapBg, border: `1px solid ${colors.miniMapBorder}` }} />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={colors.backgroundDots} className="opacity-75" />
            
            <Panel position="top-right" className="!m-0 !p-0">
                {canEdit && layoutId && ( 
                    <div className="flex items-center gap-2 p-2.5 bg-background/80 backdrop-blur-sm border-border border rounded-bl-lg shadow-md">
                    {isWebSocketConnected && isDirty && (
                        <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium py-1 px-1.5 rounded-md bg-amber-500/10 flex items-center animate-pulse">
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin opacity-80" /> Saving...
                            </span></TooltipTrigger><TooltipContent><p>Auto-saving changes to server</p></TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {isWebSocketConnected && !isDirty && currentLayoutLoadedFromServerOrInitialized.current && (nodes.length > 0 || edges.length > 0) && (nodes[0]?.id !== PLACEHOLDER_NODE_ID || nodes.length > 1) &&( 
                        <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium py-1 px-1.5 rounded-md bg-green-500/10 flex items-center">
                                <Check className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Synced
                            </span></TooltipTrigger><TooltipContent><p>Layout synced with server</p></TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" title="Reset current layout to default placeholder" disabled={!isWebSocketConnected}>
                                <RotateCcw className="h-4 w-4 mr-1.5"/> Clear
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Reset SLD Layout?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to clear the canvas for "{layoutId.replace(/_/g, ' ')}"? This action will replace the current content with a default placeholder. This change will be saved.
                            </AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetLayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Reset Layout
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={handleManualSaveLayout} size="sm" variant="secondary" title="Manually save current SLD layout to server" disabled={!isWebSocketConnected}>Save Now</Button>
                    </div>
                )}
                {canEdit && layoutId && !isWebSocketConnected && !showConnectingMessage && currentLayoutLoadedFromServerOrInitialized.current && (
                 <div className="flex items-center gap-2 p-2.5 bg-background/80 backdrop-blur-sm border-border border rounded-bl-lg shadow-md">
                     <span className="text-xs text-destructive-foreground font-medium py-1.5 px-2.5 rounded-md bg-destructive/90 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" /> Offline: Saves Disabled
                    </span>
                 </div>
               )}
            </Panel>
        </ReactFlow>
      </div>
      {/* ... Dialogs as before ... */}
      {canEdit && selectedElement && ( <SLDInspectorDialog isOpen={isInspectorDialogOpen} onOpenChange={(open) => { setIsInspectorDialogOpen(open); if (!open) setSelectedElement(null);}} selectedElement={selectedElement} onUpdateElement={handleUpdateElement} onDeleteElement={handleDeleteElement}/> )}
      {!canEdit && selectedElement && (isNode(selectedElement) || isEdge(selectedElement)) && ( <SLDElementDetailSheet element={selectedElement} isOpen={isDetailSheetOpen} onOpenChange={(open) => { setIsDetailSheetOpen(open); if (!open) setSelectedElement(null);}} /> )}
      {isDrillDownOpen && drillDownLayoutId && ( <SLDDrillDownDialog isOpen={isDrillDownOpen} onOpenChange={(open) => { setIsDrillDownOpen(open); if (!open) { setDrillDownLayoutId(null); setSelectedElement(null); }}} layoutId={drillDownLayoutId} parentLabel={drillDownParentLabel} /> )}
    </motion.div>
  );
};

const SLDWidget: React.FC<SLDWidgetProps> = (props) => {
    return (
        <ReactFlowProvider>
            <SLDWidgetCore {...props} />
        </ReactFlowProvider>
    );
};

export default React.memo(SLDWidget);