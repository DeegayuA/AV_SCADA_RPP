// config/sldLayouts.ts
import { 
    SLDLayout, 
    SLDElementType, 
    // Node Data types (ensure all used are imported)
    CustomNodeData, TextLabelNodeData, PanelNodeData, InverterNodeData, BreakerNodeData, 
    TransformerNodeData, MeterNodeData, BusbarNodeData, GenericDeviceNodeData, 
    GridNodeData, LoadNodeData, BatteryNodeData, DataLabelNodeData, GeneratorNodeData, 
    SensorNodeData, PLCNodeData, ContactorNodeData, FuseNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData, MotorNodeData, // Assuming these exist if used
    // Edge Data type
    CustomFlowEdgeData
} from '@/types/sld';

// Helper to create TextLabelNodeData (no changes from previous version)
const createTextLabelData = (
    data: Omit<TextLabelNodeData, 'elementType' | 'styleConfig'> & { styleConfig?: Partial<TextLabelNodeData['styleConfig']> }
): TextLabelNodeData => ({
  ...data,
  elementType: SLDElementType.TextLabel,
  styleConfig: { fontSize: '12px', color: 'var(--foreground)', fontWeight: 'normal', textAlign: 'center', backgroundColor: 'transparent', padding: '2px 4px', ...data.styleConfig, },
});

export const sldLayouts: Record<string, SLDLayout> = {
  'main_plant': {
    layoutId: 'main_plant',
    meta: {
        description: "Main 1MW Solar Power Plant with MV Grid Connection.",
        author: "SLD Generator",
        version: "1.1.0"
    },
    nodes: [
      // --- Title ---
      { id: 'main_plant_title_block', type: SLDElementType.TextLabel, position: { x: 350, y: 10 },
        data: createTextLabelData({ label: 'Plant Overview', text: '1MW Solar Power Plant - Main SLD', styleConfig: {fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }})},

      // --- TOP: Grid Connection & MV Section ---
      { id: 'grid_pcc', type: SLDElementType.Grid, position: { x: 350, y: 80 }, 
        data: { label: '11kV Utility PCC', elementType: SLDElementType.Grid, status: 'connected', config: { voltageLevel: "11kV", frequencyHz: 50 } } as GridNodeData },
      { id: 'grid_isolator_mv', type: SLDElementType.Isolator, position: { x: 350, y: 160},
        data: { label: 'GIS-01', elementType: SLDElementType.Isolator, status: 'closed', config: { poles: 3, loadBreak: true}} as IsolatorNodeData },
      { id: 'grid_export_import_meter', type: SLDElementType.Meter, position: { x: 350, y: 240 }, 
        data: { label: 'Grid Meter', elementType: SLDElementType.Meter, status: 'reading', config: { meterType: "PowerQuality", accuracyClass: "0.2S" } } as MeterNodeData },
      { id: 'main_mv_breaker', type: SLDElementType.Breaker, position: { x: 350, y: 320 }, 
        data: { label: 'VCB-MV-01', elementType: SLDElementType.Breaker, config: { type: "VCB", tripRatingAmps: 150, interruptingCapacitykA: 25 }, status: 'closed' } as BreakerNodeData },

      // --- MIDDLE: Transformation & LV Distribution ---
      { id: 'step_up_tx', type: SLDElementType.Transformer, position: { x: 350, y: 420 }, 
        data: { label: 'T1 (Step-Up)', elementType: SLDElementType.Transformer, status: 'nominal',
            config: { primaryVoltage: "11kV", secondaryVoltage:"0.4kV", ratingMVA: "1.25MVA", vectorGroup: "Dyn11", impedancePercentage: 6 } 
        } as TransformerNodeData },
      { id: 'main_lv_breaker_acb', type: SLDElementType.Breaker, position: { x: 350, y: 520 }, 
        data: { label: 'ACB-LV-01', elementType: SLDElementType.Breaker, config: { type: "ACB", tripRatingAmps: 2000, interruptingCapacitykA: 50 }, status: 'closed' } as BreakerNodeData },
      { id: 'main_lv_busbar', type: SLDElementType.Busbar, position: { x: 350, y: 600 }, 
        data: { label: 'Main LVDB (400V)', elementType: SLDElementType.Busbar, config: {width: 300, height:16, currentRatingAmps: 2000}, status: 'energized' } as BusbarNodeData },

      // --- Inverter Group 1 Feeders ---
      { id: 'mccb_inv_grp1', type: SLDElementType.Breaker, position: { x: 150, y: 680 }, 
        data: { label: 'MCCB-INV-G1', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_1', type: SLDElementType.Inverter, position: { x: 70, y: 760 }, 
        data: { label: 'INV-01', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_2', type: SLDElementType.Inverter, position: { x: 230, y: 760 }, 
        data: { label: 'INV-02', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      
      // --- Inverter Group 2 Feeders ---
      { id: 'mccb_inv_grp2', type: SLDElementType.Breaker, position: { x: 550, y: 680 }, 
        data: { label: 'MCCB-INV-G2', elementType: SLDElementType.Breaker, config: {type: "MCCB", tripRatingAmps: 800}, status: 'closed' } as BreakerNodeData },
      { id: 'inverter_3', type: SLDElementType.Inverter, position: { x: 470, y: 760 }, 
        data: { label: 'INV-03', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },
      { id: 'inverter_4', type: SLDElementType.Inverter, position: { x: 630, y: 760 }, 
        data: { label: 'INV-04', elementType: SLDElementType.Inverter, config: { ratedPower: 250 }, status: 'running' } as InverterNodeData },

      // --- PV Arrays (DC Side) - Below respective inverters ---
      // For INV-01
      { id: 'jbox_inv1', type: SLDElementType.JunctionBox, position: { x: 70, y: 850 }, data: { label: 'JB-INV1', elementType: SLDElementType.JunctionBox } as JunctionBoxNodeData },
      { id: 'pv_str_1a', type: SLDElementType.Panel, position: { x: 30, y: 930 }, data: { label: 'PV Str 1A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_1b', type: SLDElementType.Panel, position: { x: 110, y: 930 }, data: { label: 'PV Str 1B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      // For INV-02
      { id: 'jbox_inv2', type: SLDElementType.JunctionBox, position: { x: 230, y: 850 }, data: { label: 'JB-INV2', elementType: SLDElementType.JunctionBox } as JunctionBoxNodeData },
      { id: 'pv_str_2a', type: SLDElementType.Panel, position: { x: 190, y: 930 }, data: { label: 'PV Str 2A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'pv_str_2b', type: SLDElementType.Panel, position: { x: 270, y: 930 }, data: { label: 'PV Str 2B', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      // ... (PV Arrays for INV-03 and INV-04 would be similar, placed below them)
      { id: 'jbox_inv3', type: SLDElementType.JunctionBox, position: { x: 470, y: 850 }, data: { label: 'JB-INV3', elementType: SLDElementType.JunctionBox } as JunctionBoxNodeData },
      { id: 'pv_str_3a', type: SLDElementType.Panel, position: { x: 430, y: 930 }, data: { label: 'PV Str 3A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },
      { id: 'jbox_inv4', type: SLDElementType.JunctionBox, position: { x: 630, y: 850 }, data: { label: 'JB-INV4', elementType: SLDElementType.JunctionBox } as JunctionBoxNodeData },
      { id: 'pv_str_4a', type: SLDElementType.Panel, position: { x: 590, y: 930 }, data: { label: 'PV Str 4A', elementType: SLDElementType.Panel, config: {powerRatingWp: 50000} } as PanelNodeData },


      // --- Auxiliary Loads ---
      { id: 'aux_tx', type: SLDElementType.Transformer, position: { x: 650, y: 470 }, data: { label: 'Aux TX', elementType: SLDElementType.Transformer, config: {ratingMVA: "0.1MVA", primaryVoltage: "0.4kV", secondaryVoltage: "0.4kV", vectorGroup: "Yyn0"}, status: 'nominal' } as TransformerNodeData},
      { id: 'aux_load_mccb', type: SLDElementType.Breaker, position: { x: 650, y: 550 }, data: { label: 'MCCB-AUX', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
      { id: 'aux_loads', type: SLDElementType.Load, position: { x: 650, y: 630}, data: { label: 'Plant Aux Loads', elementType: SLDElementType.Load, status: 'active', config: {ratedPowerkW: 50} } as LoadNodeData},

      // --- Monitoring & Control ---
      { id: 'plant_plc', type: SLDElementType.PLC, position: {x: 50, y: 80}, data: {label: 'Plant Controller', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData },
      { id: 'weather_sensor', type: SLDElementType.Sensor, position: {x: 50, y: 160}, data: {label: 'Weather Station', elementType: SLDElementType.Sensor, config: {sensorType: 'Irradiance, Temp, Wind'}, status: 'reading'} as SensorNodeData},
      { id: 'export_power_display', type: SLDElementType.DataLabel, position: {x: 480, y: 130}, data: {label: 'Grid Export', elementType: SLDElementType.DataLabel, dataPointLinks: [{dataPointId: 'grid-export-power', targetProperty: 'value', format: {type: 'number', suffix:'MW', precision: 2}}]} as DataLabelNodeData },
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
      { id: 'e_bus_mccb_invg1', source: 'main_lv_busbar', target: 'mccb_inv_grp1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData }, // This connection implies busbar handles need to support multiple outputs or smarter routing
      { id: 'e_bus_mccb_invg2', source: 'main_lv_busbar', target: 'mccb_inv_grp2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_bus_aux_tx', source: 'main_lv_busbar', target: 'aux_tx', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },


      // Inverter Group 1 (AC side)
      { id: 'e_mccbg1_inv1', source: 'mccb_inv_grp1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg1_inv2', source: 'mccb_inv_grp1', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      // Inverter Group 1 (DC side)
      { id: 'e_jb1_inv1', source: 'jbox_inv1', target: 'inverter_1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv1a_jb1', source: 'pv_str_1a', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv1b_jb1', source: 'pv_str_1b', target: 'jbox_inv1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb2_inv2', source: 'jbox_inv2', target: 'inverter_2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv2a_jb2', source: 'pv_str_2a', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv2b_jb2', source: 'pv_str_2b', target: 'jbox_inv2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },

       // Inverter Group 2 (similar to Group 1)
      { id: 'e_mccbg2_inv3', source: 'mccb_inv_grp2', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_mccbg2_inv4', source: 'mccb_inv_grp2', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb3_inv3', source: 'jbox_inv3', target: 'inverter_3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv3a_jb3', source: 'pv_str_3a', target: 'jbox_inv3', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_jb4_inv4', source: 'jbox_inv4', target: 'inverter_4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_pv4a_jb4', source: 'pv_str_4a', target: 'jbox_inv4', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'DC', voltageLevel: 'LV'} as CustomFlowEdgeData },


      // Auxiliary Loads
      { id: 'e_auxtx_auxmccb', source: 'aux_tx', target: 'aux_load_mccb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
      { id: 'e_auxmccb_auxload', source: 'aux_load_mccb', target: 'aux_loads', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC', voltageLevel: 'LV'} as CustomFlowEdgeData },
    ],
    viewport: { x: -250, y: -50, zoom: 0.55 },
  },

  'secondary_plant': { // Substation with Redundant Feeders Example
    layoutId: 'secondary_plant',
    meta: { description: "Redundant Feeder Substation with ATS and Backup Generator" },
    nodes: [
      { id: 'util_feed_a', type: SLDElementType.Grid, position: { x: 100, y: 50 }, data: { label: 'Utility Feeder A', elementType: SLDElementType.Grid, status: 'connected'} as GridNodeData },
      { id: 'util_feed_b', type: SLDElementType.Grid, position: { x: 400, y: 50 }, data: { label: 'Utility Feeder B', elementType: SLDElementType.Grid, status: 'connected'} as GridNodeData },
      
      { id: 'ats_main', type: SLDElementType.ATS, position: { x: 250, y: 150 }, data: { label: 'Main ATS', elementType: SLDElementType.ATS, status: 'on_feeder_a'} as ATSNodeData }, // Assume ATSNodeData
      
      { id: 'backup_gen_sec', type: SLDElementType.Generator, position: { x: 250, y: 280 }, data: { label: 'Backup Genset', elementType: SLDElementType.Generator, config: { ratingKVA: "500kVA"}, status: 'standby' } as GeneratorNodeData },
      { id: 'ats_gen_cb', type: SLDElementType.Breaker, position: { x: 250, y: 215 }, data: { label: 'Genset CB', elementType: SLDElementType.Breaker, status: 'open'} as BreakerNodeData},


      { id: 'substation_bus', type: SLDElementType.Busbar, position: { x: 250, y: 380 }, data: { label: 'Substation Bus 400V', elementType: SLDElementType.Busbar, config: {width: 200, height: 12}, status: 'energized' } as BusbarNodeData},
      
      { id: 'feeder1_cb', type: SLDElementType.Breaker, position: { x: 150, y: 460 }, data: { label: 'Feeder 1 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
      { id: 'load_feeder1', type: SLDElementType.Load, position: { x: 150, y: 540 }, data: { label: 'Critical Load A', elementType: SLDElementType.Load, config: { ratedPowerkW: 150}, status: 'active'} as LoadNodeData },
      
      { id: 'feeder2_cb', type: SLDElementType.Breaker, position: { x: 350, y: 460 }, data: { label: 'Feeder 2 OCB', elementType: SLDElementType.Breaker, status: 'closed'} as BreakerNodeData},
      { id: 'load_feeder2', type: SLDElementType.Load, position: { x: 350, y: 540 }, data: { label: 'Non-Critical Load B', elementType: SLDElementType.Load, config: {ratedPowerkW: 200}, status: 'active'} as LoadNodeData },
      
      { id: 'scada_plc', type: SLDElementType.PLC, position: {x: 500, y: 250}, data: {label: 'Substation SCADA', elementType: SLDElementType.PLC, status: 'running'} as PLCNodeData},
      { id: 'sec_plant_title', type: SLDElementType.TextLabel, position: {x:250, y:10}, data: createTextLabelData({label: "Substation", text:"Substation Redundancy", styleConfig:{fontSize:'16px', fontWeight:'bold'}})}
    ],
    edges: [
      { id: 'e_feedA_ats', source: 'util_feed_a', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_primary', data: {flowType: 'AC'} as CustomFlowEdgeData }, // Assume ATS has specific handle IDs
      { id: 'e_feedB_ats', source: 'util_feed_b', target: 'ats_main', sourceHandle: 'bottom', targetHandle: 'top_secondary', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_ats_bus', source: 'ats_main', target: 'substation_bus', sourceHandle: 'bottom_out', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_gen_atscb', source: 'backup_gen_sec', target: 'ats_gen_cb', sourceHandle:'bottom', targetHandle:'top', data:{flowType:'AC'} as CustomFlowEdgeData},
      { id: 'e_atscb_ats', source: 'ats_gen_cb', target: 'ats_main', sourceHandle:'bottom', targetHandle:'top_backup', data:{flowType:'AC'} as CustomFlowEdgeData},

      { id: 'e_bus_f1cb', source: 'substation_bus', target: 'feeder1_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f1cb_load1', source: 'feeder1_cb', target: 'load_feeder1', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_bus_f2cb', source: 'substation_bus', target: 'feeder2_cb', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
      { id: 'e_f2cb_load2', source: 'feeder2_cb', target: 'load_feeder2', sourceHandle: 'bottom', targetHandle: 'top', data: {flowType: 'AC'} as CustomFlowEdgeData },
    ],
    viewport: { x: -100, y: 0, zoom: 0.7 },
  },

  'empty_template': {
    layoutId: 'empty_template',
    meta: { description: "A blank canvas for starting new SLD designs." },
    nodes: [
        { id: 'empty_instructions', type: SLDElementType.TextLabel, position: { x: 300, y: 200 },
          data: createTextLabelData({ label: 'Empty Template', text: 'Empty Layout Template\n\nDrag components from the palette to begin.', styleConfig: { fontSize: '14px', color: 'var(--muted-foreground)', padding: '10px' } }),
          draggable: false, selectable: false,
        },
    ],
    edges: [],
  },

  'new_project_canvas': {
    layoutId: 'new_project_canvas',
    meta: { description: "Default canvas for new, unnamed projects." },
    nodes: [
      { id: 'welcome_new_project', type: SLDElementType.TextLabel, position: { x: 350, y: 250 },
        data: createTextLabelData({
          label: 'New Project',
          text: 'New SLD Project\nStart by adding components or load an existing layout.',
          styleConfig: { fontSize: '18px', fontWeight: '500', color: 'var(--primary)', backgroundColor: 'var(--accent-soft)', padding: '15px', borderRadius:'8px' } // Assuming --accent-soft exists
        }),
        draggable: false, selectable: false,
      },
    ],
    edges: [],
  }
};