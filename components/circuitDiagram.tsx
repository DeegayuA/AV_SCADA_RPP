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
import type { Node } from "reactflow";  // Correct placement of type import
import "reactflow/dist/style.css";

const STORAGE_KEY = "circuit-diagram";

const defaultNodes: Node[] = [];

const loadNodes = () => {
  if (typeof window === "undefined") return defaultNodes;
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const parsedData = savedData ? JSON.parse(savedData) : null;
    return parsedData && parsedData.nodes ? parsedData.nodes : defaultNodes;
  } catch (error) {
    console.error("Failed to load nodes:", error);
    localStorage.removeItem(STORAGE_KEY);
    return defaultNodes;
  }
};

export default function CircuitDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#4f46e5" } }, eds)),
    [setEdges]
  );

  const addNode = (label = "New Component", position = { x: 100, y: 100 }) => {
    const id = crypto.randomUUID();
  
    const newNode: Node = {
      id,
      type: "default",
      position,
      data: { label },
      style: {
        padding: 10,
        border: "2px solid #4f46e5",
        borderRadius: 8,
        backgroundColor: "#f9fafb",
        width: 160,
      },
    };
  
    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: updatedNodes, edges }));
      return updatedNodes;
    });
  };

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

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-4 z-10 space-x-2">
          <button
            onClick={() => {
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              // Placeholder: implement image export here if needed
              alert("Export feature is coming soon!");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow"
          >
            Export Image
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