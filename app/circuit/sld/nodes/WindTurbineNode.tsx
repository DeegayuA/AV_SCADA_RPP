import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow';
import { motion } from 'framer-motion';
import { GeneratorNodeData, CustomNodeType, DataPoint, SLDElementType, WindTurbineNodeData } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getNodeAppearanceFromState } from './nodeUtils';
import { WindIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, CogIcon, PowerIcon, InfoIcon, ActivityIcon, Gauge } from 'lucide-react';
import { Button } from "@/components/ui/button";

type StandardNodeState = 'ENERGIZED' | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';

const WindTurbineGraphic = ({ className, powerRatio }: { className?: string; powerRatio: number }) => {
  const isSpinning = powerRatio > 0;
  const duration = isSpinning ? Math.max(0.5, 4 - (powerRatio * 3.5)) : 0;

  const variants = {
    spinning: { rotate: 360 },
    still: { rotate: 0 },
  };
  const transition = isSpinning ? { repeat: Infinity, ease: 'linear' as const, duration } : { duration: 0.5 };

  const bladePath = "M 12 10.5 C 10 9, 10 3, 12 2 C 14 3, 14 9, 12 10.5 Z";

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width="32"
      height="32"
    >
      <path d="M12 10.5V22" />
      <path d="M9 22h6" />
    <motion.g
        style={{ transformOrigin: 'center center' }}
        variants={variants}
        animate={isSpinning ? "spinning" : "still"}
        transition={transition}
      >
        <path d={bladePath} fill="currentColor" />
        <path d={bladePath} fill="currentColor" transform="rotate(120, 12, 10.5)" />
        <path d={bladePath} fill="currentColor" transform="rotate(240, 12, 10.5)" />
      </motion.g>
      <circle cx="12" cy="10.5" r="1.5" fill="currentColor" />
    </motion.svg>
  );
};

const WindTurbineNode: React.FC<NodeProps<GeneratorNodeData> & Pick<Node<GeneratorNodeData>, 'position' | 'width' | 'height' | 'dragging' | 'zIndex'>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props;
  const safePosition = position ?? { x: 0, y: 0 };
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && (currentUser?.role === 'admin'), [isEditMode, currentUser]);

  // ✅ FIX: Check for specific and generic status properties
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'windTurbine.status' || link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDpConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDpConfig?.nodeId, [statusDpConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  // ✅ FIX: Check for specific and generic power properties
  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'windTurbine.powerOutput' || link.targetProperty === 'powerOutput' || link.targetProperty === 'activePower'), [data.dataPointLinks]);
  const powerDpConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDpConfig?.nodeId, [powerDpConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  // ✅ FIX: Check for specific and generic wind speed properties
  const windSpeedLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'windTurbine.windSpeed' || link.targetProperty === 'windSpeed'), [data.dataPointLinks]);
  const windSpeedDpConfig = useMemo(() => windSpeedLink ? dataPoints[windSpeedLink.dataPointId] : undefined, [windSpeedLink, dataPoints]);
  const windSpeedOpcUaNodeId = useMemo(() => windSpeedDpConfig?.nodeId, [windSpeedDpConfig]);
  const reactiveWindSpeedValue = useOpcUaNodeValue(windSpeedOpcUaNodeId);

  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDpConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDpConfig, reactiveStatusValue, data.status]);

  const currentNumericPower = useMemo<number | undefined>(() => {
    if (powerLink && powerDpConfig && reactivePowerValue !== undefined) {
      let valueToProcess: any = reactivePowerValue;
      if (typeof valueToProcess === 'number' && typeof powerDpConfig.factor === 'number') {
        valueToProcess *= powerDpConfig.factor;
      }
      const mapped = applyValueMapping(valueToProcess, powerLink);
      if (typeof mapped === 'number') return mapped;
      if (typeof mapped === 'string') {
        const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
        return isNaN(p) ? undefined : p;
      }
    }
    return undefined;
  }, [powerLink, powerDpConfig, reactivePowerValue]);

  // ✅ FIX: More robust rated power calculation
  const ratedPowerInWatts = useMemo(() => {
    // Prioritize the more direct 'ratedPower' (in kW) if available from config
    const ratedInKW = (data.config as WindTurbineNodeData['config'])?.ratedPower;
    if (typeof ratedInKW === 'number') {
        return ratedInKW * 1000;
    }
    // Fallback to KVA if ratedPower is not present
    const ratedInKVA = data.config?.ratingKVA;
    if (typeof ratedInKVA === 'number') {
        // Assuming power factor of 0.9 for KVA to KW conversion, then to W
        return ratedInKVA * 0.9 * 1000;
    }
    return undefined;
  }, [data.config]);

  const isDeviceActive = useMemo<boolean>(() => {
      const activeStatuses = ['running', 'producing', 'online', 'active', 'energized', 'nominal'];
      return activeStatuses.includes(processedStatus);
  }, [processedStatus]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
      if (processedStatus.includes('fault') || processedStatus.includes('alarm')) return 'FAULT';
      if (processedStatus.includes('warning')) return 'WARNING';
      if (processedStatus.includes('offline') || processedStatus === 'off') return 'OFFLINE';
      if (processedStatus.includes('standby') || processedStatus.includes('idle')) return 'STANDBY';
      if (isDeviceActive) return 'ENERGIZED';
      return 'UNKNOWN';
  }, [processedStatus, isDeviceActive]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Generator), [standardNodeState]);

  const powerRatio = useMemo<number>(() => {
    if (ratedPowerInWatts && ratedPowerInWatts > 0 && currentNumericPower !== undefined && currentNumericPower >= 0) {
        // Here, currentNumericPower is in kW from the DP, so convert ratedPower to kW
        return Math.min(1, Math.max(0, currentNumericPower / (ratedPowerInWatts / 1000)));
    }
    return isDeviceActive ? 0.1 : 0; // Default to a low ratio if active but no power data
  }, [currentNumericPower, ratedPowerInWatts, isDeviceActive]);

  const formattedWindSpeed = useMemo<string | null>(() => {
    if (windSpeedLink && windSpeedDpConfig && reactiveWindSpeedValue !== undefined) {
      const value = applyValueMapping(reactiveWindSpeedValue, windSpeedLink);
      const formatOptions = { type: 'number' as const, precision: 1, suffix: ` ${windSpeedDpConfig.unit || 'm/s'}` };
      return formatDisplayValue(value, formatOptions, windSpeedDpConfig.dataType);
    }
    return null;
  }, [windSpeedLink, windSpeedDpConfig, reactiveWindSpeedValue]);

  const formattedPowerOutput = useMemo<string>(() => {
    if (currentNumericPower === undefined) {
        return ratedPowerInWatts ? `${(ratedPowerInWatts / 1000).toFixed(0)} kW (Rated)` : 'N/A';
    }
    // Assuming currentNumericPower from DP is in kW
    const formatOptions = { type: 'number' as const, precision: 1, suffix: ' kW' };
    return formatDisplayValue(currentNumericPower, formatOptions, powerDpConfig?.dataType);
  }, [currentNumericPower, ratedPowerInWatts, powerDpConfig?.dataType]);

  const { StatusIcon, statusText } = useMemo(() => {
    let icon: React.ElementType = CogIcon;
    let text = standardNodeState.charAt(0) + standardNodeState.slice(1).toLowerCase();

    switch (standardNodeState) {
        case 'FAULT': icon = XCircleIcon; text = 'Fault'; break;
        case 'WARNING': icon = AlertTriangleIcon; text = 'Warning'; break;
        case 'ENERGIZED': icon = CheckCircleIcon; text = 'Producing'; break;
        case 'STANDBY': icon = PowerIcon; text = 'Standby'; break;
        case 'OFFLINE': icon = PowerIcon; text = 'Offline'; break;
        default: icon = WindIcon; text = 'Unknown'; break;
    }
    return { StatusIcon: icon, statusText: text };
  }, [standardNodeState]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState);

  useEffect(() => {
    if (prevStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1300);
      prevStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';

  const nodeMainStyle = useMemo((): React.CSSProperties => {
      let currentBoxShadow = `0 0.5px 1px rgba(0,0,0,0.02), 0 0.25px 0.5px rgba(0,0,0,0.01)`;
      let borderColorActual = selected ? sldAccentVar : appearance.borderColorVar;

      if (isRecentStatusChange && appearance.glowColorVar && appearance.glowColorVar !== 'transparent') {
          currentBoxShadow = `0 0 8px 2px ${appearance.glowColorVar.replace(')', ', 0.45)').replace('var(', 'rgba(')}`;
      }
      if (selected) {
          borderColorActual = sldAccentVar;
          currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 8px 1px ${borderColorActual.replace(')', ', 0.4)').replace('var(', 'rgba(')}, ${currentBoxShadow}`;
      }

      return {
          borderColor: borderColorActual,
          borderWidth: '1.5px',
          boxShadow: currentBoxShadow,
          width: width ? `${width}px` : '85px',
          height: height ? `${height}px` : '105px',
      };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, width, height]);

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
      id, type: type || SLDElementType.Generator,
      position: safePosition,
      data, selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0,
      width: width || 85, height: height || 90,
      connectable: isConnectable || false,
  }), [id, type, safePosition, data, selected, dragging, zIndex, width, height, isConnectable]);

  return (
    <motion.div
      className={`sld-node wind-turbine-node group custom-node-hover rounded-lg flex flex-col items-center justify-between transition-all duration-300`}
      style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost" size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} className="sld-handle-style" title="DC Output" />
      <Handle type="target" position={Position.Top} id="control" isConnectable={isConnectable} className="sld-handle-style" title="Control Input"/>

      <div
        className={`flex flex-col items-center justify-between p-1 w-full h-full rounded-md transition-colors duration-300`}
        style={{ color: appearance.textColorVar }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label}
        </p>

        <div className="my-0.5 pointer-events-none flex items-center justify-center">
          <WindTurbineGraphic className="transition-colors" powerRatio={powerRatio} />
        </div>

        <div className="flex flex-col items-center justify-center gap-0 mt-0.5 w-full">
            <div className="flex items-center gap-1" style={{ color: appearance.statusTextColorVar }}>
              <StatusIcon size={10} />
              <p className="text-[9px] font-medium text-center truncate leading-tight">
                {statusText}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold" title={`Power: ${formattedPowerOutput}`}>
                <ActivityIcon size={8} className="opacity-80"/>
                <p>{formattedPowerOutput}</p>
            </div>
            {formattedWindSpeed && (
              <div className="flex items-center gap-1 text-[10px] font-semibold" title={`Wind Speed: ${formattedWindSpeed}`}>
                  <WindIcon size={8} className="opacity-80"/>
                  <p>{formattedWindSpeed}</p>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(WindTurbineNode);