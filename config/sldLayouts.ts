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

// Constants for main_plant layout
const MP_X_CENTER = 450;
const MP_X_CONTROL_PANEL = 80;
const MP_X_DATA_LABEL = MP_X_CENTER + 200;

const MP_X_INV_G1_MCCB = MP_X_CENTER - 230; // e.g., 220
const MP_X_INV_G1_INV_OFFSET = 70;
const MP_X_INV_G1_PV_OFFSET = 45;

const MP_X_INV_G2_MCCB = MP_X_CENTER + 130; // e.g., 580
const MP_X_INV_G2_INV_OFFSET = 70;
const MP_X_INV_G2_PV_OFFSET = 45;

const MP_X_AUX_BRANCH = MP_X_CENTER + 380; // e.g., 830

let mp_y_pos = 0; // current y position tracker

const MP_Y_START = 50;
const V_SPACE_TITLE_AREA = 80;
const V_SPACE_COMPONENT_MAJOR = 90;
const V_SPACE_COMPONENT_MINOR = 80;
const V_SPACE_SECTION = 110;
const V_SPACE_BUS_TO_BRANCH_MCCB = 100;
const V_SPACE_MCCB_TO_INV_ROW = 90;
const V_SPACE_INV_TO_JBOX_ROW = 90;
const V_SPACE_JBOX_TO_PV_ROW = 90;


export const sldLayouts: Record<string, SLDLayout> = {
  'main_plant': {
    layoutId: 'main_plant',
    meta: {
        description: "Main 1MW Solar Power Plant with MV Grid Connection.",
        author: "SLD Generator",
        version: "1.2.0" // Incremented version due to layout changes
    },
    nodes: [
      // --- Title ---
      { id: 'main_plant_title_block', type: SLDElementType.TextLabel, position: { x: MP_X_CENTER, y: mp_y_pos = MP_Y_START },
        data: createTextLabelData({ label: 'Plant Overview', text: '1MW Solar Power Plant - Main SLD', styleConfig: {fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }})},

      // --- TOP: Grid Connection & MV Section ---
      { id: 'grid_pcc', type: SLDElementType.Grid, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_TITLE_AREA },
        data: { label: '11kV Utility PCC', elementType: SLDElementType.Grid, status: 'connected', config: { voltageLevel: "11kV", frequencyHz: 50 } } as GridNodeData },
      { id: 'grid_isolator_mv', type: SLDElementType.Isolator, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_COMPONENT_MAJOR},
        data: { label: 'GIS-01', elementType: SLDElementType.Isolator, status: 'closed', config: { poles: 3, loadBreak: true}} as IsolatorNodeData },
      { id: 'grid_export_import_meter', type: SLDElementType.Meter, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_COMPONENT_MINOR },
        data: { label: 'Grid Meter', elementType: SLDElementType.Meter, status: 'reading', config: { meterType: "PowerQuality", accuracyClass: "0.2S" } } as MeterNodeData },
      { id: 'main_mv_breaker', type: SLDElementType.Breaker, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_COMPONENT_MINOR },
        data: { label: 'VCB-MV-01', elementType: SLDElementType.Breaker, config: { type: "VCB", tripRatingAmps: 150, interruptingCapacitykA: 25 }, status: 'closed' } as BreakerNodeData },

      // --- MIDDLE: Transformation & LV Distribution ---
      { id: 'step_up_tx', type: SLDElementType.Transformer, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_SECTION },
        data: { label: 'T1 (Step-Up)', elementType: SLDElementType.Transformer, status: 'nominal',
            config: { primaryVoltage: "11kV", secondaryVoltage:"0.4kV", ratingMVA: "1.25MVA", vectorGroup: "Dyn11", impedancePercentage: 6 }
        } as TransformerNodeData },
      { id: 'main_lv_breaker_acb', type: SLDElementType.Breaker, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_SECTION },
        data: { label: 'ACB-LV-01', elementType: SLDElementType.Breaker, config: { type: "ACB", tripRatingAmps: 2000, interruptingCapacitykA: 50 }, status: 'closed' } as BreakerNodeData },
      { id: 'main_lv_busbar', type: SLDElementType.Busbar, position: { x: MP_X_CENTER, y: mp_y_pos += V_SPACE_COMPONENT_MAJOR },
        data: { label: 'Main LVDB (400V)', elementType: SLDElementType.Busbar, config: {width: 600, height:16, currentRatingAmps: 2000}, status: 'energized' } as BusbarNodeData },

      // --- Inverter Group 1 Feeders (Left Branch from Busbar) ---
      { id: 'mccb_inv_grp1', type: SLDElementType.Breaker, position: { x: MP_X_INV_G1_MCCB, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB },
        data: { label: 'MCCB-INV-G1', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_1', type: SLDElementType.Inverter, position: { x: MP_X_INV_G1_MCCB - MP_X_INV_G1_INV_OFFSET, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW },
        data: { label: 'INV-01', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_2', type: SLDElementType.Inverter, position: { x: MP_X_INV_G1_MCCB + MP_X_INV_G1_INV_OFFSET, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW },
        data: { label: 'INV-02', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },

      // --- Inverter Group 2 Feeders (Right-ish Branch from Busbar) ---
      { id: 'mccb_inv_grp2', type: SLDElementType.Breaker, position: { x: MP_X_INV_G2_MCCB, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB },
        data: { label: 'MCCB-INV-G2', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_3', type: SLDElementType.Inverter, position: { x: MP_X_INV_G2_MCCB - MP_X_INV_G2_INV_OFFSET, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW },
        data: { label: 'INV-03', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_4', type: SLDElementType.Inverter, position: { x: MP_X_INV_G2_MCCB + MP_X_INV_G2_INV_OFFSET, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW },
        data: { label: 'INV-04', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },

      // --- PV Arrays (DC Side) - Below respective inverters ---
      // Current Y for Inverters: mp_y_pos (busbar_y) + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW
      // Let inv_row_y = mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW;
      // Let jbox_row_y = inv_row_y + V_SPACE_INV_TO_JBOX_ROW;
      // Let pv_row_y = jbox_row_y + V_SPACE_JBOX_TO_PV_ROW;

      // For INV-01
      { id: 'jbox_inv1', type: SLDElementType.JunctionBox, position: { x: MP_X_INV_G1_MCCB - MP_X_INV_G1_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW },
        data: { label: 'JB-INV1', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 2 } } as JunctionBoxNodeData },
      { id: 'pv_str_1a', type: SLDElementType.Panel, position: { x: (MP_X_INV_G1_MCCB - MP_X_INV_G1_INV_OFFSET) - MP_X_INV_G1_PV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW },
        data: { label: 'PV Str 1A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_1b', type: SLDElementType.Panel, position: { x: (MP_X_INV_G1_MCCB - MP_X_INV_G1_INV_OFFSET) + MP_X_INV_G1_PV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW },
        data: { label: 'PV Str 1B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      // For INV-02
      { id: 'jbox_inv2', type: SLDElementType.JunctionBox, position: { x: MP_X_INV_G1_MCCB + MP_X_INV_G1_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW },
        data: { label: 'JB-INV2', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 2 } } as JunctionBoxNodeData },
      { id: 'pv_str_2a', type: SLDElementType.Panel, position: { x: (MP_X_INV_G1_MCCB + MP_X_INV_G1_INV_OFFSET) - MP_X_INV_G1_PV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW },
        data: { label: 'PV Str 2A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_2b', type: SLDElementType.Panel, position: { x: (MP_X_INV_G1_MCCB + MP_X_INV_G1_INV_OFFSET) + MP_X_INV_G1_PV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW },
        data: { label: 'PV Str 2B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      // For INV-03
      { id: 'jbox_inv3', type: SLDElementType.JunctionBox, position: { x: MP_X_INV_G2_MCCB - MP_X_INV_G2_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW },
        data: { label: 'JB-INV3', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 1 } } as JunctionBoxNodeData },
      { id: 'pv_str_3a', type: SLDElementType.Panel, position: { x: MP_X_INV_G2_MCCB - MP_X_INV_G2_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW }, // Centered under JBox as only one string
        data: { label: 'PV Str 3A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      // For INV-04
      { id: 'jbox_inv4', type: SLDElementType.JunctionBox, position: { x: MP_X_INV_G2_MCCB + MP_X_INV_G2_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW },
        data: { label: 'JB-INV4', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 1 } } as JunctionBoxNodeData },
      { id: 'pv_str_4a', type: SLDElementType.Panel, position: { x: MP_X_INV_G2_MCCB + MP_X_INV_G2_INV_OFFSET, y: (mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_MCCB_TO_INV_ROW) + V_SPACE_INV_TO_JBOX_ROW + V_SPACE_JBOX_TO_PV_ROW }, // Centered under JBox
        data: { label: 'PV Str 4A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },

      // --- Auxiliary Loads (Far Right Branch from Busbar) ---
      // mp_y_pos is still busbar_y here
      { id: 'aux_tx', type: SLDElementType.Transformer, position: { x: MP_X_AUX_BRANCH, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB },
        data: { label: 'Aux TX', elementType: SLDElementType.Transformer, config: {ratingMVA: "0.1MVA", primaryVoltage: "0.4kV", secondaryVoltage: "0.4kV", vectorGroup: "Yyn0"}, status: 'nominal' } as TransformerNodeData},
      { id: 'aux_load_mccb', type: SLDElementType.Breaker, position: { x: MP_X_AUX_BRANCH, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_COMPONENT_MAJOR },
        data: { label: 'MCCB-AUX', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
      { id: 'aux_loads', type: SLDElementType.Load, position: { x: MP_X_AUX_BRANCH, y: mp_y_pos + V_SPACE_BUS_TO_BRANCH_MCCB + V_SPACE_COMPONENT_MAJOR + V_SPACE_COMPONENT_MINOR},
        data: { label: 'Plant Aux Loads', elementType: SLDElementType.Load, status: 'active', config: {ratedPowerkW: 50} } as LoadNodeData},

      // --- Monitoring & Control (Top Left / Top Right) ---
      { id: 'plant_plc', type: SLDElementType.PLC, position: {x: MP_X_CONTROL_PANEL, y: MP_Y_START + V_SPACE_TITLE_AREA}, // Align with Grid PCC vertically
        data: {label: 'Plant Controller', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData },
      { id: 'weather_sensor', type: SLDElementType.Sensor, position: {x: MP_X_CONTROL_PANEL, y: MP_Y_START + V_SPACE_TITLE_AREA + V_SPACE_COMPONENT_MAJOR}, // Below PLC
        data: {label: 'Weather Station', elementType: SLDElementType.Sensor, config: {sensorType: 'Irradiance'}, status: 'reading'} as SensorNodeData},
      { id: 'export_power_display', type: SLDElementType.DataLabel, position: {x: MP_X_DATA_LABEL, y: (MP_Y_START + V_SPACE_TITLE_AREA + V_SPACE_COMPONENT_MAJOR + V_SPACE_COMPONENT_MINOR) - 40}, // Near Grid Meter, slightly above
        data: {label: 'Grid Export', elementType: SLDElementType.DataLabel, dataPointLinks: [{dataPointId: 'grid-export-power', targetProperty: 'value', format: {type: 'number', suffix:' MW', precision: 2}}]} as DataLabelNodeData },
    ],
    edges: [
      // MV Side
      { id: 'e_grid_iso', source: 'grid_pcc', target: 'grid_isolator_mv', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_iso_meter', source: 'grid_isolator_mv', target: 'grid_export_import_meter', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_meter_mvcb', source: 'grid_export_import_meter', target: 'main_mv_breaker', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_mvcb_tx', source: 'main_mv_breaker', target: 'step_up_tx', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },

      // LV Side
      { id: 'e_tx_lvcb', source: 'step_up_tx', target: 'main_lv_breaker_acb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_lvcb_bus', source: 'main_lv_breaker_acb', target: 'main_lv_busbar', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },

      // Feeders from Main LV Bus
      { id: 'e_bus_mccb_invg1', source: 'main_lv_busbar', target: 'mccb_inv_grp1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_mccb_invg2', source: 'main_lv_busbar', target: 'mccb_inv_grp2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_aux_tx', source: 'main_lv_busbar', target: 'aux_tx', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },


      // Inverter Group 1 (AC side)
      { id: 'e_mccbg1_inv1', source: 'mccb_inv_grp1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg1_inv2', source: 'mccb_inv_grp1', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      // Inverter Group 1 (DC side) - PV Strings -> Junction Box -> Inverter
      { id: 'e_pv1a_jb1', source: 'pv_str_1a', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv1b_jb1', source: 'pv_str_1b', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb1_inv1', source: 'jbox_inv1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },

      { id: 'e_pv2a_jb2', source: 'pv_str_2a', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv2b_jb2', source: 'pv_str_2b', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb2_inv2', source: 'jbox_inv2', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },

       // Inverter Group 2 (similar to Group 1)
      { id: 'e_mccbg2_inv3', source: 'mccb_inv_grp2', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg2_inv4', source: 'mccb_inv_grp2', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },

      { id: 'e_pv3a_jb3', source: 'pv_str_3a', target: 'jbox_inv3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb3_inv3', source: 'jbox_inv3', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },

      { id: 'e_pv4a_jb4', source: 'pv_str_4a', target: 'jbox_inv4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb4_inv4', source: 'jbox_inv4', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },

      // Auxiliary Loads
      { id: 'e_auxtx_auxmccb', source: 'aux_tx', target: 'aux_load_mccb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_auxmccb_auxload', source: 'aux_load_mccb', target: 'aux_loads', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
    ],
    viewport: { x: -350, y: -20, zoom: 0.5 }, // Adjusted viewport slightly
  },

  'secondary_plant': {
    layoutId: 'secondary_plant',
    meta: { description: "Redundant Feeder Substation with ATS and Backup Generator", version: "1.1.0" },
    nodes: (()=>{
        let y = 0;
        const X_CENTER = 300;
        const X_FEED_A = 100;
        const X_FEED_B = 500;
        const X_GEN_PATH = X_CENTER;
        const X_LOAD_BRANCH_OFFSET = 120;
        const X_SCADA = X_CENTER + 280;

        const Y_START = 40;
        const V_SPACE_S_TITLE = 70;
        const V_SPACE_S_MAJOR = 90;
        const V_SPACE_S_MINOR = 80;
        const V_SPACE_S_SECTION = 100;

        return [
            { id: 'sec_plant_title', type: SLDElementType.TextLabel, position: {x: X_CENTER, y: y = Y_START},
              data: createTextLabelData({label: "Substation", text:"Substation Redundancy", styleConfig:{fontSize:'20px', fontWeight:'bold', color: 'var(--primary)'}})},

            { id: 'util_feed_a', type: SLDElementType.Grid, position: { x: X_FEED_A, y: y += V_SPACE_S_TITLE },
              data: { label: 'Utility Feeder A', elementType: SLDElementType.Grid, status: 'connected'} as GridNodeData },
            { id: 'util_feed_b', type: SLDElementType.Grid, position: { x: X_FEED_B, y: y }, // Same Y as Feeder A
              data: { label: 'Utility Feeder B', elementType: SLDElementType.Grid, status: 'connected'} as GridNodeData },

            { id: 'ats_main', type: SLDElementType.ATS, position: { x: X_CENTER, y: y += V_SPACE_S_MAJOR },
              data: { label: 'Main ATS', elementType: SLDElementType.ATS, status: 'on_feeder_a'} as ATSNodeData },

            // Backup Generator Path - visual up-feed to ATS
            { id: 'backup_gen_sec', type: SLDElementType.Generator, position: { x: X_GEN_PATH, y: (y + V_SPACE_S_MINOR + V_SPACE_S_MINOR) }, // Below ATS and its CB
              data: { label: 'Backup Genset', elementType: SLDElementType.Generator, config: { ratingKVA: "500kVA"}, status: 'standby' } as GeneratorNodeData },
            { id: 'ats_gen_cb', type: SLDElementType.Breaker, position: { x: X_GEN_PATH, y: y + V_SPACE_S_MINOR }, // Below ATS, above Gen
              data: { label: 'Genset CB', elementType: SLDElementType.Breaker, status: 'open'} as BreakerNodeData},

            { id: 'substation_bus', type: SLDElementType.Busbar, position: { x: X_CENTER, y: y += V_SPACE_S_SECTION }, // Main Y flow continues from ATS bottom
              data: { label: 'Substation Bus 400V', elementType: SLDElementType.Busbar, config: {width: 300, height: 12}, status: 'energized' } as BusbarNodeData},

            { id: 'feeder1_cb', type: SLDElementType.Breaker, position: { x: X_CENTER - X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR },
              data: { label: 'Feeder 1 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
            { id: 'load_feeder1', type: SLDElementType.Load, position: { x: X_CENTER - X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR + V_SPACE_S_MINOR },
              data: { label: 'Critical Load A', elementType: SLDElementType.Load, config: { ratedPowerkW: 150}, status: 'active'} as LoadNodeData },

            { id: 'feeder2_cb', type: SLDElementType.Breaker, position: { x: X_CENTER + X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR },
              data: { label: 'Feeder 2 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
            { id: 'load_feeder2', type: SLDElementType.Load, position: { x: X_CENTER + X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR + V_SPACE_S_MINOR },
              data: { label: 'Non-Critical Load B', elementType: SLDElementType.Load, config: {ratedPowerkW: 200}, status: 'active'} as LoadNodeData },

            { id: 'scada_plc', type: SLDElementType.PLC, position: {x: X_SCADA, y: (Y_START + V_SPACE_S_TITLE + V_SPACE_S_MAJOR)}, // Vertically align with ATS
              data: {label: 'Substation SCADA', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData},
        ];
    })(),
    edges: [
      { id: 'e_feedA_ats', source: 'util_feed_a', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_primary', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_feedB_ats', source: 'util_feed_b', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_secondary', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_ats_bus', source: 'ats_main', target: 'substation_bus', sourceHandle: 'bottom_out', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },

      // Backup Generator Path (Gen -> CB -> ATS backup input)
      // Visually, Gen is at bottom, CB above it, ATS backup input above CB
      { id: 'e_gen_atscb', source: 'backup_gen_sec', target: 'ats_gen_cb', sourceHandle:'bottom', targetHandle:'top', data:{flowType:'AC'} as CustomFlowEdgeData},
      { id: 'e_atscb_ats', source: 'ats_gen_cb', target: 'ats_main', sourceHandle:'bottom', targetHandle:'top_backup', data:{flowType:'AC'} as CustomFlowEdgeData},

      { id: 'e_bus_f1cb', source: 'substation_bus', target: 'feeder1_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f1cb_load1', source: 'feeder1_cb', target: 'load_feeder1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_bus_f2cb', source: 'substation_bus', target: 'feeder2_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f2cb_load2', source: 'feeder2_cb', target: 'load_feeder2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
    ],
    viewport: { x: -150, y: -10, zoom: 0.75 }, // Adjusted viewport
  },

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

  'new_project_canvas': {
    layoutId: 'new_project_canvas',
    meta: { description: "Default canvas for new, unnamed projects." },
    nodes: [
      { id: 'welcome_new_project', type: SLDElementType.TextLabel, position: { x: 350, y: 250 },
        data: createTextLabelData({
          label: 'New Project',
          text: 'New SLD Project\nStart by adding components or load an existing layout.',
          styleConfig: { fontSize: '18px', fontWeight: '500', color: 'var(--primary)', backgroundColor: 'var(--accent-soft)', padding: '20px', borderRadius:'8px', textAlign: 'center' }
        }),
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