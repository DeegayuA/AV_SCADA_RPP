// components/sld/nodes/SwitchNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion } from 'framer-motion';
import { SwitchNodeData, CustomNodeType, SLDElementType, SwitchType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    getNodeAppearanceFromState, // Keep if you use standard states to get common appearances
} from './nodeUtils'; // Assuming nodeUtils might have general state to appearance mapping
import { InfoIcon, ZapIcon as PowerCircleIcon, AlertTriangleIcon } from 'lucide-react'; // Using ZapIcon as a more generic PowerCircleIcon for state
import { Button } from "@/components/ui/button";
import clsx from 'clsx';
import { id } from 'date-fns/locale/id';


// Define StandardNodeState type locally (more specific for switches)
type StandardSwitchState = 
    'ENERGIZED_POS1' | // 3-way ON to position 1
    'ENERGIZED_POS2' | // 3-way ON to position 2
    'ENERGIZED_CLOSED' | // 2-way ON (Closed)
    'DEENERGIZED_OFF' | // 3-way explicitly OFF
    'DEENERGIZED_OPEN' | // 2-way OFF (Open)
    'FAULT' | 'WARNING' | 'OFFLINE' | 'STANDBY' | 'UNKNOWN'; // General states

// Simplified Appearance - colors are now more specific to switch states
interface SwitchAppearance {
    borderColorVar: string;
    textColorVar: string;
    statusTextColorVar: string;
    // Colors for lever and active handles based on position
    pos1ActiveColorVar: string; 
    pos2ActiveColorVar: string;
    offColorVar: string;        
    commonInColorVar: string; // Color for the common input handle
    faultColorVar: string;
    warningColorVar: string;
    offlineColorVar: string;
    unknownColorVar: string;
    glowColorVar?: string;
}

// Refined getNodeAppearance for Switches
const getSwitchAppearance = (state: StandardSwitchState, isSelected: boolean, sldAccentVar: string): SwitchAppearance => {
    // Define base colors (these could come from your theme variables too)
    const energizedColor = 'var(--sld-color-energized, hsl(120, 70%, 50%))'; // Default Green
    const pos1EnergizedColor = 'var(--sld-color-pos1-active, hsl(120, 70%, 50%))'; // Green, or custom
    const pos2EnergizedColor = 'var(--sld-color-pos2-active, hsl(100, 70%, 50%))'; // Slightly different green, or custom
    const deenergizedColor = 'var(--sld-color-deenergized, hsl(0, 0%, 65%))'; // Gray
    const faultColor = 'var(--sld-color-fault, hsl(0, 80%, 60%))';
    const warningColor = 'var(--sld-color-warning, hsl(45, 100%, 60%))';
    const offlineColor = 'var(--sld-color-offline, hsl(0, 0%, 50%))';
    const unknownColor = 'var(--sld-color-text-muted, hsl(0, 0%, 45%))';
    const commonBorder = 'var(--sld-color-border, hsl(0, 0%, 80%))';
    const selectedBorder = sldAccentVar; // Use main accent for selected border
    
    const defaultTextColor = 'var(--sld-color-text, hsl(0,0%,10%))'; // For light theme
    const defaultStatusTextColor = 'var(--sld-color-text, hsl(0,0%,10%))';
    // For dark theme, text colors would be lighter e.g. var(--sld-color-text-dark)

    const appearance: SwitchAppearance = {
        borderColorVar: commonBorder,
        textColorVar: defaultTextColor,
        statusTextColorVar: defaultStatusTextColor,
        pos1ActiveColorVar: pos1EnergizedColor,
        pos2ActiveColorVar: pos2EnergizedColor,
        offColorVar: deenergizedColor,
        commonInColorVar: 'var(--sld-color-handle-bg, hsl(0,0%,50%))', // Neutral common input
        faultColorVar: faultColor,
        warningColorVar: warningColor,
        offlineColorVar: offlineColor,
        unknownColorVar: unknownColor,
        glowColorVar: 'transparent',
    };

    switch (state) {
        case 'ENERGIZED_POS1':
        case 'ENERGIZED_CLOSED': // For 2-way ON
            appearance.borderColorVar = isSelected ? selectedBorder : pos1EnergizedColor;
            appearance.statusTextColorVar = pos1EnergizedColor;
            appearance.glowColorVar = pos1EnergizedColor;
            break;
        case 'ENERGIZED_POS2':
            appearance.borderColorVar = isSelected ? selectedBorder : pos2EnergizedColor;
            appearance.statusTextColorVar = pos2EnergizedColor;
            appearance.glowColorVar = pos2EnergizedColor;
            break;
        case 'DEENERGIZED_OFF':
        case 'DEENERGIZED_OPEN': // For 2-way OFF
            appearance.borderColorVar = isSelected ? selectedBorder : deenergizedColor;
            appearance.statusTextColorVar = deenergizedColor;
            break;
        case 'FAULT':
            appearance.borderColorVar = faultColor;
            appearance.statusTextColorVar = faultColor;
            appearance.glowColorVar = faultColor;
            break;
        case 'WARNING':
            appearance.borderColorVar = warningColor;
            appearance.statusTextColorVar = warningColor;
            appearance.glowColorVar = warningColor;
            break;
        case 'OFFLINE':
            appearance.borderColorVar = offlineColor;
            appearance.statusTextColorVar = offlineColor;
            break;
        case 'UNKNOWN':
        default:
            appearance.borderColorVar = isSelected ? selectedBorder : unknownColor;
            appearance.statusTextColorVar = unknownColor;
            break;
    }
    return appearance;
};


interface SwitchVisualProps {
  switchType: SwitchType;
  currentPosition: 'OFF' | 'POS1' | 'POS2' | 'UNKNOWN';
  isOn: boolean; // For 2-way, derived from currentPosition for 3-way (POS1/POS2 means ON)
  appearance: SwitchAppearance;
  standardNodeState: StandardSwitchState; // Use refined state
}

const SwitchVisual: React.FC<SwitchVisualProps> = React.memo(({
  switchType,
  currentPosition,
  isOn, // isOn is primarily for 2-way; 3-way uses currentPosition
  appearance,
  standardNodeState,
}) => {
  const terminalColor = 'var(--sld-color-border-subtle, hsl(220, 15%, 65%))';
  
  let leverRotation = 0;
  let activeLeverColor = appearance.offColorVar; // Default to OFF color

  if (switchType === 'two-way') {
    leverRotation = isOn ? -30 : 30; 
    if (isOn) activeLeverColor = appearance.pos1ActiveColorVar; // Use POS1 color for 2-way ON
  } else { // three-way
    if (currentPosition === 'POS1') {
      leverRotation = -40;
      if (standardNodeState === 'ENERGIZED_POS1') activeLeverColor = appearance.pos1ActiveColorVar;
    } else if (currentPosition === 'POS2') {
      leverRotation = 40;
      if (standardNodeState === 'ENERGIZED_POS2') activeLeverColor = appearance.pos2ActiveColorVar;
    } else { // OFF or UNKNOWN
      leverRotation = 0; 
    }
  }

  // Override lever color if fault/warning/offline for stronger visual cue on the lever itself
  if (standardNodeState === 'FAULT') activeLeverColor = appearance.faultColorVar;
  else if (standardNodeState === 'WARNING') activeLeverColor = appearance.warningColorVar;
  else if (standardNodeState === 'OFFLINE') activeLeverColor = appearance.offlineColorVar;
  else if (standardNodeState === 'UNKNOWN') activeLeverColor = appearance.unknownColorVar;

  const isProblemState = standardNodeState === 'FAULT' || standardNodeState === 'WARNING';
  const svgViewBox = switchType === 'three-way' ? "0 0 40 48" : "0 0 40 40"; // Taller for 3-way labels
  const commonTerminalY = switchType === 'three-way' ? 8 : 32;
  const pos1TerminalY = switchType === 'three-way' ? 32 : 8;
  const leverBaseY = switchType === 'three-way' ? 10 : 30;
  const leverTipY = switchType === 'three-way' ? 20 : 20; // Adjusted based on leverBaseY for consistent length
  const leverPivotOrigin = `20 ${leverBaseY + 2}`; // Pivot near base of lever

  return (
    <svg viewBox={svgViewBox} width="100%" height="100%" className="drop-shadow-sm">
        <defs>
            <linearGradient id={`switch-node-body-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--sld-color-node-bg-subtle)" />
                <stop offset="100%" stopColor="var(--sld-color-node-bg)" />
            </linearGradient>
        </defs>
      {/* Main Body - smaller to accommodate text */}
      <rect x="5" y="5" width="30" height="30" rx="3" ry="3" 
        fill={`url(#switch-node-body-grad-${standardNodeState})`} 
        stroke={appearance.borderColorVar} strokeWidth="1.2" />

      {/* Terminals */}
      <circle cx="20" cy={commonTerminalY} r="2.5" fill={terminalColor} />
      <circle cx={switchType === 'three-way' ? 10 : 20} cy={pos1TerminalY} r="2.5" fill={terminalColor} />
      {switchType === 'three-way' && <circle cx="30" cy={pos1TerminalY} r="2.5" fill={terminalColor} />}

      {/* Switch Lever/Handle */}
      <motion.line
        x1="20" y1={leverBaseY}
        x2="20" y2={leverTipY}
        stroke={activeLeverColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{ transformOrigin: leverPivotOrigin }}
        initial={false}
        animate={{ rotate: leverRotation, stroke: activeLeverColor }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      />
      {/* Handle knob */}
      <motion.circle 
        cx="20" 
        cy={leverTipY - 2} 
        r="2.5" 
        fill={clsx("transition-colors duration-200", {
            [activeLeverColor]: true, // Knob takes lever color directly for visibility
        })}
        style={{ filter: `brightness(0.85)`, transformOrigin: leverPivotOrigin }} // Slightly darker knob
        initial={false}
        animate={{ rotate: leverRotation }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      />

      {isProblemState && (
         <motion.rect x="0.5" y="0.5" width="39" height={switchType === 'three-way' ? "47" : "39"} rx="4" ry="4" fill="none"
          stroke={standardNodeState === 'FAULT' ? appearance.faultColorVar : appearance.warningColorVar}
          strokeWidth="2" initial={{ opacity: 0.7, pathLength:0 }} 
          animate={{ opacity: [0.7,1,0.7], pathLength:1 }} 
          transition={{ pathLength:{duration:0.7, ease:"circOut"}, opacity: {duration:0.7, repeat: Infinity, ease:"easeInOut"}}} />
      )}
    </svg>
  );
});
SwitchVisual.displayName = "SwitchVisual";


const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type } = props; // xPos, yPos, zIndex, dragging removed for brevity, assume handled by React Flow
  
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;
  const nodePosition = useMemo((): XYPosition => ({ x: props.xPos || 0, y: props.yPos || 0 }), [props.xPos, props.yPos]);


  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    dataPoints: state.dataPoints,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
  }));

  const isNodeEditable = useMemo(() => isEditMode && (currentUser?.role === 'admin'), [isEditMode, currentUser]);
  const switchType = useMemo((): SwitchType => data.config?.switchType || 'two-way', [data.config?.switchType]);

  // Main state link (for 2-way 'isOn' or 3-way 'position')
  const stateLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'switch.isOn' || link.targetProperty === 'switch.position' || link.targetProperty === 'value') ||
    (data.dataPointLinks?.length === 1 ? data.dataPointLinks[0] : undefined),
    [data.dataPointLinks]
  );
  const stateDataPointConfig = useMemo(() => stateLink ? dataPoints[stateLink.dataPointId] : undefined, [stateLink, dataPoints]);
  const stateOpcUaNodeId = useMemo(() => stateDataPointConfig?.nodeId, [stateDataPointConfig]);
  const reactiveStateValue = useOpcUaNodeValue(stateOpcUaNodeId);

  const pos1StateLink = useMemo(() => data.dataPointLinks?.find(l => l.targetProperty === 'switch.isPos1Active'), [data.dataPointLinks]);
  const pos1ReactiveValue = useOpcUaNodeValue(pos1StateLink ? dataPoints[pos1StateLink.dataPointId]?.nodeId : undefined);
  
  const pos2StateLink = useMemo(() => data.dataPointLinks?.find(l => l.targetProperty === 'switch.isPos2Active'), [data.dataPointLinks]);
  const pos2ReactiveValue = useOpcUaNodeValue(pos2StateLink ? dataPoints[pos2StateLink.dataPointId]?.nodeId : undefined);


  const processedStatus = useMemo<string>(() => {
    const generalStatusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (generalStatusLink && dataPoints[generalStatusLink.dataPointId] ) {
      // Determine if generic reactiveStateValue should be used or specific status DP if available
      // For now, assuming reactiveStateValue corresponds to the primary control state link,
      // If statusLink is different, its value should be fetched via another useOpcUaNodeValue.
      // Let's assume a placeholder for simplicity here, or refine if specific fault DP is always linked.
      // This needs careful review of how fault/warning DPs are structured relative to primary state DP.
      const statusDpValue = useOpcUaNodeValue(dataPoints[generalStatusLink.dataPointId]?.nodeId); // Assuming direct fetch if statusLink is specific
      if(statusDpValue !== undefined) return String(applyValueMapping(statusDpValue, generalStatusLink)).toLowerCase();
    }
    return String(data.status || 'ok').toLowerCase();
  }, [data.dataPointLinks, data.status, dataPoints]); // reactiveStateValue removed from deps, as specific status DP should be used

  const { currentPosition, isSwitchOn } = useMemo(() => {
    let pos: 'OFF' | 'POS1' | 'POS2' | 'UNKNOWN' = 'UNKNOWN';
    let isOn_calc = false;

    const isValueTrueLike = (val: any): boolean => {
        if (val === undefined || val === null) return false;
        const strVal = String(val).toLowerCase().trim();
        return strVal === 'true' || strVal === 'on' || strVal === '1' || strVal === 'yes' || Number(val) !== 0;
    };

    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveStateValue, stateLink);
      
      if (switchType === 'two-way') {
        isOn_calc = isValueTrueLike(mappedValue);
        pos = isOn_calc ? 'POS1' : 'OFF'; 
      } else { // three-way
        const valStr = String(mappedValue);
        const SVO = data.config?.stateValueOff ?? "0";
        const SVO1 = data.config?.stateValuePos1 ?? "1";
        const SVO2 = data.config?.stateValuePos2 ?? "2";

        if (valStr === String(SVO1)) { pos = 'POS1'; isOn_calc = true; }
        else if (valStr === String(SVO2)) { pos = 'POS2'; isOn_calc = true; }
        else if (valStr === String(SVO)) { pos = 'OFF'; isOn_calc = false; }
        else { // Fallback logic
             const pos1Active = pos1StateLink && pos1ReactiveValue !== undefined && isValueTrueLike(applyValueMapping(pos1ReactiveValue,pos1StateLink));
             const pos2Active = pos2StateLink && pos2ReactiveValue !== undefined && isValueTrueLike(applyValueMapping(pos2ReactiveValue,pos2StateLink));
             if (pos1Active) {pos = 'POS1'; isOn_calc = true;}
             else if(pos2Active) {pos = 'POS2'; isOn_calc = true;}
             else pos = 'OFF'; // Default to OFF if specific position checks don't confirm
        }
      }
    } else if (switchType === 'two-way'){
      isOn_calc = !(data.config?.normallyOpen ?? true); // if normallyOpen is true, it's OFF by default (isOn=false)
      pos = isOn_calc ? 'POS1' : 'OFF';
    } else { 
        pos = data.config?.defaultPosition || 'OFF'; // Fallback to configured default for 3-way
        if (pos === 'POS1' || pos === 'POS2') isOn_calc = true;
    }
    return { currentPosition: pos, isSwitchOn: isOn_calc };
  }, [switchType, stateLink, stateDataPointConfig, reactiveStateValue, data.config, 
      pos1StateLink, pos1ReactiveValue, pos2StateLink, pos2ReactiveValue]);
  

  const standardNodeState = useMemo<StandardSwitchState>(() => {
    if (processedStatus === 'fault') return 'FAULT';
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline') return 'OFFLINE';

    if (switchType === 'two-way') {
      return isSwitchOn ? 'ENERGIZED_CLOSED' : 'DEENERGIZED_OPEN';
    } else { // three-way
      if (currentPosition === 'POS1') return 'ENERGIZED_POS1';
      if (currentPosition === 'POS2') return 'ENERGIZED_POS2';
      // default to OFF for three-way if not explicitly POS1 or POS2
      return 'DEENERGIZED_OFF'; 
    }
    // return 'UNKNOWN'; // Should be covered by above
  }, [processedStatus, switchType, isSwitchOn, currentPosition]);

  const sldAccentVar = 'var(--sld-color-accent)'; // Assume this CSS var is defined elsewhere (e.g. globals.css)
  const appearance = useMemo(() => getSwitchAppearance(standardNodeState, selected, sldAccentVar), [standardNodeState, selected, sldAccentVar]);


  const displayStatusText = useMemo(() => {
    if (standardNodeState === 'FAULT') return <span style={{ color: appearance.faultColorVar }} className="font-bold">FAULT</span>;
    if (standardNodeState === 'WARNING') return <span style={{ color: appearance.warningColorVar }} className="font-bold">WARNING</span>;
    if (standardNodeState === 'OFFLINE') return <span style={{ color: appearance.offlineColorVar }}>OFFLINE</span>;

    if (switchType === 'two-way') return isSwitchOn ? 'ON' : 'OFF';
    return currentPosition;
  }, [standardNodeState, switchType, isSwitchOn, currentPosition, appearance]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStandardStateRef = useRef(standardNodeState);
  useEffect(() => {
    if (prevStandardStateRef.current !== standardNodeState && standardNodeState !== 'UNKNOWN') { // Avoid highlight on initial unknown
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200); // slightly longer highlight
      prevStandardStateRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const calculatedMinWidth = 60; 
  const calculatedMinHeight = switchType === 'three-way' ? 80 : 75; // Slightly taller for 3-way for labels


  const nodeMainStyle = useMemo((): React.CSSProperties => { 
    let currentBoxShadow = `0 1px 2px hsla(var(--shadow-color), 0.07), 0 0.5px 1px hsla(var(--shadow-color), 0.04)`;
    if (isRecentStatusChange && appearance.glowColorVar && appearance.glowColorVar !== 'transparent') {
      currentBoxShadow = `0 0 0 1px ${appearance.glowColorVar.replace(')', ', 0.6)').replace('var(','rgba(')}, 0 0 8px 2px ${appearance.glowColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`;
    } else if (selected) {
      currentBoxShadow = `0 0 0 1.5px ${sldAccentVar}, 0 2px 8px 0px ${sldAccentVar.replace(')', ', 0.3)').replace('var(','rgba(')}`;
    } else if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING'){
      currentBoxShadow = `0 0 0 1.5px ${appearance.borderColorVar}, 0 0 7px 0px ${appearance.borderColorVar}`;
    }

    return {
      borderColor: appearance.borderColorVar, borderWidth: '1px', boxShadow: currentBoxShadow,
      color: appearance.textColorVar,
      minWidth: `${calculatedMinWidth}px`, minHeight: `${calculatedMinHeight}px`,
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${calculatedMinWidth}px`,
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${calculatedMinHeight}px`,
      borderRadius: '0.375rem', 
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);
  

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || SLDElementType.Switch, position: nodePosition, data, selected: selected || false, dragging: props.dragging || false, 
    zIndex: props.zIndex || 0, width: nodeWidthFromData || calculatedMinWidth, height: nodeHeightFromData || calculatedMinHeight, 
    connectable: isConnectable !== undefined ? isConnectable : true, // Default to true if undefined
  }), [id, type, nodePosition, data, selected, props.dragging, props.zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

  const switchPoleText = data.config?.numPoles ? `${data.config.numPoles}-POLE` : '';

  const handleConfig = useMemo(() => {
    let commonColor = appearance.commonInColorVar;
    let pos1Color = appearance.offColorVar;
    let pos2Color = appearance.offColorVar;

    if(standardNodeState === 'ENERGIZED_POS1' && (switchType === 'three-way' || switchType === 'two-way')) pos1Color = appearance.pos1ActiveColorVar;
    if(standardNodeState === 'ENERGIZED_POS2' && switchType === 'three-way') pos2Color = appearance.pos2ActiveColorVar;
    if(standardNodeState === 'ENERGIZED_CLOSED' && switchType === 'two-way') pos1Color = appearance.pos1ActiveColorVar; // Treat 2-way ON as POS1 active for color

    if (standardNodeState === 'FAULT') {
        commonColor = pos1Color = pos2Color = appearance.faultColorVar;
    } else if (standardNodeState === 'WARNING') {
        commonColor = pos1Color = pos2Color = appearance.warningColorVar;
    } else if (standardNodeState === 'OFFLINE') {
        commonColor = pos1Color = pos2Color = appearance.offlineColorVar;
    }

    const handles: {id: string, type: 'source' | 'target', position: Position, style: React.CSSProperties, title: string }[] = [
        {id: 'common_in', type: 'target', position: Position.Top, style: {background: commonColor }, title: 'Common Input'}
    ];
    if(switchType === 'two-way'){
        handles.push({id: 'out_on', type:'source', position: Position.Bottom, style: {background: pos1Color }, title: 'Output (ON/OFF)'})
    } else { // three-way
        handles.push({id: 'out_pos1', type:'source', position: Position.Left, style: {background: pos1Color }, title: 'Output Position 1'})
        handles.push({id: 'out_pos2', type:'source', position: Position.Right, style: {background: pos2Color }, title: 'Output Position 2'})
    }
    return handles;

  },[switchType, standardNodeState, appearance]);

  return (
    <motion.div
      className={clsx(
        "sld-node switch-node group custom-node-hover flex flex-col items-center justify-between border overflow-hidden p-1 relative",
        "transition-all duration-150 ease-out text-center",
        isNodeEditable ? 'cursor-grab' : 'cursor-default',
        isRecentStatusChange && appearance.glowColorVar && appearance.glowColorVar !== 'transparent' && 'animate-status-highlight', // Ensure this animation exists globally
        {'animate-status-highlight-fault': standardNodeState === 'FAULT' && isRecentStatusChange}, // specific fault highlight
        {'animate-status-highlight-warning': standardNodeState === 'WARNING' && isRecentStatusChange}, // specific warning highlight
      )}
      style={{ ...nodeMainStyle, background: 'var(--sld-color-node-bg)',
      // Dynamic glow via animation name needs careful setup with CSS variables if `animate-status-highlight` expects one
      // Or, handle glow via boxShadow directly as done in nodeMainStyle
    }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {!isEditMode && (
        <Button variant="ghost" size="icon"
          className="absolute top-0 right-0 h-5 w-5 rounded-full z-20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }} title="View Details"
        >
          <InfoIcon className="h-2.5 w-2.5 text-muted-foreground" />
        </Button>
      )}

      {handleConfig.map(h => (
        <Handle key={h.id} type={h.type} position={h.position} id={h.id} isConnectable={isConnectable} 
                className={clsx("!w-3 !h-3 !border-2 sld-handle-style",
                  {"!bg-[var(--sld-color-handle-energized)] !border-[var(--sld-color-handle-energized)]": h.style.background !== appearance.offColorVar && h.style.background !== appearance.commonInColorVar && h.style.background !== appearance.faultColorVar && h.style.background !== appearance.warningColorVar},
                  {"!bg-[var(--sld-color-fault)] !border-[var(--sld-color-fault)]": h.style.background === appearance.faultColorVar},
                  {"!bg-[var(--sld-color-warning)] !border-[var(--sld-color-warning)]": h.style.background === appearance.warningColorVar},
                )}
                style={{ borderColor: 'var(--sld-color-handle-border)', background: h.style.background}} // Ensure background updates
                title={h.title}
        />
      ))}
      
      {/* Label always at top */}
       <p className="text-[7px] sm:text-[8px] font-medium text-center truncate w-full leading-none pt-0.5" title={data.label} style={{color: appearance.textColorVar}}>
          {data.label || 'Switch'}
        </p>
        
      <div className="flex-grow flex items-center justify-center w-full h-auto px-0.5 my-0.5">
        <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex-shrink-0">
            <SwitchVisual 
                switchType={switchType}
                isOn={isSwitchOn} // isSwitchOn will be true if POS1 or POS2 for 3-way
                currentPosition={currentPosition}
                appearance={appearance}
                standardNodeState={standardNodeState}
            />
        </div>
      </div>
        
      {/* Status text always at bottom */}
      <div className="flex flex-col items-center text-center w-full leading-tight pb-0.5">
        <div className="text-[8px] sm:text-[9px] font-semibold leading-none" style={{ color: appearance.statusTextColorVar }}>
            {displayStatusText}
        </div>
        {switchPoleText && <p className="text-[6px] sm:text-[7px] text-muted-foreground leading-none">{switchPoleText}</p>}
      </div>

    </motion.div>
  );
};

export default memo(SwitchNode);