// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  Node,
  Edge,
  Connection,
  addEdge,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  SelectionMode,
  PanOnScrollMode,
  isNode,
  isEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useShallow } from 'zustand/react/shallow';

// *** Updated type import ***
// Make sure SLDWidgetProps in @/types/sld includes isEditMode
import {
  SLDWidgetProps, // This MUST include `isEditMode?: boolean;`
  SLDLayout,
  CustomNodeType,
  CustomFlowEdge,
  CustomNodeData,
  SLDElementType,
  CustomFlowEdgeData,
  PaletteComponent,
  CurrentUser
} from '@/types/sld';

// Import Custom Nodes
import DataLabelNode from './nodes/DataLabelNode';
import TextLabelNode from './nodes/TextLabelNode';
import InverterNode from './nodes/InverterNode';
import PanelNode from './nodes/PanelNode';

// Import Custom Edges
import AnimatedFlowEdge from './edges/AnimatedFlowEdge';

// Import UI Components
import SLDElementPalette from './ui/SLDElementPalette';
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementDetailSheet from './ui/SLDElementDetailSheet';
import { useAppStore } from '@/stores/appStore'; // Keep for currentUser
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { Button } from '@/components/ui/button';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';
import { USER } from '@/config/constants';
import { toast } from 'sonner';

// Define Node Types Mapping
const nodeTypes: NodeTypes = {
  [SLDElementType.DataLabel]: DataLabelNode,
  [SLDElementType.TextLabel]: TextLabelNode,
  [SLDElementType.Inverter]: InverterNode,
  [SLDElementType.Panel]: PanelNode,
};

// Define Edge Types Mapping
const edgeTypes: EdgeTypes = {
  animatedFlow: AnimatedFlowEdge,
};

// Default edge options
const defaultEdgeOptions = {
  type: 'animatedFlow',
  animated: true,
  style: { strokeWidth: 3, stroke: '#00f' },
};

// Renamed to avoid conflict with the wrapper component name
const SLDWidgetCore: React.FC<SLDWidgetProps> = ({ layoutId, isEditMode: isMasterEditMode }) => { // Accept the master prop
  const { sendJsonMessage, lastJsonMessage, isConnected } = useWebSocket();

  // Get currentUser for permission check
  const { currentUser } = useAppStore(
    useShallow((state) => ({ currentUser: state.currentUser })) // Only need currentUser now
  );

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

  const { project } = useReactFlow();

  // *** MODIFIED: Use the passed prop for canEdit calculation ***
  const canEdit = useMemo(() => isMasterEditMode && currentUser?.role === USER, [isMasterEditMode, currentUser]);

  // --- Data Loading ---
  useEffect(() => {
    if (layoutId && sendJsonMessage && isConnected) {
      console.log(`SLDWidget: Requesting layout for: sld_${layoutId} (WebSocket connected)`);
      setIsLoading(true);
      setSelectedElement(null);
      setIsInspectorDialogOpen(false);
      setIsDetailSheetOpen(false);
      setIsDrillDownOpen(false);
      setDrillDownLayoutId(null);
      sendJsonMessage({ type: 'get-layout', payload: { key: `sld_${layoutId}` } });
      setNodes([]);
      setEdges([]);
    } else if (layoutId && !isConnected) {
      console.log("SLDWidget: Waiting for WebSocket connection...");
    }
  }, [layoutId, sendJsonMessage, isConnected]);

  // --- Handle Incoming WebSocket Messages ---
  useEffect(() => {
    if (lastJsonMessage) {
      const message = lastJsonMessage as any;
      if (message.type === 'layout-data' && message.payload?.key === `sld_${layoutId}`) {
        console.log('SLDWidget: Received layout data:', message.payload.layout);
        const layout = message.payload.layout as SLDLayout | null;
        if (layout?.nodes && layout?.edges) {
          const validatedNodes = layout.nodes.map(n => ({ ...n, type: n.type || n.data?.elementType || 'default', }));
          setNodes(validatedNodes);
          setEdges(layout.edges);
          if (layout.viewport && reactFlowInstance) {
            reactFlowInstance.setViewport(layout.viewport, { duration: 300 });
          }
          setIsLoading(false);
        } else {
          console.warn(`SLDWidget: No valid layout data for sld_${layoutId}. Initializing empty.`);
          setNodes([]);
          setEdges([]);
          setIsLoading(false);
        }
      }
      if (message.type === 'layout-error' && message.payload?.key === `sld_${layoutId}`) {
        console.error("SLDWidget: Error loading layout:", message.payload.error);
        setIsLoading(false);
      }
    }
  }, [lastJsonMessage, layoutId, reactFlowInstance]);

  // --- React Flow State Handlers (Dependencies use updated `canEdit`) ---
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Only allow actual edits if `canEdit` is true
      if (!canEdit && changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [canEdit, setNodes] // Dependency now correctly includes canEdit derived from prop
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Only allow actual edits if `canEdit` is true
      if (!canEdit && changes.some(c => c.type !== 'select')) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [canEdit, setEdges] // Dependency now correctly includes canEdit derived from prop
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;
      console.log("SLDWidget: Connecting:", connection);
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds));
    },
    [canEdit, setEdges] // Dependency now correctly includes canEdit derived from prop
  );

  // --- Element Interaction (Depends on updated `canEdit`) ---
  const handleElementClick = useCallback((event: React.MouseEvent, element: CustomNodeType | CustomFlowEdge) => {
    setSelectedElement(element);
    if (!canEdit && isNode(element) && element.data?.isDrillable && element.data?.subLayoutId) {
      console.log(`SLDWidget: Drilling down into: ${element.data.subLayoutId} from ${element.data.label}`);
      setDrillDownLayoutId(element.data.subLayoutId);
      setDrillDownParentLabel(element.data.label);
      setIsDrillDownOpen(true);
      setIsDetailSheetOpen(false);
      setIsInspectorDialogOpen(false);
    } else if (!canEdit) {
      setIsDetailSheetOpen(true);
      setIsDrillDownOpen(false);
      setIsInspectorDialogOpen(false);
    } else { // We are in edit mode (`canEdit` is true)
      setIsInspectorDialogOpen(true);
      setIsDetailSheetOpen(false);
      setIsDrillDownOpen(false);
    }
  }, [canEdit]); // Dependency now correctly includes canEdit derived from prop

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
    setIsDetailSheetOpen(false);
    setIsInspectorDialogOpen(false);
    setIsDrillDownOpen(false);
    setDrillDownLayoutId(null);
  }, []);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: CustomNodeType) => {
     if(!canEdit) return;
     // Optionally trigger save or validation on drag stop during edit mode
     console.log("Node dragged:", node.id, "New position:", node.position);
  }, [canEdit]);

  // --- Edit Mode: Drag & Drop (Depends on updated `canEdit`) ---
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = canEdit ? 'move' : 'none';
  }, [canEdit]); // Dependency now correctly includes canEdit derived from prop

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!canEdit || !reactFlowWrapper.current || !reactFlowInstance) return;
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeInfoString = event.dataTransfer.getData('application/reactflow-node');
      if (!nodeInfoString) return;
      try {
        const nodeInfo = JSON.parse(nodeInfoString);
        const type = nodeInfo.type as SLDElementType;
        if (!type || !nodeTypes[type]) { console.error(`SLDWidget: Invalid drop type "${type}".`); return; }
        const position = project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top, });
        const newNode: CustomNodeType = {
            id: `${type}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`, type, position,
            data: { elementType: type, label: nodeInfo.label || `New ${type}`, ...(nodeInfo.defaultData || {}), dataPointLinks: [], },
        };
        console.log("SLDWidget: Adding new node:", newNode);
        setNodes((nds) => nds.concat(newNode));
      } catch (e) { console.error("SLDWidget: Parse error on drop:", e); }
    },
    [canEdit, project, reactFlowInstance, setNodes] // Dependency now correctly includes canEdit derived from prop
  );

  // --- Edit Mode: Inspector/Delete (Depends on updated `canEdit`) ---
  const handleUpdateElement = useCallback((updatedElement: CustomNodeType | CustomFlowEdge) => {
    if (!canEdit) return;
    if (isNode(updatedElement)) { setNodes((nds) => nds.map((node) => node.id === updatedElement.id ? updatedElement : node)); }
    else if (isEdge(updatedElement)) { setEdges((eds) => eds.map((edge) => edge.id === updatedElement.id ? updatedElement : edge)); }
    setSelectedElement(updatedElement);
  }, [canEdit, setNodes, setEdges]); // Dependency now correctly includes canEdit derived from prop

  const handleDeleteElement = useCallback((elementId: string) => {
    if (!canEdit) return;
    setNodes((nds) => nds.filter((node) => node.id !== elementId));
    setEdges((eds) => eds.filter((edge) => edge.id !== elementId));
    setSelectedElement(null);
    setIsInspectorDialogOpen(false); // Ensure dialog closes
  }, [canEdit, setNodes, setEdges]); // Dependency now correctly includes canEdit derived from prop

  // --- Layout Persistence (Depends on updated `canEdit`) ---
  const handleSaveLayout = useCallback(() => {
    if (!canEdit || !sendJsonMessage || !reactFlowInstance) return;
    const currentViewport = reactFlowInstance.getViewport();
    const layoutToSave: SLDLayout = { layoutId: layoutId, nodes: nodes, edges: edges, viewport: currentViewport };
    console.log(`SLDWidget: Saving layout for: sld_${layoutId}`, layoutToSave);
    sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${layoutId}`, layout: layoutToSave } });
    toast.success("Layout Saved!"); // Use toast for better feedback
  }, [canEdit, sendJsonMessage, reactFlowInstance, layoutId, nodes, edges]); // Dependency now correctly includes canEdit derived from prop

  // --- Render ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-full text-muted-foreground">Loading Diagram...</div>;
  }

  return (
    <div className="h-full w-full flex relative bg-background" ref={reactFlowWrapper}>
      {/* Palette - Controlled by canEdit (derived from prop) */}
      {canEdit && (
        <div className="w-64 h-full border-r border-border shadow-md z-10 bg-card">
          <SLDElementPalette />
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-grow h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleElementClick}
          onEdgeClick={handleElementClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.15, duration: 300 }}

          // Interaction options controlled by canEdit (derived from prop)
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={true}
          selectNodesOnDrag={canEdit}
          panOnDrag={!canEdit} // Simplified: Allow pan only when not in edit mode
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          panOnScroll={false}
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={canEdit}
          selectionMode={SelectionMode.Partial}

          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={canEdit} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background variant={"dots" as any} gap={16} size={1} />

          {/* Save Button - Controlled by canEdit (derived from prop) */}
          {canEdit && (
            <div className="absolute top-4 left-4 z-10">
              <Button onClick={handleSaveLayout} size="sm">
                Save SLD Layout
              </Button>
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Inspector Dialog - Logic remains, visibility depends on state triggered by `handleElementClick` which depends on `canEdit` */}
      <SLDInspectorDialog
        isOpen={isInspectorDialogOpen}
        onOpenChange={setIsInspectorDialogOpen}
        selectedElement={selectedElement}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
      />

      {/* Detail Sheet - Logic remains, visibility depends on state triggered by `handleElementClick` which depends on `canEdit` */}
      {!canEdit && (
        <SLDElementDetailSheet
          element={selectedElement}
          isOpen={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
        />
      )}

      {/* Drill Down Dialog - Logic remains */}
      <SLDDrillDownDialog
        isOpen={isDrillDownOpen}
        onOpenChange={setIsDrillDownOpen}
        layoutId={drillDownLayoutId}
        parentLabel={drillDownParentLabel}
      />
    </div>
  );
};

// Wrap with ReactFlowProvider - IMPORTANT: Props passed to SLDWidgetCore
const SLDWidget: React.FC<SLDWidgetProps> = (props) => ( // Accept props here
  <ReactFlowProvider>
    {/* Pass all props down to SLDWidgetCore, including the crucial isEditMode */}
    <SLDWidgetCore {...props} />
  </ReactFlowProvider>
);

export default SLDWidget;