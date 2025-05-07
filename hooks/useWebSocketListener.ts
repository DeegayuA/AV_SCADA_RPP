// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore'; // Ensure this path is correct
import { RealTimeData, SLDElementType, SLDLayout, CustomNodeType } from '@/types/sld'; // Add CustomNodeType
import { useState, useEffect, useCallback } from 'react';

// Placeholder types - adjust to your actual message structure
interface WebSocketMessage {
    type: string;
    payload?: any;
}

export const useWebSocket = () => {
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessage | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // --- MOCK IMPLEMENTATION ---
    useEffect(() => {
        // This effect should run once on mount to simulate connection setup
        console.log("Mock WebSocket: Initializing connection simulation...");

        const connectTimer = setTimeout(() => {
            setIsConnected(true);
            console.log("Mock WebSocket: Connection established (simulated).");
        }, 50); // Short delay

        // Simulate receiving layout data slightly later
        const layoutTimer = setTimeout(() => {
            console.log("Mock WebSocket: Simulating send of layout-data for sld_main_plant");

            // Define a source node for the edge
             const sourcePanelNode: CustomNodeType = {
                 id: 'panel-array-1', // Give it a valid ID
                 type: SLDElementType.Panel, // Use appropriate type (assuming you have a PanelNode component)
                 // If no PanelNode, use 'default' or another mapped type for visualization
                 // type: 'default',
                 position: { x: 50, y: 50 },
                 data: {
                    elementType: SLDElementType.Panel, // Important for data structure
                    label: 'PV Array 1',
                    // Add any other default data if needed
                 }
             };

            const mockLayout: SLDLayout = {
                layoutId: 'main_plant',
                nodes: [
                    sourcePanelNode, // Add the source node
                    // Existing nodes:
                    { id: 'inv-1', type: SLDElementType.Inverter, position: { x: 250, y: 50 }, data: { elementType: SLDElementType.Inverter, label: 'Inverter 1', dataPointLinks: [{ dataPointId: 'inv1_power', targetProperty: 'powerOutput', format: {type: 'number', precision: 1, suffix: ' kW'}}, { dataPointId: 'inv1_status', targetProperty: 'statusText', valueMapping: { type: 'exact', mapping: [{match: 'ON', value: 'Running'}, {match: 'OFF', value: 'Stopped'}, {match: 'ALARM', value: 'Alarm'}], defaultValue: 'Unknown'}}, { dataPointId: 'inv1_status', targetProperty: 'fillColor', valueMapping: { type: 'exact', mapping: [{match: 'ON', value: '#dcfce7'}, {match: 'OFF', value: '#f3f4f6'}, {match: 'ALARM', value: '#fee2e2'}], defaultValue: '#e0e7ff'}}] } },
                    { id: 'dl-1', type: SLDElementType.DataLabel, position: { x: 250, y: 200 }, data: { elementType: SLDElementType.DataLabel, label: 'Total Power', dataPointLinks: [{dataPointId: 'total_power', targetProperty: 'value', format: { type: 'number', precision: 2, suffix: ' kW'}}] } },
                    { id: 'tl-1', type: SLDElementType.TextLabel, position: { x: 50, y: 200 }, data: { elementType: SLDElementType.TextLabel, label: 'Plant A', text: 'Solar Plant Alpha\nSection 1' } },
                ],
                edges: [
                    // Connect the new source node to the inverter
                    { id: 'edge-panel-inv1', source: sourcePanelNode.id, target: 'inv-1', type: 'animatedFlow', data: { label: "DC Line", dataPointLinks: [{ dataPointId: 'line1_flow', targetProperty: 'flowDirection', valueMapping: {type: 'threshold', mapping: [{ threshold: 0.1, value: 'forward'}], defaultValue: 'none'} }]}}
                ],
                viewport: { x: 0, y: 0, zoom: 1 },
            };

             // Send the layout data with the correct key
            setLastJsonMessage({ type: 'layout-data', payload: { key: `sld_main_plant`, layout: mockLayout } });
        }, 1000); // Increased delay slightly to ensure connection happens first

         // Simulate receiving real-time data updates
        const dataInterval = setInterval(() => {
            // Only update if connected
             if(isConnected) {
                 const updates: RealTimeData = {
                    'inv1_power': Math.random() * 50,
                    'inv1_status': ['ON', 'OFF', 'ALARM'][Math.floor(Math.random() * 3)],
                    'total_power': Math.random() * 100 + 50, // Make total power higher
                    'line1_flow': Math.random() > 0.2 ? (Math.random() * 10) : 0, // Simulate varying flow
                 };
                 // This should trigger an update in your Zustand store
                useAppStore.getState().updateRealtimeData(updates);
                 // console.log("Mock WebSocket: Simulating data update:", updates);
             }
        }, 2500); // Update interval

        // Cleanup function
        return () => {
            console.log("Mock WebSocket: Cleaning up timers and connection state.");
            clearTimeout(connectTimer);
            clearTimeout(layoutTimer);
            clearInterval(dataInterval);
            setIsConnected(false); // Reset connection state on unmount
        };
    // --- IMPORTANT: --- Remove dependencies like [isConnected] here.
    // This effect should run ONLY ONCE on component mount to set up the simulation.
    }, []);

    // sendJsonMessage useCallback hook - this depends on isConnected state correctly
    const sendJsonMessage = useCallback((message: WebSocketMessage) => {
        if (isConnected) {
            console.log("Mock WebSocket: Simulating send:", message);
            if (message.type === 'get-layout') {
                 console.log(`Mock WebSocket: Received request for layout key: ${message.payload?.key}. Response is handled by the main useEffect timer.`);
            }
            // Simulate saving confirmation
            if (message.type === 'save-sld-widget-layout') {
                 setTimeout(() => {
                    console.log(`Mock WebSocket: Simulating send of layout-saved confirmation for key: ${message.payload?.key}`);
                    setLastJsonMessage({ type: 'layout-saved', payload: { key: message.payload?.key } });
                 }, 500)
            }
        } else {
            // This warning is expected if the widget tries to send before the connectTimer fires
            console.warn("Mock WebSocket: Attempted to send while not connected (simulated):", message);
        }
    }, [isConnected]); // Dependency on isConnected is correct here

    return { sendJsonMessage, lastJsonMessage, isConnected };
};