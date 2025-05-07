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
import { useShallow } from 'zustand/react/shallow'; // Use for selecting multiple state values

import {
  SLDWidgetProps,
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

// ... import other custom nodes (BreakerNode, etc.)

// Import Custom Edges
import AnimatedFlowEdge from './edges/AnimatedFlowEdge';

// Import UI Components
import SLDElementPalette from './ui/SLDElementPalette';
// *** Import the new Dialog instead of the Panel ***
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementDetailSheet from './ui/SLDElementDetailSheet';
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { Button } from '@/components/ui/button';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';

// Define Node Types Mapping
const nodeTypes: NodeTypes = {
  [SLDElementType.DataLabel]: DataLabelNode,
  [SLDElementType.TextLabel]: TextLabelNode,
  [SLDElementType.Inverter]: InverterNode,
  [SLDElementType.Panel]: PanelNode,
  // Map other custom node types here
};

// Define Edge Types Mapping
const edgeTypes: EdgeTypes = {
  animatedFlow: AnimatedFlowEdge,
  // Add other custom edge types if needed
};

// Default edge options
const defaultEdgeOptions = {
  type: 'animatedFlow',
  animated: true,
  style: { strokeWidth: 3, stroke: '#00f' },
};

const SLDWidgetContent: React.FC<SLDWidgetProps> = ({ layoutId }) => {
  const { sendJsonMessage, lastJsonMessage, isConnected } = useWebSocket();

  // Zustand Store Access
  const { isEditMode, currentUser } = useAppStore(
      useShallow((state) => ({ isEditMode: state.isEditMode, currentUser: state.currentUser }))
  );

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CustomNodeType[]>([]);
  const [edges, setEdges] = useState<CustomFlowEdge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedElement, setSelectedElement] = useState<CustomNodeType | CustomFlowEdge | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownLayoutId, setDrillDownLayoutId] = useState<string | null>(null);
  const [drillDownParentLabel, setDrillDownParentLabel] = useState<string | undefined>(undefined);
  // State for the Inspector Dialog visibility
  const [isInspectorDialogOpen, setIsInspectorDialogOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { project } = useReactFlow();

  // Determine if editing is allowed
  const canEdit = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Data Loading ---
  useEffect(() => {
    if (layoutId && sendJsonMessage && isConnected) {
      console.log(`Requesting layout for: sld_${layoutId} (WebSocket connected)`);
      setIsLoading(true);
      setSelectedElement(null);
      setIsInspectorDialogOpen(false); // Close inspector on layout change
      setIsDetailSheetOpen(false); // Close detail sheet on layout change
      setIsDrillDownOpen(false); // Close drill-down on layout change
      setDrillDownLayoutId(null); // Clear drill-down ID
      sendJsonMessage({
        type: 'get-layout',
        payload: { key: `sld_${layoutId}` }
      });
      setNodes([]);
      setEdges([]);
    } else if (layoutId && !isConnected) {
      console.log("Waiting for WebSocket connection to request layout...");
    }
  }, [layoutId, sendJsonMessage, isConnected]);

  // --- Handle Incoming WebSocket Messages ---
  useEffect(() => {
    if (lastJsonMessage) {
      const message = lastJsonMessage as any;

      if (message.type === 'layout-data' && message.payload?.key === `sld_${layoutId}`) {
        console.log('Received layout data:', message.payload.layout);
        const layout = message.payload.layout as SLDLayout | null;
        if (layout?.nodes && layout?.edges) {
           const validatedNodes = layout.nodes.map(n => ({
               ...n,
               type: n.type || n.data?.elementType || 'default', // Ensure type exists
           }));
           setNodes(validatedNodes);
           setEdges(layout.edges);
           if (layout.viewport && reactFlowInstance) {
               reactFlowInstance.setViewport(layout.viewport, { duration: 300 });
           }
           setIsLoading(false);
        } else {
            console.warn(`No valid layout data received for sld_${layoutId}. Initializing empty.`);
            setNodes([]);
            setEdges([]);
            setIsLoading(false);
        }
      }

      if (message.type === 'layout-error' && message.payload?.key === `sld_${layoutId}`) {
          console.error("Error loading layout:", message.payload.error);
          setIsLoading(false);
      }
    }
  }, [lastJsonMessage, layoutId, reactFlowInstance]);

  // --- React Flow State Handlers ---
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
       if (!canEdit && changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [canEdit, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!canEdit && changes.some(c => c.type !== 'select')) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [canEdit, setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
       if (!canEdit) return;
      console.log("Connecting:", connection);
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds));
    },
    [canEdit, setEdges]
  );

  // --- Element Interaction ---
 const handleElementClick = useCallback((event: React.MouseEvent, element: CustomNodeType | CustomFlowEdge) => {
      setSelectedElement(element);

      // Check for Drill-Down condition first (only for Nodes in view mode)
      if (!canEdit && isNode(element) && element.data?.isDrillable && element.data?.subLayoutId) {
          console.log(`Drilling down into: ${element.data.subLayoutId} from ${element.data.label}`);
          setDrillDownLayoutId(element.data.subLayoutId);
          setDrillDownParentLabel(element.data.label);
          setIsDrillDownOpen(true);
          setIsDetailSheetOpen(false); // Ensure detail sheet is closed
          setIsInspectorDialogOpen(false); // Ensure inspector is closed
      }
      // If not drilling down, proceed with previous logic
      else if (!canEdit) {
          // Open detail sheet for non-drillable elements in view mode
          setIsDetailSheetOpen(true);
          setIsDrillDownOpen(false); // Ensure drilldown is closed
          setIsInspectorDialogOpen(false); // Ensure inspector is closed
      } else {
          // Open Inspector Dialog in edit mode
          setIsInspectorDialogOpen(true);
          setIsDetailSheetOpen(false); // Ensure detail sheet is closed
          setIsDrillDownOpen(false); // Ensure drilldown is closed
      }
  }, [canEdit]); // Add dependencies if needed

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
    setIsDetailSheetOpen(false);
    setIsInspectorDialogOpen(false);
    setIsDrillDownOpen(false); // Close drill-down on pane click
    setDrillDownLayoutId(null); // Clear ID
  }, []);

    const onNodeDragStop = useCallback((event: React.MouseEvent, node: CustomNodeType) => {
        // Optional: trigger save or other actions
    }, []);

  // --- Edit Mode: Drag & Drop ---
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (canEdit) {
        event.dataTransfer.dropEffect = 'move';
    } else {
         event.dataTransfer.dropEffect = 'none';
    }
  }, [canEdit]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
       if (!canEdit || !reactFlowWrapper.current || !reactFlowInstance) return;

      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeInfoString = event.dataTransfer.getData('application/reactflow-node');

      if (!nodeInfoString) return;

      let nodeInfo;
      try { nodeInfo = JSON.parse(nodeInfoString); } catch (e) { console.error("Parse error on drop:", e); return; }

      const type = nodeInfo.type as SLDElementType;
      if (!type || !nodeTypes[type]) { console.error(`Invalid drop type "${type}".`); return; }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: CustomNodeType = {
        id: `${type}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`,
        type,
        position,
        data: {
           elementType: type,
           label: nodeInfo.label || `New ${type}`,
          ...(nodeInfo.defaultData || {}),
           dataPointLinks: [],
        },
      };
      console.log("Adding new node:", newNode);
      setNodes((nds) => nds.concat(newNode));
    },
    [canEdit, project, reactFlowInstance, setNodes]
  );

   // --- Edit Mode: Inspector Dialog Updates ---
   const handleUpdateElement = useCallback((updatedElement: CustomNodeType | CustomFlowEdge) => {
        if (!canEdit) return;

        if (isNode(updatedElement)) {
             setNodes((nds) => nds.map((node) => node.id === updatedElement.id ? updatedElement : node));
        } else if (isEdge(updatedElement)) {
            setEdges((eds) => eds.map((edge) => edge.id === updatedElement.id ? updatedElement : edge));
        }
        // Keep the element selected after update (dialog handles closing)
        setSelectedElement(updatedElement);
   }, [canEdit, setNodes, setEdges]);

    const handleDeleteElement = useCallback((elementId: string) => {
        if (!canEdit) return;
         setNodes((nds) => nds.filter((node) => node.id !== elementId));
         setEdges((eds) => eds.filter((edge) => edge.id !== elementId));
         setSelectedElement(null); // Deselect after deletion
         // The dialog will close itself via its onOpenChange callback
    }, [canEdit, setNodes, setEdges]);

  // --- Layout Persistence ---
  const handleSaveLayout = useCallback(() => {
    if (!canEdit || !sendJsonMessage || !reactFlowInstance) return;

    const currentViewport = reactFlowInstance.getViewport();
    const layoutToSave: SLDLayout = {
      layoutId: layoutId,
      nodes: nodes,
      edges: edges,
      viewport: currentViewport,
    };

    console.log(`Saving layout for: sld_${layoutId}`, layoutToSave);
    sendJsonMessage({
      type: 'save-sld-widget-layout',
      payload: {
        key: `sld_${layoutId}`,
        layout: layoutToSave,
      },
    });
     alert("Layout Saved!"); // Simple feedback
  }, [canEdit, sendJsonMessage, reactFlowInstance, layoutId, nodes, edges]);

   // --- Render ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-full text-muted-foreground">Loading Diagram...</div>;
  }

  return (
    <div className="h-full w-full flex relative bg-background" ref={reactFlowWrapper}>
       {/* Palette - Only visible in Edit Mode */}
      {canEdit && (
          <div className="w-64 h-full border-r border-border shadow-md z-10 bg-card"> {/* Added bg */}
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

            // Interaction options based on mode
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            elementsSelectable={true} // Always allow selection
            selectNodesOnDrag={canEdit}
            panOnDrag={!canEdit || !isEditMode} // Allow panning in view mode, or edit mode if not dragging node
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            panOnScroll={true}
            panOnScrollMode={PanOnScrollMode.Free}
            selectionOnDrag={canEdit}
            selectionMode={SelectionMode.Partial}

            proOptions={{ hideAttribution: true }}
        >
            <Controls showInteractive={canEdit} />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
            <Background variant={"dots" as any} gap={16} size={1} /> {/* Removed color for theme support */}

             {/* Save Button - Only visible in Edit Mode */}
            {canEdit && (
                <div className="absolute top-4 left-4 z-10">
                    <Button onClick={handleSaveLayout} size="sm">
                        Save Layout
                    </Button>
                </div>
             )}
        </ReactFlow>
      </div>

        {/* --- REMOVED Old Inspector Panel Div --- */}

        {/* Inspector Dialog - Rendered conditionally but controlled by isOpen state */}
        {/* Render it regardless of selectedElement so it can handle its closing animation */}
        <SLDInspectorDialog
            isOpen={isInspectorDialogOpen}
            onOpenChange={setIsInspectorDialogOpen} // Let dialog control its open state
            selectedElement={selectedElement}       // Pass the currently selected element
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
        />

        {/* Detail Sheet - Only visible in View Mode and when an element is selected */}
        {/* Controlled separately from the inspector */}
        {!canEdit && (
            <SLDElementDetailSheet
                element={selectedElement}
                isOpen={isDetailSheetOpen}
                onOpenChange={setIsDetailSheetOpen}
            />
        )}

<SLDDrillDownDialog
            isOpen={isDrillDownOpen}
            onOpenChange={setIsDrillDownOpen}
            layoutId={drillDownLayoutId}
            parentLabel={drillDownParentLabel}
        />
    </div>
  );
};

// Wrap with ReactFlowProvider
const SLDWidget: React.FC<SLDWidgetProps> = (props) => (
    <ReactFlowProvider>
        <SLDWidgetContent {...props} />
    </ReactFlowProvider>
);

export default SLDWidget;