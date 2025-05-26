import {
    SLDLayout,
    SLDElementType,
    // Node Data types
    CustomNodeData, TextLabelNodeData, PanelNodeData, InverterNodeData, BreakerNodeData,
    TransformerNodeData, MeterNodeData, BusbarNodeData, GenericDeviceNodeData,
    GridNodeData, LoadNodeData, BatteryNodeData, DataLabelNodeData, GeneratorNodeData,
    SensorNodeData, PLCNodeData, ContactorNodeData, FuseNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData,
    // Edge Data type
    CustomFlowEdgeData
    // Removed duplicate import of CustomFlowEdgeData from the original problem context, assuming it's already imported above.
    // If reactflow types are needed and not implicitly part of SLDLayout's definition, they'd be imported:
    // import { Node, Edge } from 'reactflow';
} from '@/types/sld';

// Helper to create TextLabelNodeData (already provided)
const createTextLabelData = (
    data: Omit<TextLabelNodeData, 'elementType' | 'styleConfig'> & { styleConfig?: Partial<TextLabelNodeData['styleConfig']> }
): TextLabelNodeData => ({
  ...data,
  elementType: SLDElementType.TextLabel,
  styleConfig: { fontSize: '10px', color: 'var(--foreground)', fontWeight: 'normal', textAlign: 'center', backgroundColor: 'transparent', padding: '2px 4px', ...data.styleConfig, },
});


export const sldLayouts: Record<string, SLDLayout> = {
  'main_plant': {
    // ... (existing main_plant layout)
    layoutId: 'main_plant',
    meta: {
        description: "Main 1MW Solar Power Plant with MV Grid Connection.",
        author: "SLD Generator",
        version: "1.2.0"
    },
    nodes: [
      { id: 'main_plant_title_block', type: SLDElementType.TextLabel, position: { x: 450, y: 50 },
        data: createTextLabelData({ label: 'Plant Overview', text: '1MW Solar Power Plant - Main SLD', styleConfig: {fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }})},
      { id: 'grid_pcc', type: SLDElementType.Grid, position: { x: 450, y: 50 + 80 },
        data: { label: '11kV Utility PCC', elementType: SLDElementType.Grid, status: 'connected', config: { voltageLevel: "11kV", frequencyHz: 50 } } as GridNodeData },
      { id: 'grid_isolator_mv', type: SLDElementType.Isolator, position: { x: 450, y: 50 + 80 + 90},
        data: { label: 'GIS-01', elementType: SLDElementType.Isolator, status: 'closed', config: { poles: 3, loadBreak: true}} as IsolatorNodeData },
      { id: 'grid_export_import_meter', type: SLDElementType.Meter, position: { x: 450, y: 50 + 80 + 90 + 80 },
        data: { label: 'Grid Meter', elementType: SLDElementType.Meter, status: 'reading', config: { meterType: "PowerQuality", accuracyClass: "0.2S" } } as MeterNodeData },
      { id: 'main_mv_breaker', type: SLDElementType.Breaker, position: { x: 450, y: 50 + 80 + 90 + 80 + 80 },
        data: { label: 'VCB-MV-01', elementType: SLDElementType.Breaker, config: { type: "VCB", tripRatingAmps: 150, interruptingCapacitykA: 25 }, status: 'closed' } as BreakerNodeData },
      { id: 'step_up_tx', type: SLDElementType.Transformer, position: { x: 450, y: 50 + 80 + 90 + 80 + 80 + 110 },
        data: { label: 'T1 (Step-Up)', elementType: SLDElementType.Transformer, status: 'nominal',
            config: { primaryVoltage: "11kV", secondaryVoltage:"0.4kV", ratingMVA: "1.25MVA", vectorGroup: "Dyn11", impedancePercentage: 6 }
        } as TransformerNodeData },
      { id: 'main_lv_breaker_acb', type: SLDElementType.Breaker, position: { x: 450, y: 50 + 80 + 90 + 80 + 80 + 110 + 110 },
        data: { label: 'ACB-LV-01', elementType: SLDElementType.Breaker, config: { type: "ACB", tripRatingAmps: 2000, interruptingCapacitykA: 50 }, status: 'closed' } as BreakerNodeData },
      { id: 'main_lv_busbar', type: SLDElementType.Busbar, position: { x: 450, y: 50 + 80 + 90 + 80 + 80 + 110 + 110 + 90 },
        data: { label: 'Main LVDB (400V)', elementType: SLDElementType.Busbar, config: {width: 600, height:16, currentRatingAmps: 2000}, status: 'energized' } as BusbarNodeData },
      { id: 'mccb_inv_grp1', type: SLDElementType.Breaker, position: { x: 450 - 230, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 },
        data: { label: 'MCCB-INV-G1', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_1', type: SLDElementType.Inverter, position: { x: (450 - 230) - 70, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 },
        data: { label: 'INV-01', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_2', type: SLDElementType.Inverter, position: { x: (450 - 230) + 70, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 },
        data: { label: 'INV-02', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'mccb_inv_grp2', type: SLDElementType.Breaker, position: { x: 450 + 130, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 },
        data: { label: 'MCCB-INV-G2', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_3', type: SLDElementType.Inverter, position: { x: (450 + 130) - 70, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 },
        data: { label: 'INV-03', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_4', type: SLDElementType.Inverter, position: { x: (450 + 130) + 70, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 },
        data: { label: 'INV-04', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'jbox_inv1', type: SLDElementType.JunctionBox, position: { x: (450 - 230) - 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 },
        data: { label: 'JB-INV1', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 2 } } as JunctionBoxNodeData },
      { id: 'pv_str_1a', type: SLDElementType.Panel, position: { x: ((450 - 230) - 70) - 45, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 1A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_1b', type: SLDElementType.Panel, position: { x: ((450 - 230) - 70) + 45, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 1B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'jbox_inv2', type: SLDElementType.JunctionBox, position: { x: (450 - 230) + 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 },
        data: { label: 'JB-INV2', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 2 } } as JunctionBoxNodeData },
      { id: 'pv_str_2a', type: SLDElementType.Panel, position: { x: ((450 - 230) + 70) - 45, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 2A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_2b', type: SLDElementType.Panel, position: { x: ((450 - 230) + 70) + 45, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 2B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'jbox_inv3', type: SLDElementType.JunctionBox, position: { x: (450 + 130) - 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 },
        data: { label: 'JB-INV3', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 1 } } as JunctionBoxNodeData },
      { id: 'pv_str_3a', type: SLDElementType.Panel, position: { x: (450 + 130) - 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 3A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'jbox_inv4', type: SLDElementType.JunctionBox, position: { x: (450 + 130) + 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 },
        data: { label: 'JB-INV4', elementType: SLDElementType.JunctionBox, config: { numberOfStrings: 1 } } as JunctionBoxNodeData },
      { id: 'pv_str_4a', type: SLDElementType.Panel, position: { x: (450 + 130) + 70, y: ((50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90) + 90 + 90 },
        data: { label: 'PV Str 4A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'aux_tx', type: SLDElementType.Transformer, position: { x: 450 + 380, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 },
        data: { label: 'Aux TX', elementType: SLDElementType.Transformer, config: {ratingMVA: "0.1MVA", primaryVoltage: "0.4kV", secondaryVoltage: "0.4kV", vectorGroup: "Yyn0"}, status: 'nominal' } as TransformerNodeData},
      { id: 'aux_load_mccb', type: SLDElementType.Breaker, position: { x: 450 + 380, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 },
        data: { label: 'MCCB-AUX', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
      { id: 'aux_loads', type: SLDElementType.Load, position: { x: 450 + 380, y: (50 + 80 + 90 + 80 + 80 + 110 + 110 + 90) + 100 + 90 + 80},
        data: { label: 'Plant Aux Loads', elementType: SLDElementType.Load, status: 'active', config: {ratedPowerkW: 50} } as LoadNodeData},
      { id: 'plant_plc', type: SLDElementType.PLC, position: {x: 80, y: 50 + 80},
        data: {label: 'Plant Controller', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData },
      { id: 'weather_sensor', type: SLDElementType.Sensor, position: {x: 80, y: 50 + 80 + 90},
        data: {label: 'Weather Station', elementType: SLDElementType.Sensor, config: {sensorType: 'Irradiance'}, status: 'reading'} as SensorNodeData},
      { id: 'export_power_display', type: SLDElementType.DataLabel, position: {x: 450 + 200, y: (50 + 80 + 90 + 80) - 40},
        data: {label: 'Grid Export', elementType: SLDElementType.DataLabel, dataPointLinks: [{dataPointId: 'grid-export-power', targetProperty: 'value', format: {type: 'number', suffix:' MW', precision: 2}}]} as DataLabelNodeData },
    ],
    edges: [
      { id: 'e_grid_iso', source: 'grid_pcc', target: 'grid_isolator_mv', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_iso_meter', source: 'grid_isolator_mv', target: 'grid_export_import_meter', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_meter_mvcb', source: 'grid_export_import_meter', target: 'main_mv_breaker', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_mvcb_tx', source: 'main_mv_breaker', target: 'step_up_tx', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'MV'} as CustomFlowEdgeData },
      { id: 'e_tx_lvcb', source: 'step_up_tx', target: 'main_lv_breaker_acb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_lvcb_bus', source: 'main_lv_breaker_acb', target: 'main_lv_busbar', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_mccb_invg1', source: 'main_lv_busbar', target: 'mccb_inv_grp1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_mccb_invg2', source: 'main_lv_busbar', target: 'mccb_inv_grp2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_aux_tx', source: 'main_lv_busbar', target: 'aux_tx', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg1_inv1', source: 'mccb_inv_grp1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg1_inv2', source: 'mccb_inv_grp1', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv1a_jb1', source: 'pv_str_1a', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv1b_jb1', source: 'pv_str_1b', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb1_inv1', source: 'jbox_inv1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv2a_jb2', source: 'pv_str_2a', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv2b_jb2', source: 'pv_str_2b', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb2_inv2', source: 'jbox_inv2', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg2_inv3', source: 'mccb_inv_grp2', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg2_inv4', source: 'mccb_inv_grp2', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv3a_jb3', source: 'pv_str_3a', target: 'jbox_inv3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb3_inv3', source: 'jbox_inv3', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv4a_jb4', source: 'pv_str_4a', target: 'jbox_inv4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb4_inv4', source: 'jbox_inv4', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_auxtx_auxmccb', source: 'aux_tx', target: 'aux_load_mccb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_auxmccb_auxload', source: 'aux_load_mccb', target: 'aux_loads', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
    ],
    viewport: { x: -350, y: -20, zoom: 0.5 },
  },
  'secondary_plant': {
    // ... (existing secondary_plant layout)
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
            { id: 'util_feed_b', type: SLDElementType.Grid, position: { x: X_FEED_B, y: y },
              data: { label: 'Utility Feeder B', elementType: SLDElementType.Grid, status: 'connected'} as GridNodeData },
            { id: 'ats_main', type: SLDElementType.ATS, position: { x: X_CENTER, y: y += V_SPACE_S_MAJOR },
              data: { label: 'Main ATS', elementType: SLDElementType.ATS, status: 'on_feeder_a'} as ATSNodeData },
            { id: 'backup_gen_sec', type: SLDElementType.Generator, position: { x: X_GEN_PATH, y: (y + V_SPACE_S_MINOR + V_SPACE_S_MINOR) },
              data: { label: 'Backup Genset', elementType: SLDElementType.Generator, config: { ratingKVA: "500kVA"}, status: 'standby' } as GeneratorNodeData },
            { id: 'ats_gen_cb', type: SLDElementType.Breaker, position: { x: X_GEN_PATH, y: y + V_SPACE_S_MINOR },
              data: { label: 'Genset CB', elementType: SLDElementType.Breaker, status: 'open'} as BreakerNodeData},
            { id: 'substation_bus', type: SLDElementType.Busbar, position: { x: X_CENTER, y: y += V_SPACE_S_SECTION },
              data: { label: 'Substation Bus 400V', elementType: SLDElementType.Busbar, config: {width: 300, height: 12, currentRatingAmps: 2000}, status: 'energized' } as BusbarNodeData},
            { id: 'feeder1_cb', type: SLDElementType.Breaker, position: { x: X_CENTER - X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR },
              data: { label: 'Feeder 1 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
            { id: 'load_feeder1', type: SLDElementType.Load, position: { x: X_CENTER - X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR + V_SPACE_S_MINOR },
              data: { label: 'Critical Load A', elementType: SLDElementType.Load, config: { ratedPowerkW: 150}, status: 'active'} as LoadNodeData },
            { id: 'feeder2_cb', type: SLDElementType.Breaker, position: { x: X_CENTER + X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR },
              data: { label: 'Feeder 2 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
            { id: 'load_feeder2', type: SLDElementType.Load, position: { x: X_CENTER + X_LOAD_BRANCH_OFFSET, y: y + V_SPACE_S_MAJOR + V_SPACE_S_MINOR },
              data: { label: 'Non-Critical Load B', elementType: SLDElementType.Load, config: {ratedPowerkW: 200}, status: 'active'} as LoadNodeData },
            { id: 'scada_plc', type: SLDElementType.PLC, position: {x: X_SCADA, y: (Y_START + V_SPACE_S_TITLE + V_SPACE_S_MAJOR)},
              data: {label: 'Substation SCADA', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData},
        ];
    })(),
    edges: [
      { id: 'e_feedA_ats', source: 'util_feed_a', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_primary', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_feedB_ats', source: 'util_feed_b', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_secondary', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_ats_bus', source: 'ats_main', target: 'substation_bus', sourceHandle: 'bottom_out', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_gen_atscb', source: 'backup_gen_sec', target: 'ats_gen_cb', sourceHandle:'bottom', targetHandle:'top', data:{flowType:'AC'} as CustomFlowEdgeData},
      { id: 'e_atscb_ats', source: 'ats_gen_cb', target: 'ats_main', sourceHandle:'bottom', targetHandle:'top_backup', data:{flowType:'AC'} as CustomFlowEdgeData},
      { id: 'e_bus_f1cb', source: 'substation_bus', target: 'feeder1_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f1cb_load1', source: 'feeder1_cb', target: 'load_feeder1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_bus_f2cb', source: 'substation_bus', target: 'feeder2_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f2cb_load2', source: 'feeder2_cb', target: 'load_feeder2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
    ],
    viewport: { x: -150, y: -10, zoom: 0.75 },
  },
  'empty_template': {
    // ... (existing empty_template layout)
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
    // ... (existing new_project_canvas layout)
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

  'ranna_sld': {
    layoutId: 'ranna_sld',
    meta: { description: "Ranna Project SLD based on provided PDF", author: "SLD Generator", version: "1.0.0" },
    nodes: (() => {
        const nodes: any[] = []; // Changed from CustomNodeData[] to any[]
        let r_y_pos = 0;

        // --- Constants for Ranna SLD ---
        const R_Y_START = 50;
        const R_V_SPACE_GRID_TO_BUS = 40;
        const R_V_SPACE_BUS_TO_DDLO = 50;
        const R_V_SPACE_DDLO_TO_SA = 50;
        const R_V_SPACE_SA_TO_TX = 60;
        const R_V_SPACE_TX_TO_CT = 60; // From TX center to CTs
        const R_V_SPACE_CT_TO_MAIN_MCCB = 80; // Space for metering devices text labels or small nodes
        const R_V_SPACE_MAIN_MCCB_TO_LV_BUS = 50;
        const R_V_SPACE_LV_BUS_TO_SUB_MCCB = 50;
        const R_V_SPACE_SUB_MCCB_TO_INV_PAIR_JUNCTION = 50;
        const R_V_SPACE_INV_PAIR_JUNCTION_TO_INV = 50;
        const R_V_SPACE_INV_TO_DC_ISO = 60;
        const R_V_SPACE_DC_ISO_TO_PV = 60;

        const R_METER_OFFSET_X = 70; // Increased offset for better spacing
        const R_METER_V_SPACING = 30; // Increased vertical spacing

        const R_X_PATH_WIDTH = 600; // Increased path width for less clutter
        const R_X_PATH1_START = 100; // Adjusted start
        const R_X_PATH2_START = R_X_PATH1_START + R_X_PATH_WIDTH;
        const R_X_PATH3_START = R_X_PATH2_START + R_X_PATH_WIDTH;
        const R_X_NVD_BRANCH_START = R_X_PATH3_START + R_X_PATH_WIDTH / 2 + 70;


        // --- Title ---
        nodes.push({
            id: 'ranna_title', type: SLDElementType.TextLabel, position: { x: (R_X_PATH1_START + R_X_PATH3_START + R_X_PATH_WIDTH -100) / 2 , y: R_Y_START - 25 }, // Centered title
            data: createTextLabelData({ label: 'Ranna Project', text: 'Ranna Project SLD', styleConfig: { fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' } })
        });

        // --- HV Side ---
        r_y_pos = R_Y_START;
        nodes.push({ id: 'r_grid_income', type: SLDElementType.Grid, position: { x: R_X_PATH1_START - 120, y: r_y_pos }, // Moved slightly left
            data: { label: '33kV CEB Income', elementType: SLDElementType.Grid, status: 'connected', config: { voltageLevel: "33kV" } } as GridNodeData });

        r_y_pos += R_V_SPACE_GRID_TO_BUS;
        nodes.push({ id: 'r_hv_bus', type: SLDElementType.Busbar, position: { x: (R_X_PATH1_START - 50 + R_X_NVD_BRANCH_START - 50) / 2, y: r_y_pos }, // Extend bus to cover NVD branch start
            data: { label: '33kV Bus', elementType: SLDElementType.Busbar, config: { width: (R_X_NVD_BRANCH_START - (R_X_PATH1_START -50)), height: 8 }, status: 'energized' } as BusbarNodeData });

        const createTransformerPath = (pathId: string, baseX: number, subMccbType: "250A" | "400A", isPath3: boolean) => {
            const pathNodes: any[] = []; // Changed from CustomNodeData[] to any[]
            // pathEdges removed as it was unused
            let current_y = r_y_pos; // Starts from HV bus Y

            const ddlo_y = current_y + R_V_SPACE_BUS_TO_DDLO;
            pathNodes.push({ id: `${pathId}_ddlo`, type: SLDElementType.Isolator, position: { x: baseX, y: ddlo_y },
                data: { label: '36kV DDLO 5A', elementType: SLDElementType.Isolator, status: 'closed' } as IsolatorNodeData });

            const sa_y = ddlo_y + R_V_SPACE_DDLO_TO_SA;
            pathNodes.push({ id: `${pathId}_sa`, type: SLDElementType.GenericDevice, position: { x: baseX, y: sa_y },
                data: { label: '36kV SA CL-2 10kA', elementType: SLDElementType.GenericDevice, deviceType: 'SurgeArrester' } as GenericDeviceNodeData });

            const tx_y = sa_y + R_V_SPACE_SA_TO_TX;
            pathNodes.push({ id: `${pathId}_tx`, type: SLDElementType.Transformer, position: { x: baseX, y: tx_y },
                data: { label: `T/F -0${pathId.substring(1)}`, subLabel:'1250kVA 33/0.4kV', elementType: SLDElementType.Transformer, status: 'nominal',
                    config: { primaryVoltage: "33kV", secondaryVoltage: "0.4kV", ratingMVA: "1.25MVA", vectorGroup: "Dyn11" }
                } as TransformerNodeData });

            const ct_y = tx_y + R_V_SPACE_TX_TO_CT;
            // For CTs, using GenericDevice as SensorNodeData.config.sensorType is restrictive
            pathNodes.push({ id: `${pathId}_cts`, type: SLDElementType.GenericDevice, position: { x: baseX, y: ct_y },
                data: { label: 'CT', elementType: SLDElementType.GenericDevice, deviceType: 'CurrentTransformer' } as GenericDeviceNodeData });

            let meter_item_y = ct_y - 25; // place above main line slightly
            const meter_base_x = baseX + R_METER_OFFSET_X;

            if (!isPath3) {
                pathNodes.push({ id: `${pathId}_ammeter`, type: SLDElementType.Meter, position: { x: meter_base_x - R_METER_OFFSET_X/2, y: meter_item_y },
                    data: { label: '-O1 Ammeter', elementType: SLDElementType.Meter, config: { meterType: "SubMeter" } } as MeterNodeData });
                pathNodes.push({ id: `${pathId}_shunt`, type: SLDElementType.GenericDevice, position: { x: meter_base_x - R_METER_OFFSET_X/2, y: meter_item_y + R_METER_V_SPACING},
                    data: { label: 'Shunt', elementType: SLDElementType.GenericDevice, deviceType: 'Shunt' } as GenericDeviceNodeData });
                pathNodes.push({ id: `${pathId}_voltmeter`, type: SLDElementType.Meter, position: { x: meter_base_x + R_METER_OFFSET_X/2, y: meter_item_y },
                    data: { label: '-O1 Voltmeter', elementType: SLDElementType.Meter, config: { meterType: "SubMeter" } } as MeterNodeData });
                pathNodes.push({ id: `${pathId}_poweranalyzer`, type: SLDElementType.Meter, position: { x: meter_base_x + R_METER_OFFSET_X * 1.5, y: meter_item_y + R_METER_V_SPACING/2 },
                    data: { label: 'Power Analyzer', elementType: SLDElementType.Meter, config: { meterType: "PowerQuality" } } as MeterNodeData });
                 pathNodes.push({ id: `${pathId}_efr`, type: SLDElementType.GenericDevice, position: { x: meter_base_x - R_METER_OFFSET_X * 1.5, y: meter_item_y + R_METER_V_SPACING/2 }, // Placed left of CTs
                    data: { label: 'EFR', elementType: SLDElementType.GenericDevice, deviceType: 'RelayProtection' } as GenericDeviceNodeData });
            } else { // Path 3 has simpler metering as per PDF structure
                pathNodes.push({ id: `${pathId}_poweranalyzer`, type: SLDElementType.Meter, position: { x: meter_base_x + R_METER_OFFSET_X * 0.5, y: meter_item_y + R_METER_V_SPACING/2 },
                    data: { label: 'Power Analyzer', elementType: SLDElementType.Meter, config: { meterType: "PowerQuality" } } as MeterNodeData });
                pathNodes.push({ id: `${pathId}_voltmeter_p3`, type: SLDElementType.Meter, position: { x: meter_base_x - R_METER_OFFSET_X * 0.5, y: meter_item_y + R_METER_V_SPACING/2},
                    data: { label: '-O1 Voltmeter', elementType: SLDElementType.Meter, config: { meterType: "SubMeter" } } as MeterNodeData });
                 pathNodes.push({ id: `${pathId}_ammeter_p3`, type: SLDElementType.Meter, position: { x: meter_base_x - R_METER_OFFSET_X *0.5 , y: meter_item_y -R_METER_V_SPACING/2},
                    data: { label: '-O1 Ammeter', elementType: SLDElementType.Meter, config: { meterType: "SubMeter" } } as MeterNodeData });
            }


            const main_mccb_y = ct_y + R_V_SPACE_CT_TO_MAIN_MCCB;
            pathNodes.push({ id: `${pathId}_main_mccb`, type: SLDElementType.Breaker, position: { x: baseX, y: main_mccb_y },
                data: { label: '1250A 4P/TH/Adj MCCB', elementType: SLDElementType.Breaker, status: 'closed', config: { type: "MCCB", tripRatingAmps: 1250 } } as BreakerNodeData });

            const lv_bus_y = main_mccb_y + R_V_SPACE_MAIN_MCCB_TO_LV_BUS;
            const lv_bus_width = 320; // Slightly wider for 2 MCCB groups + spare
            pathNodes.push({ id: `${pathId}_lv_bus`, type: SLDElementType.Busbar, position: { x: baseX, y: lv_bus_y },
                data: { label: `${subMccbType} 4P/TH/Adj MCCB x 5`, elementType: SLDElementType.Busbar, config: { width: lv_bus_width, height: 6 }, status: 'energized' } as BusbarNodeData });

            const sub_mccb_y_offset = R_V_SPACE_LV_BUS_TO_SUB_MCCB;
            const inv_y_offset = sub_mccb_y_offset + R_V_SPACE_SUB_MCCB_TO_INV_PAIR_JUNCTION + R_V_SPACE_INV_PAIR_JUNCTION_TO_INV; // Combined offsets
            const dc_iso_y_offset = inv_y_offset + R_V_SPACE_INV_TO_DC_ISO;
            const pv_y_offset = dc_iso_y_offset + R_V_SPACE_DC_ISO_TO_PV;

            const mccb_group_offset = lv_bus_width / 3.5; // Offset for MCCB groups from bus center

            // Inverter Group 1 (T1, T2)
            const mccb1_x = baseX - mccb_group_offset;
            pathNodes.push({ id: `${pathId}_sub_mccb1_tap`, type: SLDElementType.GenericDevice, deviceType: 'TapPoint', position: { x: mccb1_x, y: lv_bus_y + sub_mccb_y_offset }, data: { label: '', elementType: SLDElementType.GenericDevice }}); // Tap point
            const inv1_x = mccb1_x - 40;
            const inv2_x = mccb1_x + 40;
            pathNodes.push({ id: `${pathId}_inv1`, type: SLDElementType.Inverter, position: { x: inv1_x, y: lv_bus_y + inv_y_offset },
                data: { label: `-T1`, elementType: SLDElementType.Inverter, status: 'running', config: { ratedPower: subMccbType === "250A" ? 75 : 120 } } as InverterNodeData });
            pathNodes.push({ id: `${pathId}_dc_iso1`, type: SLDElementType.Isolator, position: { x: inv1_x, y: lv_bus_y + dc_iso_y_offset },
                data: { label: 'DC Isolator x 11', elementType: SLDElementType.Isolator, status: 'closed' } as IsolatorNodeData });
            pathNodes.push({ id: `${pathId}_pv1`, type: SLDElementType.Panel, position: { x: inv1_x, y: lv_bus_y + pv_y_offset },
                data: { label: 'PV array x 11', elementType: SLDElementType.Panel } as PanelNodeData });

            pathNodes.push({ id: `${pathId}_inv2`, type: SLDElementType.Inverter, position: { x: inv2_x, y: lv_bus_y + inv_y_offset },
                data: { label: `-T2`, elementType: SLDElementType.Inverter, status: 'running', config: { ratedPower: subMccbType === "250A" ? 75 : 120 } } as InverterNodeData });
            pathNodes.push({ id: `${pathId}_dc_iso2`, type: SLDElementType.Isolator, position: { x: inv2_x, y: lv_bus_y + dc_iso_y_offset },
                data: { label: 'DC Isolator x 11', elementType: SLDElementType.Isolator, status: 'closed' } as IsolatorNodeData });
            pathNodes.push({ id: `${pathId}_pv2`, type: SLDElementType.Panel, position: { x: inv2_x, y: lv_bus_y + pv_y_offset },
                data: { label: 'PV array x 11', elementType: SLDElementType.Panel } as PanelNodeData });

            // Inverter Group 2 (T3, T4)
            const mccb2_x = baseX; // Centered on bus for the second group
            pathNodes.push({ id: `${pathId}_sub_mccb2_tap`, type: SLDElementType.GenericDevice, deviceType: 'TapPoint', position: { x: mccb2_x, y: lv_bus_y + sub_mccb_y_offset }, data: { label: '', elementType: SLDElementType.GenericDevice }}); // Tap point
            const inv3_x = mccb2_x - 40;
            const inv4_x = mccb2_x + 40;
            pathNodes.push({ id: `${pathId}_inv3`, type: SLDElementType.Inverter, position: { x: inv3_x, y: lv_bus_y + inv_y_offset },
                data: { label: `-T3`, elementType: SLDElementType.Inverter, status: 'running', config: { ratedPower: subMccbType === "250A" ? 75 : 120 } } as InverterNodeData });
            pathNodes.push({ id: `${pathId}_dc_iso3`, type: SLDElementType.Isolator, position: { x: inv3_x, y: lv_bus_y + dc_iso_y_offset },
                data: { label: 'DC Isolator x 11', elementType: SLDElementType.Isolator, status: 'closed' } as IsolatorNodeData });
            pathNodes.push({ id: `${pathId}_pv3`, type: SLDElementType.Panel, position: { x: inv3_x, y: lv_bus_y + pv_y_offset },
                data: { label: 'PV array x 11', elementType: SLDElementType.Panel } as PanelNodeData });

            pathNodes.push({ id: `${pathId}_inv4`, type: SLDElementType.Inverter, position: { x: inv4_x, y: lv_bus_y + inv_y_offset },
                data: { label: `-T4`, elementType: SLDElementType.Inverter, status: 'running', config: { ratedPower: subMccbType === "250A" ? 75 : 120 } } as InverterNodeData });
            pathNodes.push({ id: `${pathId}_dc_iso4`, type: SLDElementType.Isolator, position: { x: inv4_x, y: lv_bus_y + dc_iso_y_offset },
                data: { label: 'DC Isolator x 11', elementType: SLDElementType.Isolator, status: 'closed' } as IsolatorNodeData });
            pathNodes.push({ id: `${pathId}_pv4`, type: SLDElementType.Panel, position: { x: inv4_x, y: lv_bus_y + pv_y_offset },
                data: { label: 'PV array x 11', elementType: SLDElementType.Panel } as PanelNodeData });

            // Spare MCCB
            const mccb_spare_x = baseX + mccb_group_offset;
            pathNodes.push({ id: `${pathId}_sub_mccb_spare`, type: SLDElementType.Breaker, position: { x: mccb_spare_x, y: lv_bus_y + sub_mccb_y_offset },
                data: { label: `Spare`, elementType: SLDElementType.Breaker, status: 'open', config: { type: "MCCB", tripRatingAmps: parseInt(subMccbType) } } as BreakerNodeData });
            
            nodes.push(...pathNodes);
        };

        createTransformerPath('p1', R_X_PATH1_START + (R_X_PATH_WIDTH - 100) / 2, "250A", false);
        createTransformerPath('p2', R_X_PATH2_START + (R_X_PATH_WIDTH - 100) / 2, "250A", false);
        createTransformerPath('p3', R_X_PATH3_START + (R_X_PATH_WIDTH - 100) / 2, "400A", true);

        // NVD T/F Branch
        const nvd_tx_y = r_y_pos + R_V_SPACE_BUS_TO_DDLO + R_V_SPACE_DDLO_TO_SA + R_V_SPACE_SA_TO_TX / 2; // Align roughly with main TX primary center
        nodes.push({ id: 'r_nvd_tx', type: SLDElementType.Transformer, position: { x: R_X_NVD_BRANCH_START, y: nvd_tx_y },
            data: { label: 'NVD T/F 33kV/110V', elementType: SLDElementType.Transformer, status: 'nominal',
                config: { primaryVoltage: "33kV", secondaryVoltage: "110V", ratingMVA: "0.05MVA" }
            } as TransformerNodeData });
        nodes.push({ id: 'r_micom_p127', type: SLDElementType.Meter, position: { x: R_X_NVD_BRANCH_START, y: nvd_tx_y + R_V_SPACE_TX_TO_CT },
            data: { label: 'MICOM P127 Voltmeter', elementType: SLDElementType.Meter, config: { meterType: "SubMeter" } } as MeterNodeData });


        return nodes;
    })(),
    edges: (() => {
        const edges: any[] = []; // Changed from CustomFlowEdgeData[] to any[]
        // HV Connections
        edges.push({ id: 'e_grid_hvbus', source: 'r_grid_income', target: 'r_hv_bus', sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'HV' }});
        
        const createPathEdges = (pathId: string, isPath3: boolean) => {
            edges.push({ id: `e_hvbus_${pathId}ddlo`, source: 'r_hv_bus', target: `${pathId}_ddlo`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'HV' }});
            edges.push({ id: `e_${pathId}ddlo_${pathId}sa`, source: `${pathId}_ddlo`, target: `${pathId}_sa`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'HV' }});
            edges.push({ id: `e_${pathId}sa_${pathId}tx`, source: `${pathId}_sa`, target: `${pathId}_tx`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'HV' }});
            edges.push({ id: `e_${pathId}tx_${pathId}cts`, source: `${pathId}_tx`, target: `${pathId}_cts`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            
            // Edges for metering displays (conceptual connections using smoothstep or similar)
            if (!isPath3) {
                edges.push({ id: `e_${pathId}ctsline_${pathId}ammeter`, source: `${pathId}_cts`, target: `${pathId}_ammeter`, type: 'smoothstep', sourceHandle: 'right', targetHandle: 'left', data: { flowType: 'ControlSignal' }});
                edges.push({ id: `e_${pathId}ctsline_${pathId}voltmeter`, source: `${pathId}_cts`, target: `${pathId}_voltmeter`, type: 'smoothstep', sourceHandle: 'right', targetHandle: 'left', data: { flowType: 'ControlSignal' }});
                edges.push({ id: `e_${pathId}ctsline_${pathId}pa`, source: `${pathId}_cts`, target: `${pathId}_poweranalyzer`, type: 'smoothstep', sourceHandle: 'right', targetHandle: 'left', data: { flowType: 'ControlSignal' }});
                edges.push({ id: `e_${pathId}ctsline_${pathId}efr`, source: `${pathId}_cts`, target: `${pathId}_efr`, type: 'smoothstep', sourceHandle: 'left', targetHandle: 'right', data: { flowType: 'ControlSignal' }});
                edges.push({ id: `e_${pathId}ctsline_${pathId}shunt`, source: `${pathId}_cts`, target: `${pathId}_shunt`, type: 'smoothstep', sourceHandle: 'right', targetHandle: 'left', data: { flowType: 'ControlSignal' }});
            } else {
                 edges.push({ id: `e_${pathId}ctsline_${pathId}pa_p3`, source: `${pathId}_cts`, target: `${pathId}_poweranalyzer`, type: 'smoothstep', sourceHandle: 'right', targetHandle: 'left', data: { flowType: 'ControlSignal' }});
                 edges.push({ id: `e_${pathId}ctsline_${pathId}voltmeter_p3`, source: `${pathId}_cts`, target: `${pathId}_voltmeter_p3`, type: 'smoothstep', sourceHandle: 'left', targetHandle: 'right', data: { flowType: 'ControlSignal' }});
                 edges.push({ id: `e_${pathId}ctsline_${pathId}ammeter_p3`, source: `${pathId}_cts`, target: `${pathId}_ammeter_p3`, type: 'smoothstep', sourceHandle: 'left', targetHandle: 'right', data: { flowType: 'ControlSignal' }});
            }

            edges.push({ id: `e_${pathId}cts_${pathId}mainmccb`, source: `${pathId}_cts`, target: `${pathId}_main_mccb`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}mainmccb_${pathId}lvbus`, source: `${pathId}_main_mccb`, target: `${pathId}_lv_bus`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});

            // Sub MCCB Taps -> Inverter Pairs
            edges.push({ id: `e_${pathId}lvbus_${pathId}submccb1tap`, source: `${pathId}_lv_bus`, target: `${pathId}_sub_mccb1_tap`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}submccb1tap_${pathId}inv1`, source: `${pathId}_sub_mccb1_tap`, target: `${pathId}_inv1`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}submccb1tap_${pathId}inv2`, source: `${pathId}_sub_mccb1_tap`, target: `${pathId}_inv2`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            
            edges.push({ id: `e_${pathId}inv1_${pathId}dciso1`, source: `${pathId}_inv1`, target: `${pathId}_dc_iso1`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}dciso1_${pathId}pv1`, source: `${pathId}_dc_iso1`, target: `${pathId}_pv1`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}inv2_${pathId}dciso2`, source: `${pathId}_inv2`, target: `${pathId}_dc_iso2`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}dciso2_${pathId}pv2`, source: `${pathId}_dc_iso2`, target: `${pathId}_pv2`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});

            edges.push({ id: `e_${pathId}lvbus_${pathId}submccb2tap`, source: `${pathId}_lv_bus`, target: `${pathId}_sub_mccb2_tap`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}submccb2tap_${pathId}inv3`, source: `${pathId}_sub_mccb2_tap`, target: `${pathId}_inv3`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}submccb2tap_${pathId}inv4`, source: `${pathId}_sub_mccb2_tap`, target: `${pathId}_inv4`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});

            edges.push({ id: `e_${pathId}inv3_${pathId}dciso3`, source: `${pathId}_inv3`, target: `${pathId}_dc_iso3`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}dciso3_${pathId}pv3`, source: `${pathId}_dc_iso3`, target: `${pathId}_pv3`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}inv4_${pathId}dciso4`, source: `${pathId}_inv4`, target: `${pathId}_dc_iso4`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            edges.push({ id: `e_${pathId}dciso4_${pathId}pv4`, source: `${pathId}_dc_iso4`, target: `${pathId}_pv4`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'DC', voltageLevel: 'LV' }});
            
            // Spare MCCB
            edges.push({ id: `e_${pathId}lvbus_${pathId}submccb_spare`, source: `${pathId}_lv_bus`, target: `${pathId}_sub_mccb_spare`, sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV' }});
        };

        createPathEdges('p1', false);
        createPathEdges('p2', false);
        createPathEdges('p3', true);

        // NVD T/F Branch
        edges.push({ id: 'e_hvbus_nvdtx', source: 'r_hv_bus', target: 'r_nvd_tx', sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'HV' }});
        edges.push({ id: 'e_nvdtx_micom', source: 'r_nvd_tx', target: 'r_micom_p127', sourceHandle: 'bottom', targetHandle: 'top', data: { flowType: 'AC', voltageLevel: 'LV_Control' }}); // 110V

        return edges;
    })(),
    viewport: { x: -250, y: 0, zoom: 0.25 }, // Adjusted zoom further for wide SLD
  },
};