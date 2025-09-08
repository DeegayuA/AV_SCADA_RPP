// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, ComponentType, KeyboardEvent as ReactKeyboardEvent } from 'react'; // Added ReactKeyboardEvent
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
ConnectionLineType, // Added ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cloneDeep, throttle } from 'lodash';
import { ChevronDown, Save, AlertTriangle, Check, Download, LayoutList, ListChecks, Loader2, RotateCcw, X, Upload, Zap } from 'lucide-react';
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
import { Input } from "@/components/ui/input";
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
import WindTurbineNode from './nodes/WindTurbineNode';
import WindInverterNode from './nodes/WindInverterNode';
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle } from 'lucide-react'; // Added PlusCircle
import RelayNode from './nodes/RelayNode';

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
    [SLDElementType.WindTurbine]: WindTurbineNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.WindInverter]: WindInverterNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.PLC]: PLCNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Sensor]: SensorNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Gauge]: GaugeNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Switch]: SwitchNode as unknown as ComponentType<NodeProps>,
    [SLDElementType.Relay]: RelayNode as unknown as ComponentType<NodeProps>,
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
  const [availableLayouts, setAvailableLayouts] = useState<Record<string, SLDLayout>>({});
  // Holds (id,name) list discovered from localStorage + constants for selection UI
  const [dynamicAvailableLayouts, setDynamicAvailableLayouts] = useState<{ id: string; name: string }[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedElement, setSelectedElement] = useState<CustomNodeType | CustomFlowEdge | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownLayoutId, setDrillDownLayoutId] = useState<string | null>(null);
  const [drillDownParentLabel, setDrillDownParentLabel] = useState<string | undefined>(undefined);
  const [isInspectorDialogOpen, setIsInspectorDialogOpen] = useState(false);
  const [isAddNewLayoutDialogOpen, setIsAddNewLayoutDialogOpen] = useState(false);
  const [newLayoutNameInput, setNewLayoutNameInput] = useState('');
  const [isControlPopupOpen, setIsControlPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [currentLayoutIdKey, setCurrentLayoutIdKey] = useState<string>('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); // For single layout import
  const [importJsonString, setImportJsonString] = useState('');         // For single layout import
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null); // For single layout import
  const fileInputRef = useRef<HTMLInputElement>(null);                 // For single layout import

  // New states for "Import All Layouts"
  const [isImportAllDialogOpen, setIsImportAllDialogOpen] = useState(false);
  const [importAllJsonString, setImportAllJsonString] = useState('');
  const [selectedAllFileName, setSelectedAllFileName] = useState<string | null>(null);
  const importAllFileInputRef = useRef<HTMLInputElement>(null);

  // State for new AnimationFlowConfiguratorDialog
  const [animationConfiguratorTarget, setAnimationConfiguratorTarget] = useState<{
    mode: AnimationFlowConfiguratorMode,
    edge?: CustomFlowEdge | null // For single edge mode
  } | null>(null);
  // No longer need isBulkAnimationConfiguratorOpen; use animationConfiguratorTarget.mode
  const [selectedEdgesForBulkConfig, setSelectedEdgesForBulkConfig] = useState<CustomFlowEdge[]>([]); // Replaced by direct use of selectedEdges

  const [activeGlobalAnimationSettings, setActiveGlobalAnimationSettings] =
    useState<GlobalSLDAnimationSettings | undefined>(undefined); // From types/sld.ts

  const currentLayoutLoadedFromServerOrInitialized = useRef(false);
  const canEdit = useMemo(() => !!isEditModeFromProps, [isEditModeFromProps]);
  const initialFitViewDone = useRef(false);
  const storeSelectedElement = useSelectedElementForDetails();
  const { setSelectedElementForDetails } = useAppStore.getState();

  const selectedNodesFromReactFlow = useMemo(() => nodes.filter(node => node.selected), [nodes]); // For UI button state
  const selectedEdgesFromReactFlow = useMemo(() => edges.filter(edge => edge.selected), [edges]);
  const clipboardNodesRef = useRef<CustomNodeType[]>([]);

  // <<< FIX START >>>
  // Create refs to hold the callbacks. This makes them stable across renders.
  const onCodeChangeRef = useRef(onCodeChange);
  const onLayoutIdChangePropRef = useRef(onLayoutIdChangeProp);

  // Use effects to keep the refs updated with the latest functions from props.
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);
  
  useEffect(() => {
    onLayoutIdChangePropRef.current = onLayoutIdChangeProp;
  }, [onLayoutIdChangeProp]);
  // <<< FIX END >>>


  const fetchAndSetAvailableLayouts = useCallback(() => {
    if (typeof window !== 'undefined') {
      const layoutsFromStorage: { id: string; name: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const layoutIdKey = key.substring(LOCAL_STORAGE_KEY_PREFIX.length);
          // Attempt to parse the layout to get a more descriptive name if available from meta, otherwise format the ID.
          let layoutName = layoutIdKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          try {
              const layoutJson = localStorage.getItem(key);
              if (layoutJson) {
                  const parsedLayout = JSON.parse(layoutJson) as SLDLayout;
                  if (parsedLayout.meta?.name) {
                      layoutName = parsedLayout.meta.name;
                  } else if (parsedLayout.layoutId && parsedLayout.layoutId !== layoutIdKey) {
                    // if meta.name is not present, but layoutId in content is different from key part
                    layoutName = `${layoutName} (${parsedLayout.layoutId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})`;
                  }
              }
          } catch (e) {
              console.warn(`Could not parse layout ${layoutIdKey} from localStorage to get meta.name`, e);
          }
          layoutsFromStorage.push({ id: layoutIdKey, name: layoutName });
        }
      }

      const layoutIdsFromStorage = new Set(layoutsFromStorage.map(l => l.id));
      const layoutsFromConstants: { id: string; name: string }[] = AVAILABLE_SLD_LAYOUT_IDS
        .filter(id => !layoutIdsFromStorage.has(id)) // Add only if not already found in storage
        .map(id => ({
          id,
          name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        }));

      const combinedLayouts = [...layoutsFromStorage, ...layoutsFromConstants];
      combinedLayouts.sort((a, b) => a.name.localeCompare(b.name));

      setDynamicAvailableLayouts(combinedLayouts);
    }
  }, []);


  const handleCreateNewLayout = useCallback(() => {
    if (!newLayoutNameInput.trim()) {
      toast.error("Layout name cannot be empty.");
      return;
    }

    const sanitizedLayoutId = newLayoutNameInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!sanitizedLayoutId) {
      toast.error("Invalid layout ID generated. Please use alphanumeric characters and spaces.");
      return;
    }

    const isNameTaken = availableLayouts[sanitizedLayoutId];
    if (isNameTaken) {
      toast.error(`Layout ID "${sanitizedLayoutId}" is already taken. Please choose a different name.`);
      return;
    }

    // Create new layout from empty_template
    const emptyTemplate = constantSldLayouts['empty_template'];
    if (!emptyTemplate) {
      toast.error("Empty template layout not found. Cannot create new layout.");
      return;
    }

    const newLayout: SLDLayout = cloneDeep(emptyTemplate);
    newLayout.layoutId = sanitizedLayoutId;
    if (newLayout.meta) {
      newLayout.meta.name = newLayoutNameInput.trim(); // User-friendly name
      newLayout.meta.description = `User created layout: ${newLayoutNameInput.trim()}`;
    } else {
      newLayout.meta = {
          name: newLayoutNameInput.trim(),
          description: `User created layout: ${newLayoutNameInput.trim()}`
      };
    }
    newLayout.nodes = [createPlaceholderNode(newLayout.meta.name || sanitizedLayoutId, currentThemeHookValue)];
    newLayout.edges = [];
    newLayout.viewport = { x: 0, y: 0, zoom: 1 };

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${newLayout.layoutId}`, JSON.stringify(newLayout));
      toast.success(`Layout "${newLayout.meta.name || newLayout.layoutId}" created successfully.`);

      fetchAndSetAvailableLayouts(); // Refresh the dropdown list

      if (onLayoutIdChangePropRef.current) {
          onLayoutIdChangePropRef.current(newLayout.layoutId);
      } else {
           if (layoutId !== newLayout.layoutId) {
              setCurrentLayoutIdKey(`sld_${newLayout.layoutId}`);
              setNodes(newLayout.nodes);
              setEdges(newLayout.edges);
              setActiveGlobalAnimationSettings(newLayout.meta?.globalAnimationSettings);
              setIsDirty(false);
              currentLayoutLoadedFromServerOrInitialized.current = true;
              initialFitViewDone.current = false;
           }
      }

      if (isWebSocketConnected && sendJsonMessage) {
        sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${newLayout.layoutId}`, layout: newLayout } });
        toast.info("Syncing new layout to server...");
      }

      setIsAddNewLayoutDialogOpen(false);
      setNewLayoutNameInput('');
    } catch (error) {
      console.error("Error creating new layout:", error);
      toast.error("Failed to create new layout.");
    }
  }, [newLayoutNameInput, dynamicAvailableLayouts, currentThemeHookValue, fetchAndSetAvailableLayouts, isWebSocketConnected, sendJsonMessage, layoutId]);


  useEffect(() => {
    fetchAndSetAvailableLayouts();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        fetchAndSetAvailableLayouts();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAndSetAvailableLayouts]);

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

  const handleDeleteElement = useCallback((elementOrId: CustomNodeType | CustomFlowEdge | string): void => {
    if (!canEdit) return;
    const elementId = typeof elementOrId === 'string' ? elementOrId : elementOrId.id;

    setNodes((nds) => nds.filter((node) => node.id !== elementId));
    setEdges((eds) => eds.filter((edge) => edge.id !== elementId && edge.source !== elementId && edge.target !== elementId));
    setIsDirty(true); setSelectedElement(null); setIsInspectorDialogOpen(false);
    initialFitViewDone.current = false;
  }, [canEdit]);

  const handleInternalLayoutSelect = useCallback((newLayoutId: string) => {
    if (newLayoutId !== layoutId && onLayoutIdChangePropRef.current) {
      if (isDirty) toast("Unsaved Changes", {
          description: "Discard unsaved changes to switch layouts?",
          action: { label: "Discard & Switch", onClick: () => { setIsDirty(false); onLayoutIdChangePropRef.current!(newLayoutId); }},
          cancel: { label: "Stay", onClick: () => {} }, duration: Infinity });
      else onLayoutIdChangePropRef.current(newLayoutId);
    }
  }, [layoutId, isDirty]);

  const handleResetLayout = useCallback(() => {
    if (!canEdit || !layoutId) return;
    setNodes([createPlaceholderNode(layoutId, currentThemeHookValue)]);
    setEdges([]); setIsDirty(true);
    setActiveGlobalAnimationSettings(undefined); // Also reset global animation settings for this layout
    toast.success("Layout Cleared", { description: "Canvas reset. Save to persist." });
    initialFitViewDone.current = false;
  const persistLayout = useCallback(
    (
      nodesToSave: CustomNodeType[],
      edgesToSave: CustomFlowEdge[],
      rfInstance: ReactFlowInstance | null,
      currentLayoutId: string,
      manualSave: boolean
    ) => {
      if (!canEdit || !currentLayoutId) return false;
      const nodesForStorage = nodesToSave.filter(n => n.id !== PLACEHOLDER_NODE_ID);
      const viewport = rfInstance ? rfInstance.getViewport() : undefined;
      const layoutKey = `${LOCAL_STORAGE_KEY_PREFIX}${currentLayoutId}`;

      let currentMeta: SLDLayout['meta'] = {};
      try {
        const existingLayoutString = localStorage.getItem(layoutKey);
        if (existingLayoutString) {
          const parsedExisting = JSON.parse(existingLayoutString) as SLDLayout;
          currentMeta = parsedExisting.meta || {};
        }
      } catch (e) {
        console.warn(`Error parsing existing layout meta from localStorage for key ${layoutKey}:`, e);
      }

      const layoutToPersist: SLDLayout = {
        layoutId: currentLayoutId,
        nodes: nodesForStorage.map(n => ({ ...n, data: { ...n.data } })),
        edges: edgesToSave.map(e => ({ ...e, data: { ...e.data } })),
        viewport,
        meta: {
          ...currentMeta,
          globalAnimationSettings: activeGlobalAnimationSettings
        }
      };
      const layoutJsonString = JSON.stringify(layoutToPersist);

      try {
        localStorage.setItem(layoutKey, layoutJsonString);
        if (manualSave) toast.success("Layout Saved Locally");
      } catch (error) {
        console.error(`PersistLayout: Error saving to LS:`, error);
        if (manualSave) toast.error("Local Save Failed");
      }

      if (onCodeChangeRef.current) {
        onCodeChangeRef.current(layoutJsonString, currentLayoutId);
      }

      if (isWebSocketConnected && sendJsonMessage) {
        sendJsonMessage({
          type: 'save-sld-widget-layout',
            payload: { key: `sld_${currentLayoutId}`, layout: layoutToPersist }
        });
        if (manualSave) toast.info("Syncing to Server...", { id: `save-pending-${currentLayoutId}` });
        return true;
      } else {
        if (manualSave && isWebSocketConnected === false) toast.warning("Offline: Server Sync Skipped");
        return true;
      }
    },
    [canEdit, isWebSocketConnected, sendJsonMessage, activeGlobalAnimationSettings]
  );
  }, [canEdit, isWebSocketConnected, sendJsonMessage, activeGlobalAnimationSettings]);

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

  const handleImportLayout = useCallback((jsonStringToImport: string) => {
    if (!canEdit || !layoutId || !reactFlowInstance) {
      toast.error("Import cannot be performed at this time.");
      return;
    }

    if (!jsonStringToImport.trim()) {
        toast.error("Import content is empty.", { description: "Please paste JSON or select a file." });
        return;
    }

    try {
      const parsedLayout = JSON.parse(jsonStringToImport) as SLDLayout;

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

      toast.success("Layout Imported Successfully", { description: `Content from '${selectedFileName || 'pasted text'}' imported into layout '${layoutId.replace(/_/g, ' ')}'.` });
      setIsImportDialogOpen(false); // This will trigger onOpenChange to clear states
      setImportJsonString(''); // Moved to onOpenChange
      setSelectedFileName(null); // Moved to onOpenChange

    } catch (error: any) {
      console.error("Error importing SLD layout:", error);
      toast.error("Import Failed", { description: error.message || "Could not parse or apply JSON." });
    }
  }, [canEdit, layoutId, reactFlowInstance, persistLayout, removePlaceholderIfNeeded, fitViewOptions.duration, selectedFileName]);

  const handleFileSelectedForImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          if (fileContent) {
            setImportJsonString(fileContent);
            toast.success(`File "${file.name}" loaded for import.`);
          } else {
            throw new Error("File content is empty or unreadable.");
          }
        } catch (err: any) {
            console.error("Error reading file content:", err);
            toast.error("Error Reading File", { description: err.message || "Could not read file content."});
            setSelectedFileName(null);
            setImportJsonString(''); // Clear if file reading failed
        }
      };
      reader.onerror = () => {
        console.error("FileReader error for SLD import.");
        toast.error("File Read Error", { description: "An error occurred while reading the file." });
        setSelectedFileName(null);
        setImportJsonString('');
      };
      reader.readAsText(file);
    } else {
      setSelectedFileName(null);
      // Optionally, clear importJsonString if you want 'cancel' in file dialog to clear text area
      setImportJsonString('');
    }
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelectedForAllImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAllFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          if (fileContent) {
            setImportAllJsonString(fileContent);
            toast.success(`File "${file.name}" loaded for "Import All".`);
          } else {
            throw new Error("File content is empty or unreadable.");
          }
        } catch (err: any) {
            console.error("Error reading file content for all layouts import:", err);
            toast.error("Error Reading File", { description: err.message || "Could not read file content."});
            setSelectedAllFileName(null);
            setImportAllJsonString('');
        }
      };
      reader.onerror = () => {
        console.error("FileReader error for all layouts SLD import.");
        toast.error("File Read Error", { description: "An error occurred while reading the file." });
        setSelectedAllFileName(null);
        setImportAllJsonString('');
      };
      reader.readAsText(file);
    } else {
      setSelectedAllFileName(null);
    }
    if (importAllFileInputRef.current) {
      importAllFileInputRef.current.value = '';
    }
  };

  const handleImportAllLayouts = useCallback((jsonStringToImportAll: string) => {
    if (!canEdit) {
      toast.error("Import is only available in edit mode.");
      return;
    }
    if (!jsonStringToImportAll.trim()) {
      toast.error("Import content is empty.", { description: "Please paste JSON or select a file for all layouts." });
      return;
    }

    let parsedAllLayouts: Record<string, SLDLayout>;
    try {
      parsedAllLayouts = JSON.parse(jsonStringToImportAll);
      if (typeof parsedAllLayouts !== 'object' || parsedAllLayouts === null) {
        throw new Error("Input is not a valid JSON object.");
      }
    } catch (error: any) {
      console.error("Error parsing all SLD layouts JSON:", error);
      toast.error("Invalid JSON for All Layouts", { description: error.message || "Could not parse JSON object." });
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let currentLayoutWasAffected = false;

    for (const key in parsedAllLayouts) {
      if (Object.prototype.hasOwnProperty.call(parsedAllLayouts, key)) {
        const layoutData = parsedAllLayouts[key];
        // Basic validation for each layout
        if (
          layoutData &&
          typeof layoutData.layoutId === 'string' &&
          layoutData.layoutId === key && // Ensure the key matches the layoutId within the object
          Array.isArray(layoutData.nodes) &&
          Array.isArray(layoutData.edges)
          // Add more checks if necessary, e.g., for viewport, meta
        ) {
          try {
            const localStorageKey = `${LOCAL_STORAGE_KEY_PREFIX}${layoutData.layoutId}`;
            localStorage.setItem(localStorageKey, JSON.stringify(layoutData));
            successCount++;
            if (layoutData.layoutId === layoutId) {
              currentLayoutWasAffected = true;
            }
          } catch (storageError: any) {
            console.error(`Error saving layout ${layoutData.layoutId} to localStorage:`, storageError);
            errorCount++;
          }
        } else {
          console.warn(`Invalid or incomplete layout data for key: ${key}. Skipping.`);
          errorCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} layout(s) imported successfully.`);
    }
    if (errorCount > 0) {
      toast.warning(`${errorCount} layout(s) could not be imported or had invalid data.`);
    }
    if (successCount === 0 && errorCount === 0) {
      toast.info("No layouts found in the provided JSON to import.");
    }

    if (currentLayoutWasAffected) {
      toast.info("Current Layout Updated", {
        description: "The currently active layout was updated. Please re-select or refresh the page to see the changes.",
        duration: 8000,
        action: {
            label: "Reload View",
            onClick: () => {
                if (onLayoutIdChangePropRef.current && layoutId) {
                    onLayoutIdChangePropRef.current(layoutId);
                }
            }
        }
      });
    }
    setIsImportAllDialogOpen(false); // This will trigger onOpenChange to clear states
  }, [canEdit, layoutId, currentThemeHookValue]);


  const handleExportSingleLayout = useCallback(() => {
    if (!canEdit || !layoutId) {
      toast.error("Export is only available in edit mode with a selected layout.");
      return;
    }

    const layoutToExport = availableLayouts[layoutId];
    if (!layoutToExport) {
      toast.info(`Layout '${layoutId.replace(/_/g, ' ')}' not found or is empty.`);
      return;
    }

    try {
      const layoutDataString = JSON.stringify(layoutToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(layoutDataString);
      const exportFileDefaultName = `${layoutId}_sld_layout_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      toast.success(`Layout '${layoutId.replace(/_/g, ' ')}' exported successfully.`);
    } catch (error) {
      console.error("SLDWidget: Error during single layout export:", error);
      toast.error("Failed to export layout.");
    }
  }, [canEdit, layoutId, availableLayouts]);

  const handleExportAllLayouts = useCallback(() => {
    if (!canEdit) {
      toast.error("Export is only available in edit mode.");
      return;
    }

    const allLayouts: Record<string, SLDLayout> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as SLDLayout;
            if (parsed?.layoutId) {
              allLayouts[parsed.layoutId] = parsed;
            }
          }
        } catch {
          /* ignore invalid */
        }
      }
    }

    AVAILABLE_SLD_LAYOUT_IDS.forEach(id => {
      if (!allLayouts[id] && constantSldLayouts[id]) {
        allLayouts[id] = JSON.parse(JSON.stringify(constantSldLayouts[id]));
      }
    });

    if (Object.keys(allLayouts).length === 0) {
      toast.info("No layouts available to export.");
      return;
    }

    try {
      const json = JSON.stringify(allLayouts, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
      const exportFileDefaultName = `all_sld_layouts_${new Date().toISOString().split('T')[0]}.json`;
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("All layouts exported successfully.");
    } catch (error) {
      console.error("SLDWidget: Error during all layouts export:", error);
      toast.error("Failed to export all layouts.");
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
      if (onCodeChangeRef.current) {
          onCodeChangeRef.current(JSON.stringify(loadedLayout), layoutId);
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
        if (onCodeChangeRef.current) {
            onCodeChangeRef.current(JSON.stringify({ layoutId, nodes: [], edges: [], viewport: undefined, meta: { globalAnimationSettings: undefined } }), layoutId);
        }
    } else {
        setNodes([createPlaceholderNode(layoutId + " (Connecting...)", currentThemeHookValue)]); setEdges([]);
        setActiveGlobalAnimationSettings(undefined);
        setIsLoading(true);
    }
  }, [layoutId, currentLayoutIdKey, isEditModeFromProps, isWebSocketConnected, sendJsonMessage, currentThemeHookValue, reactFlowInstance]);


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
  }, [nodes, edges, reactFlowInstance, isLoading, layoutId, fitViewOptions, availableLayouts]);

  useEffect(() => {
    if (!lastJsonMessage || !currentLayoutIdKey) return;
    const message = lastJsonMessage as WebSocketMessageFromServer;
    if (message.payload?.key && message.payload.key !== currentLayoutIdKey && (message.type === 'layout-data' || message.type === 'layout-error')) return;
    const localLayoutId = layoutId;
    switch (message.type) {
      case 'all-sld-layouts':
        setAvailableLayouts(message.payload as unknown as Record<string, SLDLayout>);
        break;
      case 'layout-data':
        if (message.payload?.key !== currentLayoutIdKey) return;
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
            if (onCodeChangeRef.current) onCodeChangeRef.current(serverLayoutString, serverLayout.layoutId);

        } else {
            const emptyLayoutNodes = isEditModeFromProps && localLayoutId ? [createPlaceholderNode(localLayoutId, currentThemeHookValue)] : (localLayoutId ? [createPlaceholderNode(localLayoutId + " (Not Found)", currentThemeHookValue)] : []);
            setNodes(emptyLayoutNodes);
            setEdges([]);
            setActiveGlobalAnimationSettings(undefined);
            if (onCodeChangeRef.current && localLayoutId) {
                onCodeChangeRef.current(JSON.stringify({layoutId: localLayoutId, nodes: [], edges:[], viewport: undefined, meta: {globalAnimationSettings: undefined} }), localLayoutId);
            }
        }
        setIsDirty(false); break;
      case 'layout-error':
        if (message.payload?.key !== currentLayoutIdKey) return;
        setIsLoading(false); currentLayoutLoadedFromServerOrInitialized.current = true;
        initialFitViewDone.current = false;
        if (localLayoutId) setNodes([createPlaceholderNode(localLayoutId + " (Error)", currentThemeHookValue)]);
        else setNodes([]);
        setEdges([]);
        setActiveGlobalAnimationSettings(undefined);
        toast.error("Server Load Error", { description: message.payload.error || "Failed." });
        if (onCodeChangeRef.current && localLayoutId) {
            onCodeChangeRef.current(JSON.stringify({layoutId: localLayoutId, nodes: [], edges:[], viewport: undefined, meta: {globalAnimationSettings: undefined} }), localLayoutId);
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
  }, [lastJsonMessage, currentLayoutIdKey, isEditModeFromProps, layoutId, currentThemeHookValue, removePlaceholderIfNeeded, reactFlowInstance]);

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

  const handleCopy = useCallback(() => {
    if (!canEdit) return;
    const selectedNodesToCopy = nodes.filter(node => node.selected && node.id !== PLACEHOLDER_NODE_ID);
    if (selectedNodesToCopy.length === 0) {
      return;
    }

    clipboardNodesRef.current = selectedNodesToCopy.map(node => ({
      ...node,
      data: cloneDeep(node.data),
      id: `original_${node.id}`,
      selected: false,
      dragging: false,
    }));
    toast.info(`Copied ${selectedNodesToCopy.length} node(s) to clipboard.`);
  }, [canEdit, nodes]);

  const handlePaste = useCallback(() => {
    if (!canEdit || clipboardNodesRef.current.length === 0) {
      if (canEdit && clipboardNodesRef.current.length === 0) {
        toast.info("Clipboard is empty.");
      }
      return;
    }

    const newPastedNodes: CustomNodeType[] = clipboardNodesRef.current.map((copiedNode, index) => {
      const nodeType = copiedNode.type || SLDElementType.GenericDevice; // Fallback type
      const newId = `${nodeType}_${+new Date()}_${Math.random().toString(36).substring(2, 6)}_${index}`;
      const newPosition = {
        x: copiedNode.position.x + 20 + (index * 10),
        y: copiedNode.position.y + 20 + (index * 10),
      };

      return {
        ...copiedNode,
        id: newId,
        position: newPosition,
        selected: true,
        dragging: false,
        data: cloneDeep(copiedNode.data),
        positionAbsolute: undefined,
      };
    });

    setNodes((currentNodes) => {
      const deselectedNodes = currentNodes.map(n => ({ ...n, selected: false }));
      return removePlaceholderIfNeeded([...deselectedNodes, ...newPastedNodes]);
    });

    setIsDirty(true);
    toast.success(`Pasted ${newPastedNodes.length} node(s).`);
    initialFitViewDone.current = false;
    setNodes(nds => nds.map(n => ({...n, selected: newPastedNodes.some(pn => pn.id === n.id) })));

  }, [canEdit, removePlaceholderIfNeeded]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canEdit || !reactFlowWrapper.current || !reactFlowWrapper.current.contains(document.activeElement)) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable) {
        return;
      }
      
      const isCmdCtrl = event.ctrlKey || event.metaKey;

      if (isCmdCtrl && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        handleCopy();
      } else if (isCmdCtrl && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        handlePaste();
      }
    };

    const wrapperElement = reactFlowWrapper.current;
    wrapperElement?.addEventListener('keydown', handleKeyDown);

    return () => {
      wrapperElement?.removeEventListener('keydown', handleKeyDown);
    };
  }, [canEdit, handleCopy, handlePaste]);


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
    }
  }, [storeSelectedElement, canEdit, isControlPopupOpen]);

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

  const handleConfigureGlobalAnimationSettings = useCallback(() => {
    setAnimationConfiguratorTarget({ mode: 'global' });
  }, []);

  const edgesWithGlobalAndSpecificSettings = useMemo(() => {
    return edges.map(edge => {
      let resolvedAnimSettings = edge.data?.animationSettings; // Specific settings on edge

      if (
        activeGlobalAnimationSettings?.isEnabled !== false && // Global is ON or undefined (assume ON)
        (!resolvedAnimSettings || resolvedAnimSettings.animationType === 'none') && // Edge is 'none' or no settings
        activeGlobalAnimationSettings?.animationType && // Global has a type
        activeGlobalAnimationSettings.animationType !== 'none' // Global type is not 'none'
      ) {
        resolvedAnimSettings = {
          ...activeGlobalAnimationSettings,
        };
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          animationSettings: resolvedAnimSettings,
          globallyInvertDefaultFlowForAllEdges: (activeGlobalAnimationSettings as any)?.globallyInvertDefaultFlowForAllEdges ?? false,
        }
      };
    });
  }, [edges, activeGlobalAnimationSettings]);


  const showInitialLoadingSpinner = isLoading && !currentLayoutLoadedFromServerOrInitialized.current;
  const showConnectingMessage = !isWebSocketConnected && layoutId && showInitialLoadingSpinner && !isEditModeFromProps;
  const showDisconnectedMessageForEdit = canEdit && layoutId && !isWebSocketConnected && currentLayoutLoadedFromServerOrInitialized.current;
  const showPromptToSelectLayout = !layoutId && canEdit && onLayoutIdChangePropRef.current !== undefined;

  if (showConnectingMessage) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Connecting...</div>);
  if (showInitialLoadingSpinner) return (<div className="sld-loader-container text-muted-foreground"><svg className="sld-loader-svg" viewBox="0 0 50 50"><circle className="sld-loader-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>Loading Diagram{layoutId ? ` for ${layoutId.replace(/_/g, ' ')}...` : '...'}</div>);
  if (showPromptToSelectLayout) return (<div className="sld-loader-container text-muted-foreground flex-col"> <LayoutList className="h-12 w-12 mb-4 opacity-50"/><p className="text-lg font-semibold mb-2">Select Layout</p><p className="text-sm mb-4">Choose a layout to get started.</p>{onLayoutIdChangePropRef.current !== undefined && (<Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''}><SelectTrigger className="w-[280px] mb-2"><SelectValue placeholder="Select layout..." /></SelectTrigger><SelectContent>{dynamicAvailableLayouts.map(layout => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent></Select>)}</div>);
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
      {canEdit && onLayoutIdChangePropRef.current && (
          <div className="absolute bottom-0 right-0 z-20 bg-background/80 backdrop-blur-sm p-1.5 rounded-md shadow-md border flex items-center gap-2"> {/* Changed left-3 to left-64 */}
            <Select onValueChange={handleInternalLayoutSelect} value={layoutId || ''} disabled={!layoutId && dynamicAvailableLayouts.length === 0}>
              <SelectTrigger className="h-9 text-xs min-w-[12rem]"> {/* Added min-w */}
                <div className="flex items-center">
                  <LayoutList className="h-3.5 w-3.5 mr-1.5 opacity-70"/>
                  <SelectValue placeholder="Switch Layout..." />
                </div>
              </SelectTrigger>
              <SelectContent>{Object.values(availableLayouts).map(layout => (<SelectItem key={layout.layoutId} value={layout.layoutId} className="text-xs">{layout.meta?.name || layout.layoutId}</SelectItem>))}</SelectContent>
            </Select>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      setNewLayoutNameInput(''); // Reset input field
                      setIsAddNewLayoutDialogOpen(true);
                    }}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add New SLD Layout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
             <AlertDialog>
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="h-9" disabled={!layoutId}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete current layout</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete SLD Layout?</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete the layout "{layoutId}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => sendJsonMessage({ type: 'delete-sld-layout', payload: { key: `sld_${layoutId}` } })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
            connectionLineType={ConnectionLineType.Step} // Added connectionLineType
            connectionRadius={35}
            minZoom={0.05} maxZoom={4}
          >
            <Controls showInteractive={canEdit} />
              <MiniMap pannable zoomable nodeColor={themedNodeColor} nodeStrokeColor={themedNodeStrokeColor} nodeStrokeWidth={3} nodeBorderRadius={4}
                style={{
                  backgroundColor: colors.miniMapBg,
                  border: `1px solid ${colors.miniMapBorder}`,
                  width: 120, // Reduced width
                  height: 90,  // Reduced height
                }}
                position="top-right"
                maskColor={colors.maskBg}
                maskStrokeColor={colors.maskStroke}
                />
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color={colors.backgroundDots} className="opacity-60" />

            <Panel position="top-right" className="!m-0 !p-0">
                {canEdit && layoutId && (
                    <motion.div className="flex flex-wrap items-center gap-2 p-2.5 bg-background/80 backdrop-blur-sm border-border border rounded-bl-lg shadow-lg"
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
                      {/* Clear Button */}
                        <AlertDialog>
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="h-9" disabled={isEffectivelyEmpty && !isDirty && currentLayoutLoadedFromServerOrInitialized.current}>
                                                <RotateCcw className="h-4 w-4 md:mr-1.5"/> <span className="hidden md:inline">Clear</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Clear current layout. This action is permanent for this session unless manually saved.</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Reset SLD Layout?</AlertDialogTitle>
                                <AlertDialogDescription>Clear "{layoutId?.replace(/_/g, ' ')}"? This replaces content with a placeholder and clears global animation settings for this layout. Changes saved via auto/manual save.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetLayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> Reset </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                      {/* Save Now Button */}
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleManualSaveLayout} size="sm" variant="secondary" className="h-9" disabled={!isDirty && !isEffectivelyEmpty && currentLayoutLoadedFromServerOrInitialized.current }>
                                        <Save className="h-4 w-4 md:mr-1.5" />
                                        <span className="hidden md:inline">Save Now</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save Now & Sync</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                      {/* Export Dropdown */}
                      <DropdownMenu>
                          <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="outline" disabled={!canEdit} className="h-9">
                                              <Download className="h-4 w-4 md:mr-1.5" />
                                              <span className="hidden md:inline">Export</span>
                                              <ChevronDown className="h-4 w-4 ml-1 md:ml-1.5 opacity-70" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Export SLD layouts</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                          <DropdownMenuContent align="end" className="w-60">
                              <DropdownMenuItem onClick={handleExportSingleLayout} disabled={!layoutId} className="text-xs cursor-pointer">
                                  Export Current Layout
                                  {layoutId && <span className="ml-auto text-muted-foreground pl-2 truncate max-w-[120px]">({layoutId.replace(/_/g, ' ')})</span>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportAllLayouts} className="text-xs cursor-pointer">
                                  Export All Local Layouts
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Import Dropdown */}
                      <DropdownMenu>
                          <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="outline" disabled={!canEdit} className="h-9">
                                              <Upload className="h-4 w-4 md:mr-1.5" />
                                              <span className="hidden md:inline">Import</span>
                                              <ChevronDown className="h-4 w-4 ml-1 md:ml-1.5 opacity-70" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Import SLD layouts</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                          <DropdownMenuContent align="end" className="w-60">
                              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} disabled={!layoutId} className="text-xs cursor-pointer">
                                  Import to Current Layout
                                  {layoutId && <span className="ml-auto text-muted-foreground pl-2 truncate max-w-[120px]">({layoutId.replace(/_/g, ' ')})</span>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIsImportAllDialogOpen(true)} className="text-xs cursor-pointer">
                                  Import All to Local
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Bulk Anim Button */}
                      <TooltipProvider delayDuration={100}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canEdit || selectedEdgesFromReactFlow.length === 0}
                                      onClick={handleOpenBulkAnimationConfigurator}
                                      className="h-9"
                                  >
                                      <ListChecks className="h-4 w-4 md:mr-1.5" />
                                      <span className="hidden md:inline">Bulk Anim</span>
                                      {selectedEdgesFromReactFlow.length > 0 && (
                                          <span className="ml-1.5 hidden md:inline text-xs px-1 py-0.5 bg-muted text-muted-foreground rounded">
                                              {selectedEdgesFromReactFlow.length}
                                          </span>
                                      )}
                                </Button>
                            </TooltipTrigger>
                              <TooltipContent><p>Bulk Configure Edge Animations {selectedEdgesFromReactFlow.length > 0 ? ` (${selectedEdgesFromReactFlow.length} selected)` : ' (No edges selected)'}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </motion.div>
                )}
            </Panel>
        </ReactFlow>
      </div>

      {canEdit && layoutId && (
        <AlertDialog
            open={isImportDialogOpen}
            onOpenChange={(open) => {
                setIsImportDialogOpen(open);
                if (!open) { // Reset states when dialog is closed
                    setImportJsonString('');
                    setSelectedFileName(null);
                }
            }}
        >
            <AlertDialogContent className="max-w-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Import SLD Layout from JSON</AlertDialogTitle>
                    <AlertDialogDescription>
                        Paste JSON below, or upload a .json file. This will overwrite layout '{layoutId.replace(/_/g, ' ')}'.
                        Imported global animation settings will apply.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Paste SLDLayout JSON here..."
                        value={importJsonString}
                        onChange={(e) => {
                            setImportJsonString(e.target.value);
                            if (selectedFileName) setSelectedFileName(null); // Clear file name if user types
                        }}
                        className="min-h-[150px] max-h-[300px] text-xs font-mono"
                        aria-label="SLD Layout JSON Input"
                    />
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            id="import-single-file-input"
                            ref={fileInputRef}
                            onChange={handleFileSelectedForImport}
                            className="sr-only"
                            aria-label="Upload JSON file for current layout"
                            title="Select a JSON file to import into current layout"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full sm:w-auto"
                        >
                            <Upload className="h-4 w-4 mr-2"/> Upload .json File
                        </Button>
                        {selectedFileName && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Selected file: <span className="font-medium">{selectedFileName}</span>
                            </p>
                        )}
                         {importJsonString && !selectedFileName && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Content source: <span className="font-medium">Pasted Text</span>
                            </p>
                        )}
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleImportLayout(importJsonString)} disabled={!importJsonString.trim()}>
                        Import
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog for Importing ALL Layouts */}
      {canEdit && (
        <AlertDialog
            open={isImportAllDialogOpen}
            onOpenChange={(open) => {
                setIsImportAllDialogOpen(open);
                if (!open) {
                    setImportAllJsonString('');
                    setSelectedAllFileName(null);
                }
            }}
        >
            <AlertDialogContent className="max-w-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Import All SLD Layouts from JSON</AlertDialogTitle>
                    <AlertDialogDescription>
                        Paste JSON for multiple layouts (e.g., {"{\"layout_1\":{...}, \"layout_2\":{...}}"}) or upload a file.
                        This will overwrite existing layouts in localStorage with matching IDs.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Paste JSON for all layouts here..."
                        value={importAllJsonString}
                        onChange={(e) => {
                            setImportAllJsonString(e.target.value);
                            if (selectedAllFileName) setSelectedAllFileName(null);
                        }}
                        className="min-h-[150px] max-h-[300px] text-xs font-mono"
                    />
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            id="import-all-layouts-file-input"
                            ref={importAllFileInputRef}
                            onChange={handleFileSelectedForAllImport}
                            className="sr-only"
                            aria-label="Upload JSON file for all layouts"
                            title="Select a JSON file to import all layouts"
                            style={{ display: 'none' }}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => importAllFileInputRef.current?.click()}
                            className="w-full sm:w-auto"
                        >
                            <Upload className="h-4 w-4 mr-2" /> Upload .json File (All Layouts)
                        </Button>
                        {selectedAllFileName && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Selected file: <span className="font-medium">{selectedAllFileName}</span>
                            </p>
                        )}
                        {importAllJsonString && !selectedAllFileName && (
                             <p className="text-xs text-muted-foreground mt-2">
                                Content source: <span className="font-medium">Pasted Text</span>
                            </p>
                        )}
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleImportAllLayouts(importAllJsonString)} disabled={!importAllJsonString.trim()}>
                        Import All
                    </AlertDialogAction>
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
            onDeleteElement={(element) => {
              if (typeof element === 'string') {
                handleDeleteElement(element);
              } else if (element && typeof element === 'object' && 'id' in element) {
                handleDeleteElement((element as any).id);
              }
            }}
            onSetGlobalAnimationSettings={handleConfigureGlobalAnimationSettings}
            onConfigureEdgeAnimation={(edgeToConfig) => {
                setAnimationConfiguratorTarget({ mode: 'single_edge', edge: edgeToConfig});
            }}
            currentGlobalAnimationSettings={activeGlobalAnimationSettings}
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
    availableDataPoints={Object.values(appDataPoints).map(dp => ({
      ...dp,
      icon: typeof dp.icon === 'string' ? undefined : dp.icon
    }))}
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
        };

        // Add the global invert flag if the property exists in the type
        if (setGlobalInvertFlag !== undefined) {
          (newGlobalSettings as any).globallyInvertDefaultFlowForAllEdges = setGlobalInvertFlag;
        }
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

    {/* Add New Layout Dialog */}
    {canEdit && (
      <AlertDialog open={isAddNewLayoutDialogOpen} onOpenChange={setIsAddNewLayoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New SLD Layout</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new layout. It will be used to generate a unique ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Substation Alpha Line 1"
              value={newLayoutNameInput}
              onChange={(e) => setNewLayoutNameInput(e.target.value)}
              autoFocus
            />
            {newLayoutNameInput.trim() && (
                <p className="text-xs text-muted-foreground mt-2">
                    Generated ID: <span className="font-mono">{newLayoutNameInput.trim().toLowerCase().replace(/\s+/g, '_')}</span>
                </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewLayoutNameInput('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNewLayout} disabled={!newLayoutNameInput.trim()}>
              Create Layout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
function persistLayout(
  nodes: CustomNodeType[],
  edges: CustomFlowEdge[],
  reactFlowInstance: ReactFlowInstance | null,
  layoutId: string,
  manualSave: boolean
): boolean {
  if (!layoutId) return false;

  try {
    // Filter out placeholder node (if any)
    const nodesToSave = nodes.filter(n => n.id !== PLACEHOLDER_NODE_ID);

    // Preserve existing meta (if any) so we do not wipe user-friendly name/description
    const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${layoutId}`;
    let existingMeta: SLDLayout['meta'] = {};
    try {
      const existingRaw = localStorage.getItem(storageKey);
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw) as SLDLayout;
        if (parsed && typeof parsed === 'object' && parsed.meta) {
          existingMeta = parsed.meta;
        }
      }
    } catch {
      /* ignore meta parse errors */
    }

    const viewport = reactFlowInstance ? reactFlowInstance.getViewport() : undefined;

    const layoutToPersist: SLDLayout = {
      layoutId,
      nodes: nodesToSave.map(n => ({ ...n, selected: false })), // strip selection state
      edges: edges.map(e => ({ ...e, selected: false })),
      viewport,
      meta: existingMeta, // globalAnimationSettings (if any) is preserved inside meta
    };

    localStorage.setItem(storageKey, JSON.stringify(layoutToPersist));

    if (manualSave) {
      try {
        // Optional: lightweight user feedback without relying on component scope
        // (toast may not be available here if refactoring later)
        // @ts-ignore
        if (typeof toast?.success === 'function') toast.success('Layout Saved Locally');
      } catch {
        /* ignore toast issues */
      }
    }

    return true;
  } catch (err) {
    if (manualSave) {
      try {
        // @ts-ignore
        if (typeof toast?.error === 'function') toast.error('Failed to save layout');
      } catch { /* ignore */ }
    }
    console.error('persistLayout: error persisting layout', err);
    return false;
  }
}
