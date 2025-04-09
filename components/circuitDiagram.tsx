"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
} from "reactflow";
import type { Node } from "reactflow";
import "reactflow/dist/style.css";

// Key to save the data in localStorage
const STORAGE_KEY = "circuit-diagram";

// Function to load the saved diagram data (nodes and edges)
const loadDiagram = () => {
  if (typeof window === "undefined") return { nodes: [], edges: [] };
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const parsedData = savedData ? JSON.parse(savedData) : null;
    return parsedData || { nodes: [], edges: [] };  // Default to empty if not found
  } catch (error) {
    console.error("Failed to load diagram:", error);
    localStorage.removeItem(STORAGE_KEY);  // Remove corrupted data
    return { nodes: [], edges: [] };
  }
};

export default function CircuitDiagram() {
  // Load saved data (nodes and edges) from localStorage
  const { nodes: initialNodes, edges: initialEdges } = loadDiagram();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Handle connection (edge) creation
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const updatedEdges = addEdge({ ...params, animated: true, style: { stroke: "#4f46e5" } }, eds);
        // Save both nodes and edges to localStorage after creating the edge
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges: updatedEdges }));
        return updatedEdges;
      });
    },
    [nodes, edges]  // Ensure that the latest nodes and edges are saved
  );

  // Add a new node
  const addNode = (label: string, position = { x: 100, y: 100 }) => {
    const id = crypto.randomUUID();
  
    const newNode: Node = {
      id,
      type: "default",
      position,
      data: { label },
      style: {
        padding: 15,
        border: "4px solid #4f46e5",
        borderRadius: 10,
        backgroundColor: "#f9fafb",
        width: 180,
      },
    };
  
    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      // Save the updated diagram (nodes and edges) to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: updatedNodes, edges }));
      return updatedNodes;
    });
  };

  // Handle the drop event when a new node is dragged and dropped onto the canvas
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const reactBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const type = event.dataTransfer.getData("application/reactflow");

    if (!type || !reactFlowInstance || !reactBounds) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactBounds.left,
      y: event.clientY - reactBounds.top,
    });

    addNode(type, position);
  };

  // Handle drag over event
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  // Save the diagram manually
  const handleSave = () => {
    // Save both nodes and edges to localStorage manually
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    alert("Circuit Diagram Saved!");
  };

  useEffect(() => {
    // Auto-save the diagram (nodes and edges) to localStorage whenever they change
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);  // Save whenever nodes or edges change

  return (
    <ReactFlowProvider>
      <div className="h-full w-full relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-4 z-10 space-x-2">
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow"
          >
            Save Diagram
          </button>
        </div>

        <div
          className="h-full"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background color="#e0e7ff" gap={20} />
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
