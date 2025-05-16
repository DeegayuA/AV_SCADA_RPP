// components/sld/SLDWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useReactFlow,
  Node, Edge, Connection, addEdge,
  NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges,
  SelectionMode, PanOnScrollMode, isNode, isEdge,
  Controls, MiniMap, Background, NodeTypes, EdgeTypes, ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import {
  SLDWidgetProps,
  SLDLayout,
  CustomNodeType,
  CustomFlowEdge,
  CustomNodeData,
  SLDElementType,
  CustomFlowEdgeData,
  PaletteComponent,
} from '@/types/sld';
import { UserRole } from '@/types/auth';

import DataLabelNode from './nodes/DataLabelNode';
import TextLabelNode from './nodes/TextLabelNode';
import InverterNode from './nodes/InverterNode';
import PanelNode from './nodes/PanelNode';
import AnimatedFlowEdge from './edges/AnimatedFlowEdge';

import SLDElementPalette from './ui/SLDElementPalette';
import SLDInspectorDialog from './ui/SLDInspectorDialog';
import SLDElementDetailSheet from './ui/SLDElementDetailSheet';
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { Button } from '@/components/ui/button';
import SLDDrillDownDialog from './ui/SLDDrillDownDialog';
import { getNodeColor, getNodeStrokeColor, getThemeAwareColors } from './ui/mini-map';


const nodeTypes: NodeTypes = {
  [SLDElementType.DataLabel]: DataLabelNode,
  [SLDElementType.TextLabel]: TextLabelNode,
  [SLDElementType.Inverter]: InverterNode,
  [SLDElementType.Panel]: PanelNode,
};

const edgeTypes: EdgeTypes = {
  animatedFlow: AnimatedFlowEdge,
};

const defaultEdgeOptions = {
  type: 'animatedFlow',
  animated: true,
  style: { strokeWidth: 3, stroke: '#007bff' }, // Default will be overridden by theme if edge.style is not set
  data: {} as CustomFlowEdgeData,
};


const SLDWidgetCore: React.FC<SLDWidgetProps> = ({ layoutId, isEditMode: isEditModeFromProps }) => {
  const { sendJsonMessage, lastJsonMessage, isConnected } = useWebSocket();

  const { currentUser } = useAppStore(
    useShallow((state) => ({ currentUser: state.currentUser }))
  );
  const { theme: currentTheme } = useTheme();

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
  const canEdit = useMemo(() => !!isEditModeFromProps, [isEditModeFromProps]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;
      const newEdgeData: CustomFlowEdgeData = {
        label: 'Connection',
        // TODO: Add specific data based on connected node types if needed
      };
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions, data: newEdgeData }, eds));
    },
    [canEdit, setEdges] // setEdges added
  );

  useEffect(() => {
    if (layoutId && sendJsonMessage && isConnected) {
      console.log(`SLDWidget: Requesting layout for: sld_${layoutId} (WebSocket connected: ${isConnected})`);
      setIsLoading(true);
      setSelectedElement(null);
      setIsInspectorDialogOpen(false);
      setIsDetailSheetOpen(false);
      setIsDrillDownOpen(false);
      setDrillDownLayoutId(null);
      sendJsonMessage({ type: 'get-layout', payload: { key: `sld_${layoutId}` } });
      // Reset nodes and edges immediately to show loading state clearly if component re-renders.
      // The new data will populate them via lastJsonMessage effect.
      setNodes([]);
      setEdges([]);
    } else if (layoutId && !isConnected) {
      console.warn("SLDWidget: Waiting for WebSocket connection to load layout...");
      setIsLoading(true);
      setNodes([]);
      setEdges([]);
    }
  }, [layoutId, sendJsonMessage, isConnected]);

  useEffect(() => {
    if (lastJsonMessage) {
      const message = lastJsonMessage as any;
      // Ensure message is for the current layoutId
      if (message.payload?.key !== `sld_${layoutId}`) return;

      if (message.type === 'layout-data') {
        const layout = message.payload.layout as SLDLayout | null;
        setIsLoading(false);
        let appliedSpecificViewport = false;

        if (layout?.nodes && layout.nodes.length > 0) {
          const validatedNodes = layout.nodes.map(n => ({
            ...n,
            type: n.type || n.data?.elementType || SLDElementType.TextLabel,
            // Ensure position is always defined, default to 0,0 if missing (though unlikely)
            position: n.position || { x:0, y:0 },
          }));
          setNodes(validatedNodes);
          setEdges(layout.edges || []);
          
          if (reactFlowInstance && layout.viewport) {
            // Use timeout to allow DOM to update if nodes/edges were just set
            setTimeout(() => {
              // Ensure viewport is defined before passing to setViewport
              if (layout.viewport) {
                reactFlowInstance.setViewport(layout.viewport, { duration: 300 });
              }
            }, 50);
            appliedSpecificViewport = true;
          }
        } else { // Layout is null, empty, or has no nodes
          setNodes([]);
          setEdges([]);
        }
        
        if (reactFlowInstance && !appliedSpecificViewport) {
          // If no specific viewport was applied (e.g., new layout, empty layout, or no saved viewport)
          // then fit the current view.
          setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
          }, 50); // 50ms delay helps ensure canvas is ready, esp. in modals
        }

      } else if (message.type === 'layout-error') {
        console.error("SLDWidget: Error loading layout:", message.payload.error);
        setIsLoading(false);
        setNodes([]);
        setEdges([]);
        toast.error("Error loading SLD Layout", { description: message.payload.error });
        if (reactFlowInstance) { // Fit an empty view on error
          setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
          }, 50);
        }
      } else if (message.type === 'layout-saved-confirmation') {
        toast.success("SLD Layout Saved Successfully!");
      } else if (message.type === 'layout-save-error') {
        toast.error("Failed to Save SLD Layout", { description: message.payload.error });
      }
    }
  }, [lastJsonMessage, layoutId, reactFlowInstance]); // reactFlowInstance is crucial here


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!canEdit && changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [canEdit, setNodes] // setNodes added
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!canEdit && changes.some(c => c.type !== 'select')) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [canEdit, setEdges] // setEdges added
  );

  const handleElementClick = useCallback((event: React.MouseEvent, element: CustomNodeType | CustomFlowEdge) => {
    setSelectedElement(element);
    if (isNode(element) && element.data?.isDrillable && element.data?.subLayoutId) {
      if (!canEdit || (canEdit && !event.ctrlKey && !event.metaKey)) { // Allow drilldown in view mode, or in edit mode without Ctrl/Meta
        setDrillDownLayoutId(element.data.subLayoutId);
        setDrillDownParentLabel(element.data.label);
        setIsDrillDownOpen(true);
        setIsDetailSheetOpen(false); // Ensure others are closed
        setIsInspectorDialogOpen(false);
        return; // Do not proceed to open inspector/detail sheet
      }
    }

    if (!canEdit) { // View mode specific interactions
      setIsDetailSheetOpen(true);
      setIsInspectorDialogOpen(false); // Ensure inspector is closed
    } else { // Edit mode specific interactions
      setIsInspectorDialogOpen(true);
      setIsDetailSheetOpen(false); // Ensure detail sheet is closed
    }
  }, [canEdit]);

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
    setIsDetailSheetOpen(false);
    setIsInspectorDialogOpen(false);
  }, []);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: CustomNodeType, draggedNodes: CustomNodeType[]) => {
    if (!canEdit) return;
    // ReactFlow updates node positions internally. If you need to process nodes after drag,
    // use the `draggedNodes` (which contains all nodes involved in the drag, typically one unless multi-selecting).
    // Or `reactFlowInstance.getNodes()` if you need all current nodes after drag.
    // For just saving, nodes state is already updated by onNodesChange.
  }, [canEdit]);


  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = canEdit ? 'move' : 'none';
  }, [canEdit]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!canEdit || !reactFlowWrapper.current || !reactFlowInstance) return;
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeInfoString = event.dataTransfer.getData('application/reactflow-node');
      if (!nodeInfoString) return;
      try {
        const nodeInfo = JSON.parse(nodeInfoString) as PaletteComponent;
        const type = nodeInfo.type as SLDElementType;
        if (!type || !nodeTypes[type]) { console.error(`SLDWidget: Invalid drop type "${type}".`); return; }
        
        const position = reactFlowInstance.screenToFlowPosition({ 
          x: event.clientX - reactFlowBounds.left, 
          y: event.clientY - reactFlowBounds.top 
        });
        // const position = project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top }); Old way

        const baseNodeData: CustomNodeData = {
          elementType: type,
          label: nodeInfo.label || `New ${type}`,
          dataPointLinks: nodeInfo.defaultData?.dataPointLinks || [],
          ...(nodeInfo.defaultData || {}),
        } as CustomNodeData;

        const newNode: CustomNodeType = {
          id: `${type}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`,
          type,
          position,
          data: baseNodeData,
        };
        setNodes((nds) => nds.concat(newNode));
      } catch (e) { console.error("SLDWidget: Parse error on drop:", e); }
    },
    [canEdit, reactFlowInstance, setNodes] // project removed, reactFlowInstance.screenToFlowPosition is preferred.
  );


  const handleUpdateElement = useCallback((updatedElement: CustomNodeType | CustomFlowEdge) => {
    if (!canEdit) return;
    if (isNode(updatedElement)) { setNodes((nds) => nds.map((node) => node.id === updatedElement.id ? updatedElement : node)); }
    else if (isEdge(updatedElement)) { setEdges((eds) => eds.map((edge) => edge.id === updatedElement.id ? updatedElement : edge)); }
    setSelectedElement(updatedElement); // Keep selection on the updated element
  }, [canEdit, setNodes, setEdges]);

  const handleDeleteElement = useCallback((elementId: string) => {
    if (!canEdit) return;
    setNodes((nds) => nds.filter((node) => node.id !== elementId));
    setEdges((eds) => eds.filter((edge) => edge.id !== elementId && edge.source !== elementId && edge.target !== elementId));
    setSelectedElement(null);
    setIsInspectorDialogOpen(false);
  }, [canEdit, setNodes, setEdges]);


  const handleSaveLayout = useCallback(() => {
    if (!canEdit || !sendJsonMessage || !reactFlowInstance || !layoutId) {
      toast.warning("Cannot save layout.", { description: !canEdit ? "Not in edit mode." : (!sendJsonMessage ? "Connection issue (send)." : (!layoutId ? "Missing Layout ID" : "Instance not ready.")) });
      return;
    }
    const currentViewport = reactFlowInstance.getViewport();
    // Filter out any undefined/null nodes/edges just in case, though types should prevent this
    const validNodes = nodes.filter(n => n && n.id);
    const validEdges = edges.filter(e => e && e.id);
    
    const layoutToSave: SLDLayout = { layoutId: layoutId, nodes: validNodes, edges: validEdges, viewport: currentViewport };
    sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${layoutId}`, layout: layoutToSave } });
    toast.info("Saving SLD Layout...", { duration: 2000 });
  }, [canEdit, sendJsonMessage, reactFlowInstance, layoutId, nodes, edges]);

  const { resolvedTheme } = useTheme(); // For MiniMap theming

  if (isLoading && !reactFlowInstance && nodes.length === 0) { // Show loading text if instance not ready and no nodes (initial load)
    return <div className="flex justify-center items-center h-full text-muted-foreground">Loading Diagram...</div>;
  }
  
  const colors = getThemeAwareColors(currentTheme || 'light');
  const themedNodeColor = (node: Node) => getNodeColor({ ...node, type: node.type || 'default' }, colors);
  const themedNodeStrokeColor = (node: Node) => getNodeStrokeColor({ ...node, type: node.type || 'default' }, colors);


  return (
    <div className="h-full w-full flex relative bg-background" ref={reactFlowWrapper}>
      {canEdit && (
        <div className="w-60 h-full border-r border-border shadow-md z-10 bg-card overflow-y-auto">
          <SLDElementPalette />
        </div>
      )}

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
          // fitView prop removed for explicit control via useEffect
          fitViewOptions={{ padding: 0.2, duration: 300 }} // These options apply to imperative fitView calls too
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={true}
          selectNodesOnDrag={canEdit} // Allows dragging a selection box if true
          panOnDrag={true} // Allows panning by dragging the pane
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          panOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={canEdit} // Enable/disable dragging a selection box
          selectionMode={SelectionMode.Partial} // Or Full, controls how selection box works
          proOptions={{ hideAttribution: true }}
          className="bg-muted/30 dark:bg-neutral-900/50" // Example background
        >
          <Controls showInteractive={canEdit} />
          <MiniMap
            pannable={true}
            zoomable={true}
            nodeColor={themedNodeColor}
            nodeStrokeColor={themedNodeStrokeColor}
            nodeStrokeWidth={2}
            nodeBorderRadius={2}
            style={{ backgroundColor: colors.miniMapBg, border: `1px solid ${colors.miniMapBorder}` }}
            maskColor={colors.maskBg}
            maskStrokeColor={colors.maskStroke}
            maskStrokeWidth={1} // Thinner mask stroke often looks cleaner
          />

          <Background variant={"dots" as any} gap={16} size={1} color={colors.backgroundDots} className="opacity-75" />

          {canEdit && (
            <div className="absolute top-3 right-3 z-10"> {/* Changed to right for common placement */}
              <Button onClick={handleSaveLayout} size="sm" variant="secondary" title="Save current SLD layout">
                Save SLD
              </Button>
            </div>
          )}
        </ReactFlow>
      </div>

      {canEdit && selectedElement && (
        <SLDInspectorDialog
          isOpen={isInspectorDialogOpen}
          onOpenChange={(open) => {
            setIsInspectorDialogOpen(open);
            if (!open) setSelectedElement(null); // Clear selection if dialog closes
          }}
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
        />
      )}

      {!canEdit && selectedElement && (isNode(selectedElement) || isEdge(selectedElement)) && ( // Ensure selectedElement is valid before passing
        <SLDElementDetailSheet
          element={selectedElement}
          isOpen={isDetailSheetOpen}
          onOpenChange={(open) => {
            setIsDetailSheetOpen(open);
            if (!open) setSelectedElement(null); // Clear selection if sheet closes
          }}
        />
      )}

      {isDrillDownOpen && drillDownLayoutId && (
        <SLDDrillDownDialog
          isOpen={isDrillDownOpen}
          onOpenChange={(open) => {
            setIsDrillDownOpen(open);
            if (!open) {
              setDrillDownLayoutId(null); // Reset drilldown state
              setSelectedElement(null);   // Clear selection if coming back from drilldown
            }
          }}
          layoutId={drillDownLayoutId}
          parentLabel={drillDownParentLabel}
        />
      )}
    </div>
  );
};


const SLDWidget: React.FC<SLDWidgetProps> = (props) => (
  <ReactFlowProvider>
    <SLDWidgetCore {...props} />
  </ReactFlowProvider>
);

export default React.memo(SLDWidget);