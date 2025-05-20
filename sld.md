# SLD Widget Integration Guide

This guide explains how to integrate and use the sophisticated Single-Line Diagram (SLD) widget within the Solar Powerplant Control Panel application.

## 1. Prerequisites

*   React project setup with TypeScript.
*   Tailwind CSS configured.
*   Shadcn UI initialized (`npx shadcn-ui@latest init`).
*   Zustand installed (`npm install zustand` or `yarn add zustand`).
*   React Flow installed (`npm install reactflow` or `yarn add reactflow`).
*   A WebSocket connection mechanism (e.g., `react-use-websocket` or a custom hook like the example `useWebSocket`) integrated into your application for communication with the backend.
*   Backend endpoints/WebSocket events configured for:
    *   `get-layout`: Takes a `key` (e.g., `sld_{layoutId}`) and returns the `SLDLayout` JSON object.
    *   `save-sld-widget-layout`: Takes a `key` and the `SLDLayout` JSON object to persist changes.
    *   Real-time data broadcasting (pushing updates to connected clients).

## 2. Installation

1.  **Copy Files:** Place the generated files (`types/`, `components/sld/`, `hooks/useWebSocket.ts` (example), `store/appStore.ts` (example)) into the appropriate directories within your React project structure (e.g., `src/`).
2.  **Install Dependencies:** Ensure `reactflow`, `zustand`, and any icon libraries (if used in custom nodes) are installed.
3.  **Configure Tailwind:**
    *   Ensure Tailwind processes the classes used within the SLD components.
    *   Add the `animated-flow` keyframes and classes to your global CSS file (`src/app/globals.css` or similar) if using the `AnimatedFlowEdge`:
        ```css
        @tailwind base;
        @tailwind components;
        @tailwind utilities;

        @layer base {
          /* Your base styles */
        }

        @layer utilities {
           /* Keyframes for animated edges */
           @keyframes dashdraw {
             to {
               stroke-dashoffset: 0;
             }
           }

           /* Class for forward animation */
           .animated-flow {
             stroke-dasharray: 5; /* Adjust dash length */
             stroke-dashoffset: 1000; /* Start offset (needs to be large) */
             /* animation-duration defined inline via style prop */
             animation: dashdraw linear infinite;
           }

           /* Class for reverse animation */
            .animated-flow-reverse {
                stroke-dasharray: 5;
                stroke-dashoffset: -1000; /* Start offset reverse */
                animation: dashdraw linear infinite reverse;
            }
        }
        ```
4.  **Integrate Zustand Store:**
    *   Adapt the example `appStore.ts` or merge its state (`realtimeData`, `dataPoints`, `isEditMode`, `currentUser`) and actions into your existing central Zustand store.
    *   Ensure your WebSocket logic updates the `realtimeData` in the store when new data arrives.
    *   Ensure the `currentUser` and `isEditMode` state are correctly managed by your application's authentication and UI controls.
5.  **Implement WebSocket Hook:** Replace the example `useWebSocket` hook with your actual WebSocket implementation, ensuring it provides `sendJsonMessage` and `lastJsonMessage` (or equivalent functionality).

## 3. Usage

Embed the `SLDWidget` component where you want the diagram to appear, passing the required `layoutId` prop:

```jsx
// Example usage in a page component (e.g., src/app/plant/[layoutId]/page.tsx)

import SLDWidget from '@/components/sld/SLDWidget'; // Adjust path
import { useAppStore } from '@/store/appStore'; // Adjust path
import { Button } from '@/components/ui/button'; // Assuming Shadcn UI

export default function PlantViewPage({ params }: { params: { layoutId: string } }) {
  const { layoutId } = params; // Get layoutId from route params, for example
  const { isEditMode, toggleEditMode, currentUser } = useAppStore();

  // Only allow Admins to toggle edit mode
  const canToggleEdit = currentUser?.role === USER;

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <h1 className="text-xl font-bold">Plant Layout: {layoutId}</h1>
        {canToggleEdit && (
             <Button onClick={toggleEditMode} variant="outline">
                 {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
             </Button>
         )}
      </header>
      <main className="flex-grow relative">
        {/* The SLD Widget takes up the available space */}
        <SLDWidget layoutId={layoutId} />
      </main>
    </div>
  );
}
```

## 4. Features

### View Mode (Default / Operator Role)

*   **Dynamic Loading:** Displays the SLD specified by the `layoutId`.
*   **Real-time Updates:** Component visuals (colors, text) and connection animations update automatically based on `realtimeData` from the Zustand store, as configured via `dataPointLinks`.
*   **Interactivity:**
    *   **Pan & Zoom:** Use mouse wheel/trackpad or controls to navigate.
    *   **Minimap:** Provides an overview and navigation aid.
    *   **Detail Panel:** Clicking/tapping on a component opens a Sheet displaying its label, type, configuration (if any), and values for all linked data points.
*   **Read-only:** Elements cannot be moved, connected, deleted, or configured.

### Edit Mode (Admin/Configurator Role)

*   **Activation:** Enabled when `isEditMode` in the Zustand store is `true` AND `currentUser.role` is `admin` (or your configured editing role).
*   **Component Palette:** Appears on the left, allowing users to drag new components onto the canvas.
    *   Components are defined in `components/sld/ui/SLDElementPalette.tsx` (`categorizedComponents`). Customize this list as needed.
*   **Element Manipulation:**
    *   **Move:** Drag nodes to reposition them.
    *   **Connect:** Drag from one component's handle (small circles) to another compatible handle to create connections (edges).
    *   **Select:** Click elements to select them for inspection. Hold `Shift` and drag to select multiple elements.
    *   **Delete:** Select an element and click the Trash icon in the Inspector Panel.
*   **Inspector Panel:** Appears on the right when an element is selected.
    *   **Properties Tab:** Edit basic properties like the element's `label`. Add more fields here for type-specific configurations (e.g., rated power for an inverter).
    *   **Data Linking Tab:** This is crucial for connecting the visual element to real-time data:
        1.  Click **"+ Add Data Link"**.
        2.  **Select Data Point:** Choose the desired `dataPointId` from the dropdown list (populated from the `dataPoints` in the Zustand store).
        3.  **Target Property:** Specify *what* the data point should affect on the element. Examples:
            *   `value`: Display the formatted data point value (used by `DataLabelNode`).
            *   `statusText`: Display a status string (e.g., "Running", "Stopped").
            *   `fillColor`: Change the background color (use CSS color values).
            *   `strokeColor`: Change the border/edge color.
            *   `visible`: Control visibility (map boolean DP using `valueMapping`).
            *   `powerOutput`: (Custom target for specific nodes like Inverter) Display power.
            *   `flowDirection`: Control edge animation ('forward', 'reverse', 'none').
            *   `animationSpeed`: Control edge animation speed (e.g., '10s', '2s').
        4.  **(Optional) Value Mapping:** Define rules to translate raw data point values into specific visual states (e.g., map `ON`/`OFF` strings to green/red `fillColor`, map numeric ranges to different colors, map flow direction numbers `1`/`-1`/`0` to `forward`/`reverse`/`none`). *Note: The UI for configuring mapping needs further development in `SLDInspectorPanel.tsx`.*
        5.  **(Optional) Format:** Define how numeric or boolean values should be displayed (precision, units, true/false labels). *Note: The UI for configuring format needs further development in `SLDInspectorPanel.tsx`.*
        6.  Click **"Apply Changes"** in the Inspector footer to update the element's configuration locally.
*   **Layout Persistence:** Click the **"Save Layout"** button (top-left in edit mode) to send the current node positions, connections, and configurations (including data point links) back to the backend via the `save-sld-widget-layout` WebSocket event.

## 5. Customization

*   **New Components:**
    1.  Define a new `SLDElementType` enum value in `types/sld.ts`.
    2.  Create a corresponding Node Data interface (e.g., `TransformerNodeData`) in `types/sld.ts`.
    3.  Create a new React component (e.g., `TransformerNode.tsx`) in `components/sld/nodes/`, implementing its visual appearance, handles, and data display logic (using `useAppStore` and node utility functions). Remember to `memo()` the component.
    4.  Add the new component type to the `nodeTypes` mapping in `SLDWidget.tsx`.
    5.  Add the component to the `categorizedComponents` array in `SLDElementPalette.tsx` so it can be dragged onto the canvas.
*   **Component Visuals:** Modify the JSX and Tailwind classes within each custom node component (`components/sld/nodes/*.tsx`) to change appearance. Use SVGs or icon libraries (like `react-icons`) for better representations.
*   **Data Point Definitions:** Update the `dataPoints` object in your Zustand store (`appStore.ts` or your central store) to reflect all available data points from your system.
*   **Inspector Fields:** Add more input fields to `SLDInspectorPanel.tsx` (within the `Properties` tab) based on the `elementType` to allow configuration of component-specific settings (store these in the node's `data.config` object).
*   **Advanced Mapping/Formatting UI:** Enhance `SLDInspectorPanel.tsx` to provide a more user-friendly interface for configuring complex `valueMapping` and `format` rules for data links.

## 6. WebSocket Integration Details

*   **Outgoing:**
    *   `{ type: 'get-layout', payload: { key: 'sld_...' } }` (Sent on mount/`layoutId` change)
    *   `{ type: 'save-sld-widget-layout', payload: { key: 'sld_...', layout: { nodes, edges, viewport } } }` (Sent on Save button click)
*   **Incoming:**
    *   `{ type: 'layout-data', payload: { key: 'sld_...', layout: SLDLayout } }` (Response to `get-layout`)
    *   `{ type: 'layout-error', payload: { key: 'sld_...', error: '...' } }` (If layout fetch fails)
    *   `{ type: 'data-update', payload: { updates: RealTimeData } }` (Your mechanism for broadcasting real-time data changes - update Zustand store on receipt)
    *   `{ type: 'layout-saved', payload: { key: 'sld_...' } }` (Optional confirmation from backend after saving)

Remember to adapt the specific `type` and `payload` structures to match your backend WebSocket protocol.