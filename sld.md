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
    *   Adapt the example `appStore.ts` or merge its state (`opcUaNodeValues`, `dataPoints`, `isEditMode`, `currentUser`) and actions into your existing central Zustand store. The `opcUaNodeValues` field will store the live OPC UA data.
    *   Ensure your WebSocket logic (similar to the one described in `hooks/useWebSocketListener.ts`) updates the `opcUaNodeValues` in the store when new typeless OPC UA data messages arrive.
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
  // Assuming UserRole.ADMIN is defined in your auth types (e.g., @/types/auth)
  const canToggleEdit = currentUser?.role === 'admin'; // Or UserRole.ADMIN if using an enum

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
*   **Real-time Updates:** Component visuals (colors, text) and connection animations update automatically based on `opcUaNodeValues` from the Zustand store, as configured via `dataPointLinks`. For a detailed explanation, see the "Real-time Data Flow and Element Updates" section.
*   **Interactivity:**
    *   **Pan & Zoom:** Use mouse wheel/trackpad or controls to navigate.
    *   **Minimap:** Provides an overview and navigation aid.
    *   **Detail Panel:** Clicking/tapping on a component opens a Sheet displaying its label, type, configuration (if any), and values for all linked data points.
*   **Read-only:** Elements cannot be moved, connected, deleted, or configured.

### Edit Mode (Admin/Configurator Role)

*   **Activation:** Enabled when `isEditMode` in the Zustand store is `true` AND `currentUser.role` is `'admin'` (or `UserRole.ADMIN` if using an enum from your auth types, e.g., `@/types/auth`).
*   **Component Palette:** Appears on the left, allowing users to drag new components onto the canvas.
    *   Components are defined in `components/sld/ui/SLDElementPalette.tsx` (`categorizedComponents`). Customize this list as needed.
*   **Element Manipulation:**
    *   **Move:** Drag nodes to reposition them.
    *   **Connect:** Drag from one component's handle (small circles) to another compatible handle to create connections (edges).
    *   **Select:** Click elements to select them for inspection. Hold `Shift` and drag to select multiple elements.
    *   **Delete:** Select an element and click the Trash icon in the Inspector Panel.
*   **Inspector Panel:** Appears on the right when an element is selected.
    *   **Properties Tab:** Edit basic properties like the element's `label`. Add more fields here for type-specific configurations (e.g., rated power for an inverter).
    *   **Data Linking Tab:** This is crucial for connecting the visual element to real-time data. It allows you to define how data from `appStore.opcUaNodeValues` (identified by a `dataPointId`) influences the appearance or displayed information of an SLD element.
        1.  **Add Data Link:** Click the "+ Add Data Link" button to create a new link.
        2.  **Select Data Point:** From the dropdown (populated from `appStore.dataPoints`), choose the `dataPointId` that corresponds to an OPC UA Node ID whose live value you want to use.
        3.  **Target Property:** Specify which visual or data aspect of the SLD element this data point should control (e.g., `value` for `DataLabelNode`, `style.color` for dynamic coloring, `animation.speed` for edges).
        4.  **Value Mapping (Optional):** Define rules to translate raw data values from `opcUaNodeValues` into more meaningful display values or visual states (e.g., map boolean `true`/`false` to "Online"/"Offline", or numeric status codes to specific colors). The UI for configuring this is part of `SLDInspectorPanel.tsx`.
        5.  **Format (Optional):** Specify how numeric or other data types should be formatted for display (e.g., decimal places, units suffix). The UI for configuring this is part of `SLDInspectorPanel.tsx`.
        6.  **Apply Changes:** Save the link configuration to the element.
        *For a comprehensive explanation of how these links are processed with live data, refer to the "Real-time Data Flow and Element Updates" section.*
*   **Layout Persistence:** Click the **"Save Layout"** button (top-right in edit mode) to send the current node positions, connections, and all configurations (including `dataPointLinks` for each element) back to the backend via the `save-sld-widget-layout` WebSocket message.

## 5. Customization

*   **New Components:**
    1.  Define a new `SLDElementType` enum value in `types/sld.ts`.
    2.  Create a corresponding Node Data interface (e.g., `TransformerNodeData`) in `types/sld.ts`.
    3.  Create a new React component (e.g., `TransformerNode.tsx`) in `components/sld/nodes/`, implementing its visual appearance, handles, and data display logic (using `useAppStore` and node utility functions). Remember to `memo()` the component.
    4.  Add the new component type to the `nodeTypes` mapping in `SLDWidget.tsx`.
    5.  Add the component to the `categorizedComponents` array in `SLDElementPalette.tsx` so it can be dragged onto the canvas.
*   **Component Visuals:** Modify the JSX and Tailwind classes within each custom node component (`components/sld/nodes/*.tsx`) to change appearance. Use SVGs or icon libraries (like `react-icons`) for better representations.
*   **Data Point Definitions:** Update the `dataPoints` object in `config/dataPoints.ts` (which initializes `appStore.dataPoints`) to reflect all available OPC UA Node IDs and their associated metadata (like units, names, default formatting) from your system.
*   **Inspector Fields:** Add more input fields to `SLDInspectorPanel.tsx` (within the `Properties` tab) based on the `elementType` to allow configuration of component-specific settings (store these in the node's `data.config` object).
*   **Advanced Mapping/Formatting UI:** Enhance `SLDInspectorPanel.tsx` to provide a more user-friendly interface for configuring complex `valueMapping` and `format` rules for data links.

## 6. WebSocket Integration Details

The SLD widget and its underlying data mechanisms rely on specific WebSocket message structures, primarily managed by `hooks/useWebSocketListener.ts` and consumed by `SLDWidget.tsx` and `appStore.ts`.

*   **Outgoing Messages (from Client to Server):**
    *   **Requesting a Layout:**
        *   Message: `{ type: 'get-layout', payload: { key: 'sld_LAYOUT_ID' } }`
        *   Purpose: Sent by `SLDWidget.tsx` when it mounts or when the `layoutId` prop changes, to request the structural data for an SLD. `LAYOUT_ID` is the specific ID of the layout to fetch.
    *   **Saving a Layout:**
        *   Message: `{ type: 'save-sld-widget-layout', payload: { key: 'sld_LAYOUT_ID', layout: { nodes, edges, viewport } } }`
        *   Purpose: Sent by `SLDWidget.tsx` when an administrator clicks the "Save Layout" button in edit mode. It sends the complete layout structure (nodes, edges, and viewport settings) to the server for persistence.

*   **Incoming Messages (from Server to Client):**
    *   **Layout Data Response:**
        *   Message: `{ type: 'layout-data', payload: { key: 'sld_LAYOUT_ID', layout: SLDLayout } }`
        *   Purpose: The server's successful response to a `get-layout` request. The `SLDLayout` object contains the nodes, edges, and potentially viewport information for the requested layout. Handled by `SLDWidget.tsx`.
    *   **Layout Error Response:**
        *   Message: `{ type: 'layout-error', payload: { key: 'sld_LAYOUT_ID', error: 'Error message details' } }`
        *   Purpose: Sent by the server if fetching a layout fails. Handled by `SLDWidget.tsx`.
    *   **Layout Saved Confirmation:**
        *   Message: `{ type: 'layout-saved-confirmation', payload: { key: 'sld_LAYOUT_ID' } }`
        *   Purpose: Confirms that a layout save operation was successful on the server. Handled by `SLDWidget.tsx` to provide user feedback.
    *   **Layout Save Error:**
        *   Message: `{ type: 'layout-save-error', payload: { key: 'sld_LAYOUT_ID', error: 'Error message details' } }`
        *   Purpose: Indicates that a layout save operation failed on the server. Handled by `SLDWidget.tsx`.
    *   **Real-time OPC UA Data Updates (Messages *without* a `type` property):**
        *   Example Message: `{"OPC_Node_ID_1": "value1", "OPC_Node_ID_2": 123.45, "OPC_Node_ID_3": true}`
        *   Purpose: These messages broadcast live data values from the OPC UA server. They are distinguished by *not* having a `type` field at the root of the JSON object.
        *   Handling: `useWebSocketListener.ts` identifies these messages, extracts the key-value pairs (where keys are OPC UA Node IDs and values are their current states), and updates the `opcUaNodeValues` object in the `appStore`. This is the primary mechanism for feeding live data to the SLD components.

For a detailed breakdown of how this data flows from the WebSocket through the application to update SLD elements, see the "Real-time Data Flow and Element Updates" section below.

Remember to adapt the specific `type`, `payload` structures, and OPC UA Node ID formats to match your backend WebSocket protocol and OPC UA server configuration.

## 7. Real-time Data Flow and Element Updates

This section details the data flow for the Single Line Diagram (SLD) components within the application, from WebSocket message reception to visual updates on the screen.

**7.1. WebSocket Message Reception (`useWebSocketListener.ts`)**

*   The `useWebSocketListener` hook (located in `hooks/useWebSocketListener.ts`) is responsible for establishing and managing the WebSocket connection with the server (URL defined in `config/constants.ts`).
*   It listens for incoming messages via its `onmessage` event handler.
*   When a message is received, it's first parsed as JSON.
*   The listener then inspects the parsed message for a `type` property at its root.

**7.2. OPC UA Data Handling (Messages *without* a `type` property)**

*   **Identification:** If the parsed JSON message *lacks* a `type` property (or `type` is falsy), `useWebSocketListener.ts` treats it as a batch of OPC UA data updates.
*   **Processing:** It iterates through the top-level keys of the message object. Each key is assumed to be an OPC UA Node ID, and its corresponding value is the live data for that node.
*   **Store Update:** These key-value pairs are collected into an `opcDataPayload` object (e.g., `{"Solar_Output_kW": 150.75, "Inverter_1_Status": 1}`).
*   This payload is then passed to the `appStore` by calling `useAppStore.getState().updateOpcUaNodeValues(opcDataPayload)`.
*   **`appStore.updateOpcUaNodeValues` Action (in `stores/appStore.ts`):** This action merges the received `opcDataPayload` into the `state.opcUaNodeValues` object. This ensures that the store always holds the latest raw values for all OPC UA nodes, keyed by their Node IDs.

**7.3. Structured Message Handling (Messages *with* a `type` property)**

*   **Identification:** If the parsed JSON message *has* a `type` property (e.g., `type: "layout-data"`), it's considered a structured message intended for specific application logic.
*   **Processing in `useWebSocketListener.ts`:** The entire message object is stored in the `lastJsonMessage` state variable within the `useWebSocket` hook. Components consuming this hook can then react to changes in `lastJsonMessage`.
*   **Layout Management in `SLDWidget.tsx` (in `app/circuit/sld/SLDWidget.tsx`):**
    *   `SLDWidget.tsx` utilizes the `useWebSocket` hook and monitors `lastJsonMessage`.
    *   When a message with `type: "layout-data"` is received, `SLDWidget.tsx` processes its `payload.layout`. This payload contains the nodes, edges, and viewport information for a specific SLD.
    *   The widget updates its internal state (`nodes`, `edges`) with this layout information, causing ReactFlow to re-render the diagram structure.
    *   It also handles other layout-related messages like `layout-error`, `layout-saved-confirmation`, etc., as detailed in the "WebSocket Integration Details" section.

**7.4. Roles of `appStore.opcUaNodeValues` and `appStore.dataPoints`**

*   **`appStore.opcUaNodeValues: Record<string, string | number | boolean>`** (in `stores/appStore.ts`)
    *   **Role:** Stores the **live, dynamic data values** received from the OPC UA server (via WebSocket messages without a `type`).
    *   **Content:** A simple key-value map where keys are OPC UA Node IDs (strings, e.g., "Inverter_1_Power_Output") and values are the latest raw data (string, number, or boolean).
    *   **Updates:** Continuously updated by `useWebSocketListener.ts` as new OPC UA data arrives.
    *   **Persistence:** Not persisted to `localStorage` as it's meant to be live data.

*   **`appStore.dataPoints: Record<string, DataPoint>`** (in `stores/appStore.ts`)
    *   **Role:** Stores **static metadata** that describes each data point. This metadata provides context and display information.
    *   **Content:** A key-value map where keys are `DataPoint ID`s (e.g., "Solar_Power_Total", "Inverter_Status_1"). These IDs are typically the same as the OPC UA Node IDs used in `opcUaNodeValues`. The values are `DataPoint` objects (defined in `types/sld.ts`), which include properties like:
        *   `id`: The DataPoint ID.
        *   `name`: A descriptive name.
        *   `label`: A display label.
        *   `unit`: The unit of measurement (e.g., "kW", "V", "°C").
        *   `category`: Grouping information.
        *   `dataType`: The expected data type (e.g., "float", "boolean", "integer").
        *   Other configuration like default formatting or thresholds.
    *   **Initialization:** Loaded from configuration files (e.g., `config/dataPoints.ts`) when the application starts.
    *   **Updates:** Generally static but could be updated if the underlying configuration changes.
    *   **Persistence:** Not persisted to `localStorage` as it's derived from configuration.

**7.5. Data Linking in SLD Node/Edge Components**

*   **`data.dataPointLinks` Array:**
    *   Each custom SLD node (e.g., `DataLabelNode.tsx`, `InverterNode.tsx`) and edge (e.g., `AnimatedFlowEdge.tsx`) receives its configuration as part of its `data` prop. This data is loaded initially by `SLDWidget.tsx` as part of the overall layout.
    *   A crucial part of this `data` object is the `dataPointLinks: DataPointLink[]` array (defined in `types/sld.ts`).
    *   This array is configured during edit mode using the **Inspector Panel's "Data Linking Tab"** (UI in `app/circuit/sld/ui/SLDInspectorDialog.tsx`). The inspector allows users to define how specific data points from the system should affect the visual properties of an SLD element.

*   **`DataPointLink` Object Structure:** Each object in the `dataPointLinks` array typically contains:
    *   `dataPointId: string`: The ID of the `DataPoint` (from `appStore.dataPoints`) whose live value will be used. This ID is used to look up values in `appStore.opcUaNodeValues`.
    *   `targetProperty: string`: Specifies which visual aspect or internal property of the node/edge this data point should control (e.g., `"value"`, `"text"`, `"style.color"`, `"style.visibility"`, `"animation.speed"`).
    *   `valueMapping?: Record<string | number, any>`: (Optional) Defines how raw data point values should be mapped to different display values or states (e.g., `{0: "Off", 1: "On", 2: "Error"}` or `{"true": "green", "false": "red"}`).
    *   `format?: ValueFormatOptions`: (Optional) Specifies formatting rules for the value, such as number of decimal places, prefixes/suffixes (e.g., `format: { type: "number", decimalPlaces: 2, suffix: " kW" }`).

**7.6. Data Retrieval and Re-Renders in Components**

*   **Accessing Live Data:**
    *   Individual SLD components need to access the live values for the `dataPointId`s specified in their `dataPointLinks`.
    *   They can achieve this in two primary ways:
        1.  **`useOpcUaNodeValue(nodeId)` Hook:** This hook (from `stores/appStore.ts`) takes an OPC UA Node ID (which is typically the `dataPointId` from a link) and subscribes the component *only* to changes for that specific node's value in `appStore.opcUaNodeValues`. This is the more performant way as it prevents unnecessary re-renders if other unrelated data points change.
        2.  **Direct Store Access:** Some components might access the entire `opcUaNodeValues` object from the store (e.g., `useAppStore(state => state.opcUaNodeValues)`). While simpler, this can lead to more frequent re-renders if any OPC UA value changes, not just the ones relevant to the component. (Example: `DataLabelNode.tsx` in its current version uses this method for its main display).
*   **Triggering Re-renders:** When the value associated with a subscribed `dataPointId` changes in `opcUaNodeValues` (due to a WebSocket update), Zustand triggers a re-render of the components that are using that value (either via the specific hook or by being subscribed to the broader store object).

**7.7. Applying `valueMapping` and `format` Rules**

*   Once a component retrieves the raw data for its linked `dataPointId`, it processes this value according to the `valueMapping` and `format` rules defined in the corresponding `DataPointLink` object.
*   **`valueMapping`:**
    *   If a `valueMapping` is present in the link, the component uses it to translate the raw value. For example, if the raw value is `1` and `valueMapping` is `{"0": "Stopped", "1": "Running"}`, the component will use "Running". This can be used for text display, color names, status keywords, etc.
*   **`format`:**
    *   If `format` options are present, they are applied after `valueMapping`. This can include:
        *   Number formatting (decimal places, thousands separators).
        *   Adding prefixes or suffixes (e.g., units like "kW", "%").
        *   Date/time formatting (if applicable).
*   **Visual Changes:** The result of these transformations (mapped and formatted value) is then used to update the `targetProperty` of the SLD element. This can manifest as:
    *   **Text:** Changing the text displayed by a `DataLabelNode` or other text elements.
    *   **Color:** Changing the fill color, stroke color, or text color of a node/edge.
    *   **Visibility:** Showing or hiding an element based on a boolean condition.
    *   **Animation Parameters:** Modifying properties like animation speed, flow direction (e.g., in `AnimatedFlowEdge.tsx`), or indicator states (e.g., blinking).
    *   Utility functions like `getDataPointValue`, `applyValueMapping`, `formatDisplayValue`, and `getDerivedStyle` (often found in `app/circuit/sld/nodes/nodeUtils.ts`) encapsulate this logic.

**7.8. Concise Data Journey Summary**

1.  **WebSocket Message:** Raw data arrives from the server. This can be:
    *   OPC UA values: JSON objects *without* a `type` field (e.g., `{"Sensor1": 25.5, "StatusLight": true}`).
    *   Structured messages: JSON objects *with* a `type` field (e.g., `{type: "layout-data", payload: {...}}`).
2.  **`useWebSocketListener.ts`:**
    *   Receives and parses the message.
    *   If OPC UA data (no `type`), it calls `appStore.getState().updateOpcUaNodeValues()` with the data.
    *   If structured message (has `type`), it updates its internal `lastJsonMessage` state. `SLDWidget.tsx` consumes this for layout changes (e.g., for `type: "layout-data"`).
3.  **`appStore.ts`:**
    *   `opcUaNodeValues` is updated with the latest live data from typeless messages. This state holds the current value for each OPC UA Node ID.
    *   `dataPoints` (loaded from `config/dataPoints.ts`) holds static metadata (name, unit, etc.) for these OPC UA Node IDs.
4.  **SLD Element Component (e.g., `DataLabelNode.tsx`, `AnimatedFlowEdge.tsx`):**
    *   Receives its configuration (including `dataPointLinks` array) as props from the layout managed by `SLDWidget.tsx`.
    *   For each relevant `DataPointLink`:
        *   It uses `useOpcUaNodeValue(link.dataPointId)` (or direct store access) to get the live data for that `dataPointId` from `appStore.opcUaNodeValues`.
        *   It applies any `valueMapping` and `format` rules defined in the `DataPointLink` to the raw data. It might use metadata from `appStore.dataPoints` (e.g., default unit) if the link's format options are not exhaustive.
5.  **Visual Update on Screen:**
    *   The processed data (e.g., a formatted string, a color value, a boolean for visibility) updates the component's visual properties, as specified by `link.targetProperty`.
    *   ReactFlow (and the component itself) re-renders, reflecting the new data as a visual change on the SLD.

This flow ensures that the SLD is a dynamic representation of the underlying system data, with clear separation of concerns between data reception, state management, layout definition, and component-level data interpretation and display.