import {
    SLDLayout,
    SLDElementType,
    // Node Data types
    CustomNodeData, TextLabelNodeData, PanelNodeData, InverterNodeData, BreakerNodeData,
    TransformerNodeData, MeterNodeData, BusbarNodeData, GenericDeviceNodeData,
    GridNodeData, LoadNodeData, BatteryNodeData, DataLabelNodeData, GeneratorNodeData,
    SensorNodeData, PLCNodeData, ContactorNodeData, FuseNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData, // Added JunctionBoxNodeData
    // Edge Data type
    CustomFlowEdgeData
} from '@/types/sld';

// Helper to create TextLabelNodeData
const createTextLabelData = (
    data: Omit<TextLabelNodeData, 'elementType' | 'styleConfig'> & { styleConfig?: Partial<TextLabelNodeData['styleConfig']> }
): TextLabelNodeData => ({
  ...data,
  elementType: SLDElementType.TextLabel,
  styleConfig: { fontSize: '12px', color: 'var(--foreground)', fontWeight: 'normal', textAlign: 'center', backgroundColor: 'transparent', padding: '2px 4px', ...data.styleConfig, },
});



export const sldLayouts: Record<string, SLDLayout> = {
  'empty_template': {
    layoutId: 'empty_template',
    meta: { description: "A blank canvas for starting new SLD designs." },
    nodes: [
        { id: 'empty_instructions', type: SLDElementType.TextLabel, position: { x: 300, y: 200 },
          data: createTextLabelData({ label: 'Empty Template', text: 'Empty Layout Template\n\nDrag components from the palette to begin.', styleConfig: { fontSize: '16px', color: 'var(--muted-foreground)', padding: '10px', textAlign: 'center' } }),
          draggable: false, selectable: false,
        },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  'ranna_2MW_wind_grid': {
    layoutId: 'ranna_2MW_wind_grid',
    meta: {
      name: 'Ranna 2MW Wind & Grid',
      description: 'An SLD for a 2MW system with a wind turbine and grid connection.',
    },
    nodes: [
      // Wind Turbine and Inverter
      {
        id: 'wind-turbine-1',
        type: SLDElementType.WindTurbine,
        position: { x: -200, y: 50 },
        data: {
          label: 'Wind Turbine 1',
          elementType: SLDElementType.WindTurbine,
          status: 'nominal',
          dataPointLinks: [
            { dataPointId: 'wind-turbine-1-speed', targetProperty: 'speed' },
            { dataPointId: 'wind-turbine-1-power', targetProperty: 'power' },
          ],
        },
      },
      {
        id: 'wind-inverter-1',
        type: SLDElementType.WindInverter,
        position: { x: -200, y: 200 },
        data: {
          label: 'Wind Inverter 1',
          elementType: SLDElementType.WindInverter,
          status: 'nominal',
          dataPointLinks: [
            { dataPointId: 'wind-inverter-1-power', targetProperty: 'power' },
          ],
        },
      },
      // Existing grid components
      {
        id: 'grid-1',
        type: SLDElementType.Grid,
        position: { x: 800, y: 150 },
        data: {
          label: 'National Grid',
          elementType: SLDElementType.Grid,
          status: 'nominal',
        },
      },
      // Busbars
      {
        id: 'busbar-ac-1',
        type: SLDElementType.Busbar,
        position: { x: 200, y: 150 },
        data: {
          label: 'AC Busbar',
          elementType: SLDElementType.Busbar,
          status: 'nominal',
        },
        style: { width: '400px', height: '10px' },
      },
      {
        id: 'busbar-wind',
        type: SLDElementType.Busbar,
        position: { x: -200, y: 300 },
        data: {
          label: 'Wind Busbar',
          elementType: SLDElementType.Busbar,
          status: 'nominal',
        },
        style: { width: '200px', height: '10px' },
      },
      // Breakers
      {
        id: 'breaker-grid',
        type: SLDElementType.Breaker,
        position: { x: 650, y: 140 },
        data: {
          label: 'Grid Breaker',
          elementType: SLDElementType.Breaker,
          status: 'closed',
        },
      },
      {
        id: 'breaker-wind',
        type: SLDElementType.Breaker,
        position: { x: 0, y: 290 },
        data: {
          label: 'Wind Breaker',
          elementType: SLDElementType.Breaker,
          status: 'closed',
        },
      },
    ],
    edges: [
      // Wind Turbine to Inverter
      { id: 'e-wind-turbine-to-inverter', source: 'wind-turbine-1', target: 'wind-inverter-1', data: { label: 'DC' } },
      // Inverter to Wind Busbar
      { id: 'e-wind-inverter-to-busbar', source: 'wind-inverter-1', target: 'busbar-wind', data: { label: 'AC' } },
      // Wind Busbar to Main Busbar
      { id: 'e-wind-busbar-to-main-busbar', source: 'busbar-wind', target: 'busbar-ac-1', sourceHandle: 'right', targetHandle: 'left', data: { label: 'AC' } },
      // Main Busbar to Grid
      { id: 'e-busbar-to-grid-breaker', source: 'busbar-ac-1', target: 'breaker-grid', sourceHandle: 'right', data: { label: 'AC' } },
      { id: 'e-grid-breaker-to-grid', source: 'breaker-grid', target: 'grid-1', data: { label: 'AC' } },
    ],
    viewport: { x: 0, y: 0, zoom: 0.8 },
  },
  'test_data_nodes_layout': {
    layoutId: 'test_data_nodes_layout',
    meta: { description: "Test layout for GenericDeviceNode and GaugeNode" },
    nodes: [
      {
        id: 'test-generic-device-1',
        type: SLDElementType.GenericDevice, // Ensure 'type' is set for React Flow
        position: { x: 100, y: 100 },
        data: {
          label: 'Sensor Array',
          elementType: SLDElementType.GenericDevice,
          config: { deviceType: 'Multi-Sensor' },
          dataPointLinks: [
            { dataPointId: 'sim_temp_1', targetProperty: 'value' },
            { dataPointId: 'sim_humidity_1', targetProperty: 'value' },
            { dataPointId: 'sim_pressure_1', targetProperty: 'value' },
          ],
        } as GenericDeviceNodeData,
      },
      {
        id: 'test-gauge-1',
        type: SLDElementType.Gauge, // Ensure 'type' is set for React Flow
        position: { x: 300, y: 100 },
        data: {
          label: 'Tank Level',
          elementType: SLDElementType.Gauge,
          config: {
            minVal: 0,
            maxVal: 100,
            unit: '%',
            // valueDataPointLink is preferred for GaugeNode specific value
            // but the requirement was to put it in dataPointLinks.
            // GaugeNode will try to use data.config.valueDataPointLink first,
            // then fall back to data.dataPointLinks[0] if targetProperty is 'value'.
            // To be explicit for GaugeNode's primary value, it should ideally be:
            // valueDataPointLink: { dataPointId: 'sim_tank_level_1', targetProperty: 'value' }
            // For now, adhering to the dataPointLinks array structure as requested for the test.
          },
          dataPointLinks: [
            // Link for the main value of the gauge.
            // GaugeNode will use the first link with targetProperty 'value' if valueDataPointLink isn't set in its config.
            { dataPointId: 'sim_tank_level_1', targetProperty: 'value' },
            // Example of a secondary link, perhaps for styling, though not directly used by GaugeNode's core value display.
            // { dataPointId: 'sim_tank_status_1', targetProperty: 'status' } 
          ],
        } as CustomNodeData, // Using CustomNodeData as GaugeNodeData might not be directly imported here yet
      },
      {
        id: 'test_layout_title',
        type: SLDElementType.TextLabel,
        position: { x: 200, y: 20 },
        data: createTextLabelData({
            label: 'Test Layout',
            text: 'Testing GenericDeviceNode & GaugeNode',
            styleConfig: { fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }
        }),
      }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1.5 },
  }
};