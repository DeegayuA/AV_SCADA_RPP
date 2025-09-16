// config/sldLayouts.ts
import {
    SLDLayout,
    SLDElementType,
    // Node Data types
    CustomNodeData, TextLabelNodeData, PanelNodeData, InverterNodeData, BreakerNodeData,
    TransformerNodeData, MeterNodeData, BusbarNodeData, GenericDeviceNodeData,
    GridNodeData, LoadNodeData, BatteryNodeData, DataLabelNodeData, GeneratorNodeData,
    SensorNodeData, PLCNodeData, ContactorNodeData, FuseNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData, WindTurbineNodeData, WindInverterNodeData,
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
          },
          dataPointLinks: [
            { dataPointId: 'sim_tank_level_1', targetProperty: 'value' },
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