// components/sld/nodes/WindInverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence, Variants, Transition, MotionStyle } from 'framer-motion';
import { InverterNodeData, CustomNodeType, SLDElementType, InverterType, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    formatDisplayValue,
    getNodeAppearanceFromState,
} from './nodeUtils';

type StandardNodeState = 'ENERGIZED' | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';

import {
    InfoIcon, SettingsIcon, CombineIcon, GridIcon, WindIcon, PowerIcon,
    ActivityIcon, ThermometerIcon, ArrowUpRightIcon, SlidersHorizontalIcon,

    MinusIcon, PlusIcon, WavesIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// ✅ UI UPDATE: New visual component specifically for the Wind Inverter
interface DynamicWindInverterVisualProps {
    appearance: {
        iconColorVar: string;
        mainStatusColorVar: string;
        glowColorVar?: string;
    };
    standardNodeState: StandardNodeState;
    acPowerRatio: number;
}

const DynamicWindInverterVisual: React.FC<DynamicWindInverterVisualProps> = React.memo(({
    appearance,
    standardNodeState,
    acPowerRatio,
}) => {
    const isActive = standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL';
    const numParticles = isActive ? Math.max(1, Math.floor(acPowerRatio * 10)) : 0;

    let coreColor = appearance.mainStatusColorVar;
    if (standardNodeState === 'FAULT') coreColor = 'var(--sld-color-fault)';
    else if (standardNodeState === 'WARNING') coreColor = 'var(--sld-color-warning)';
    else if (standardNodeState === 'OFFLINE') coreColor = 'var(--sld-color-offline-icon, #a1a1aa)';
    else if (standardNodeState === 'STANDBY' || !isActive) coreColor = 'var(--sld-color-standby-icon, #71717a)';

    const iconAnimationVariants: Variants = {
        idle: { scale: 1 },
        active: {
            scale: [1, 1.05 + acPowerRatio * 0.1, 1],
            transition: {
                scale: { duration: 1.5 + (1 - acPowerRatio) * 1.5, repeat: Infinity, ease: "easeInOut" }
            }
        }
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center select-none overflow-visible">
            {/* Swirling Wind Particles */}
            {isActive && Array.from({ length: numParticles }).map((_, i) => {
                const duration = 2 + Math.random() * 2;
                const radius = 12 + Math.random() * 4;
                const size = 1 + Math.random() * 1.5 + acPowerRatio;

                return (
                    <motion.div
                        key={`wind-particle-${i}`}
                        className="absolute rounded-full"
                        style={{
                            backgroundColor: 'var(--sld-color-wind-particle, #bae6fd)', // A light blue, themeable color
                            width: size,
                            height: size,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 0.5 + acPowerRatio * 0.4, 0],
                            scale: [0.1, 1, 0.1],
                            x: [0, radius, 0, -radius, 0],
                            y: [radius, 0, -radius, 0, radius],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: duration,
                            delay: Math.random() * duration,
                            ease: 'easeInOut'
                        }}
                    />
                );
            })}

            {/* Central Wind Icon */}
            <motion.div
                key={`wind-inverter-icon-${standardNodeState}`}
                className="relative z-10"
                variants={iconAnimationVariants}
                animate={isActive ? 'active' : 'idle'}
            >
                <WindIcon size={22} color={coreColor} strokeWidth={1.5} />
            </motion.div>

            {/* Background Glow */}
            {isActive && appearance.glowColorVar && appearance.glowColorVar !== 'transparent' && (
                <motion.div
                    className="absolute inset-[-2px] rounded-full opacity-40 blur-[4px]"
                    style={{ backgroundColor: appearance.glowColorVar }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.05, 0.2 + acPowerRatio * 0.2, 0.05] }}
                    transition={{ duration: 1.8 + (1 - acPowerRatio) * 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
    );
});
DynamicWindInverterVisual.displayName = 'DynamicWindInverterVisual';


const WindInverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
    const { data, selected, isConnectable, id, type, xPos, yPos, dragging, zIndex } = props;
    const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
    const nodeWidthFromData = data.width;
    const nodeHeightFromData = data.height;

    const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ isEditMode: state.isEditMode, currentUser: state.currentUser, setSelectedElementForDetails: state.setSelectedElementForDetails, dataPoints: state.dataPoints }));

    const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);
    const inverterType = useMemo((): InverterType => data.config?.inverterType || 'on-grid', [data.config?.inverterType]);

    const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
    const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
    const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
    const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

    const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'windInverter.powerOutput' || link.targetProperty === 'powerOutput' || link.targetProperty === 'inverter.powerOutput'), [data.dataPointLinks]);
    const powerDataPointConfig = useMemo<DataPoint | undefined>(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
    const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
    const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

    const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
    const tempDpConfig = useMemo<DataPoint | undefined>(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
    const tempOpcUaNodeId = useMemo(() => tempDpConfig?.nodeId, [tempDpConfig]);
    const reactiveTempValue = useOpcUaNodeValue(tempOpcUaNodeId);

    const hasAnyAcDetailLinks = useMemo(() => {
        const acDetailProps = ['voltageL1', 'voltageL2', 'voltageL3', 'currentL1', 'currentL2', 'currentL3', 'frequencyL1', 'frequencyL2', 'frequencyL3', 'frequency'];
        return data.dataPointLinks?.some(link => acDetailProps.includes(link.targetProperty)) || false;
    }, [data.dataPointLinks]);

    const processedStatus = useMemo<string>(() => {
        if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
            return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
        }
        return String(data.status || 'offline').toLowerCase();
    }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

    const currentNumericAcPower = useMemo<number | undefined>(() => {
        if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
            let valueToProcess: any = reactivePowerValue;
            if (typeof valueToProcess === 'number' && typeof powerDataPointConfig.factor === 'number') {
                valueToProcess *= powerDataPointConfig.factor;
            }
            const mapped = applyValueMapping(valueToProcess, powerLink);
            if (typeof mapped === 'number') {
                // Assuming data is in kW from config, convert to W for internal consistency
                return mapped * 1000;
            }
            if (typeof mapped === 'string') {
                const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
                return isNaN(p) ? undefined : p;
            }
            if (typeof mapped === 'boolean') {
                const ratedInKw = data.config?.ratedPower;
                return mapped ? ((ratedInKw ? ratedInKw * 1000 : 1000) || 1) : 0;
            }
        }
        return undefined;
    }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.ratedPower]);

    const ratedPowerConfigInWatts = useMemo(() => {
        const ratedInKw = data.config?.ratedPower;
        if (typeof ratedInKw === 'number') {
            return ratedInKw * 1000;
        }
        return undefined;
    }, [data.config?.ratedPower]);

    const isDeviceActive = useMemo<boolean>(() => {
        const activeStatuses = ['running', 'online', 'nominal', 'active', 'inverting', 'producing', 'ongrid', 'on-grid'];
        const isGenerallyActive = activeStatuses.includes(processedStatus);
        if (isGenerallyActive) {
            if (currentNumericAcPower !== undefined) return currentNumericAcPower >= 0;
            return true;
        }
        if ((processedStatus === 'offgrid' || processedStatus === 'off-grid') && inverterType === 'off-grid' && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) return true;
        return false;
    }, [processedStatus, currentNumericAcPower, inverterType]);

    const standardNodeState = useMemo<StandardNodeState>(() => {
        if (processedStatus.includes('fault') || processedStatus.includes('alarm')) return 'FAULT';
        if (processedStatus.includes('warning')) return 'WARNING';
        if (processedStatus.includes('offline') || processedStatus === 'off') return 'OFFLINE';
        if ((processedStatus.includes('offgrid') || processedStatus.includes('off-grid')) && inverterType !== 'off-grid' && !isDeviceActive) return 'OFFLINE';
        if (processedStatus.includes('standby') || processedStatus.includes('idle')) {
            if (currentNumericAcPower !== undefined && currentNumericAcPower > 0.01) return 'ENERGIZED';
            return 'STANDBY';
        }
        if (isDeviceActive) return 'ENERGIZED';
        if ((processedStatus.includes('offgrid') || processedStatus.includes('off-grid')) && inverterType === 'off-grid') return 'ENERGIZED';
        if (processedStatus === 'nominal') return 'NOMINAL';
        return 'UNKNOWN';
    }, [processedStatus, isDeviceActive, inverterType, currentNumericAcPower]);

    const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Inverter), [standardNodeState]);

    const acPowerRatio = useMemo<number>(() => {
        if (ratedPowerConfigInWatts && ratedPowerConfigInWatts > 0 && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) {
            return Math.min(1, Math.max(0, currentNumericAcPower / ratedPowerConfigInWatts));
        }
        return isDeviceActive ? 0.25 : 0;
    }, [currentNumericAcPower, ratedPowerConfigInWatts, isDeviceActive]);

    const displayStatusText = useMemo<string>(() => {
        if (standardNodeState === 'FAULT') return "Fault";
        if (standardNodeState === 'WARNING') return "Warning";
        if (standardNodeState === 'OFFLINE') return "Offline";
        if (standardNodeState === 'STANDBY') return "Standby";
        if (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') {
            if (inverterType === 'off-grid' && (processedStatus.includes('offgrid') || processedStatus.includes('off-grid'))) return "Islanding";
            if (currentNumericAcPower !== undefined && Math.abs(currentNumericAcPower) < 0.01 && isDeviceActive) return "Idle";
            return "Inverting";
        }
        const readableStatus = String(processedStatus || standardNodeState).replace(/_/g, ' ');
        return readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1);
    }, [standardNodeState, processedStatus, inverterType, currentNumericAcPower, isDeviceActive]);

    const temperatureValue = useMemo<number | null>(() => {
        if (!tempLink || !tempDpConfig || reactiveTempValue === undefined) return null;
        let valueToProcess: any = reactiveTempValue;
        if (typeof valueToProcess === 'number' && typeof tempDpConfig.factor === 'number') {
            valueToProcess *= tempDpConfig.factor;
        }
        const mappedValue = applyValueMapping(valueToProcess, tempLink);
        if (typeof mappedValue === 'number') return mappedValue;
        if (typeof mappedValue === 'string') {
            const parsed = parseFloat(mappedValue.replace(/[^\d.-]/g, ''));
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }, [reactiveTempValue, tempLink, tempDpConfig]);

    const formattedTemperature = useMemo<string | null>(() => {
        if (temperatureValue !== null && tempLink && tempDpConfig) {
            const tempPrecision = tempDpConfig.decimalPlaces ?? tempLink.format?.precision ?? 0;
            const tempSuffix = tempLink.format?.suffix || tempDpConfig.unit || '°C';
            const tempFormat = { type: 'number' as const, precision: tempPrecision, suffix: tempSuffix };
            return formatDisplayValue(temperatureValue, tempFormat, tempDpConfig.dataType);
        }
        return null;
    }, [temperatureValue, tempLink, tempDpConfig]);

    const currentTempColorVar = useMemo<string>(() => {
        if (!temperatureValue) return appearance.statusTextColorVar;
        const warnTemp = data.config?.warningTemperature ?? 55;
        const maxTemp = data.config?.maxOperatingTemperature ?? 70;
        if (maxTemp && temperatureValue >= maxTemp) return 'var(--sld-color-fault-text, var(--sld-color-fault))';
        if (warnTemp && temperatureValue >= warnTemp) return 'var(--sld-color-warning-text, var(--sld-color-warning))';
        return appearance.statusTextColorVar;
    }, [temperatureValue, data.config, appearance.statusTextColorVar]);

    const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
    const prevDisplayStatusRef = useRef(standardNodeState);
    useEffect(() => {
        if (prevDisplayStatusRef.current !== standardNodeState) {
            setIsRecentStatusChange(true);
            const timer = setTimeout(() => setIsRecentStatusChange(false), 1300);
            prevDisplayStatusRef.current = standardNodeState;
            return () => clearTimeout(timer);
        }
    }, [standardNodeState]);

    const sldAccentVar = 'var(--sld-color-accent)';
    const baseMinNodeWidth = 95;
    const baseMinNodeHeight = 105; // Increased height slightly for better spacing

    const nodeMainStyle = useMemo((): MotionStyle => {
        let currentBoxShadow = `0 0.5px 1px rgba(0,0,0,0.02), 0 0.25px 0.5px rgba(0,0,0,0.01)`;
        let borderColorActual = selected ? sldAccentVar : appearance.borderColorVar;

        if (standardNodeState === 'FAULT') {
            borderColorActual = 'var(--sld-color-fault)';
            currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 6px 0.5px ${borderColorActual.replace(')', ', 0.5)').replace('var(', 'rgba(')}`;
        } else if (standardNodeState === 'WARNING') {
            borderColorActual = 'var(--sld-color-warning)';
            currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 6px 0.5px ${borderColorActual.replace(')', ', 0.5)').replace('var(', 'rgba(')}`;
        }

        const glowColor = appearance.glowColorVar || appearance.mainStatusColorVar;
        if (isRecentStatusChange && glowColor && glowColor !== 'transparent' && standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING') {
            currentBoxShadow = `0 0 8px 2px ${glowColor.replace(')', ', 0.45)').replace('var(', 'rgba(')}`;
        }
        if (selected) {
            borderColorActual = sldAccentVar;
            currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 8px 1px ${borderColorActual.replace(')', ', 0.4)').replace('var(', 'rgba(')}, ${currentBoxShadow}`;
        }

        return {
            borderColor: borderColorActual,
            borderWidth: '1.5px', // Make border thicker
            boxShadow: currentBoxShadow,
            color: appearance.textColorVar,
            width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${baseMinNodeWidth}px`,
            height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${baseMinNodeHeight}px`,
            minWidth: `${baseMinNodeWidth}px`,
            minHeight: `${baseMinNodeHeight}px`,
            // borderRadius will be handled by className now
        };
    }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);

    const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({ id, type: type || SLDElementType.Inverter, position: nodePosition, data, selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, width: nodeWidthFromData || baseMinNodeWidth, height: nodeHeightFromData || baseMinNodeHeight, connectable: isConnectable || false }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

    const formattedAcPowerOutputWithContext = useMemo<string>(() => {
        const powerValForDisplay = currentNumericAcPower; // Assumed in Watts
        const ratedPowerInWatts = ratedPowerConfigInWatts;

        const formatSinglePowerValue = (value: number | undefined, isRatedValue: boolean): string => {
            if (value === undefined) {
                return "N/A";
            }
            let valueToFormat = value;
            let displaySuffix = isRatedValue ? 'kWp' : 'kW';
            if (value / 1000 >= 1000) {
                valueToFormat = value / 1000000;
                displaySuffix = isRatedValue ? 'MWp' : 'MW';
            } else {
                valueToFormat = value / 1000;
            }

            const absValueToFormat = Math.abs(valueToFormat);
            let precision = 1;
            if (absValueToFormat < 10) precision = 2;
            if (absValueToFormat < 1) precision = 3;
            if (absValueToFormat >= 100) precision = 0;

            return `${valueToFormat.toFixed(precision)} ${displaySuffix}`;
        };

        const actualPowerStr = formatDisplayValue(powerValForDisplay ? powerValForDisplay / 1000 : undefined, powerLink?.format || { type: 'number', precision: 1, suffix: ' kW' }, powerDataPointConfig?.dataType);
        const ratedPowerStr = ratedPowerInWatts ? formatSinglePowerValue(ratedPowerInWatts, true) : undefined;

        if (powerValForDisplay === undefined) {
            return ratedPowerStr || "N/A";
        }

        if (ratedPowerStr) {
            return `${actualPowerStr} / ${ratedPowerStr}`;
        }

        return actualPowerStr;
    }, [currentNumericAcPower, powerLink, powerDataPointConfig, ratedPowerConfigInWatts]);

    const InverterTypeDisplayIcon = useMemo(() => {
        switch (inverterType) {
            case 'hybrid': return CombineIcon;
            case 'off-grid': return PowerIcon;
            case 'on-grid': default: return GridIcon;
        }
    }, [inverterType]);

    const getHandleBaseStyle = (portType: 'source' | 'target', flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC') => {
        let baseColorVar = 'var(--sld-color-deenergized)';
        if (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') {
            baseColorVar = flowType === 'AC' ? appearance.mainStatusColorVar : 'var(--sld-color-wind, #38bdf8)'; // Wind specific color for DC
        } else if (portType === 'target') {
            if (standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING' && standardNodeState !== 'OFFLINE') {
                baseColorVar = flowType === 'AC' ? 'var(--sld-color-grid-idle, #94a3b8)' : 'var(--sld-color-wind-idle, #0ea5e9)';
            }
        }
        return { background: baseColorVar, borderColor: 'var(--sld-color-handle-border)' };
    };

    const portDefinitions = useMemo((): { id: string; type: 'source' | 'target'; position: Position; title: string; icon: React.ReactElement; flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC'; }[] => {
        const ports: { id: string; type: 'source' | 'target'; position: Position; title: string; icon: React.ReactElement; flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC'; }[] = [];
        const iconSize = 6; const iconStroke = 2.2;
        ports.push({ id: 'ac_out', type: 'source', position: Position.Top, title: 'AC Output (Load/Grid)', icon: <ArrowUpRightIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'AC' });
        ports.push({ id: 'dc_in_wind_1', type: 'target', position: Position.Bottom, title: 'Wind/DC Input 1', icon: <WindIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_PV' });
        if (data.config?.allowSecondSolarInput) { ports.push({ id: 'dc_in_wind_2', type: 'target', position: Position.Bottom, title: 'Wind/DC Input 2', icon: <WindIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_PV' }); }
        if (inverterType === 'hybrid') {
            ports.push({ id: 'batt_in_hybrid', type: 'target', position: Position.Right, title: 'Battery Charge Input', icon: <PlusIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_BATT' });
            ports.push({ id: 'batt_out_hybrid', type: 'source', position: Position.Right, title: 'Battery Discharge Output', icon: <MinusIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_BATT' });
        }
        return ports;
    }, [inverterType, data.config?.allowSecondSolarInput]);

    const getHandleStyle = (position: Position, portIndex: number, totalPortsOnSide: number) => {
        const style: React.CSSProperties = {}; if (totalPortsOnSide === 0) return {}; const baseOffset = totalPortsOnSide === 1 ? 50 : (totalPortsOnSide === 2 ? 33.33 : 25); const spacing = totalPortsOnSide > 1 ? (100 - 2 * baseOffset) / (totalPortsOnSide - 1) : 0; let currentOffset = baseOffset + (portIndex * spacing); if (totalPortsOnSide > 2) { if (portIndex === 0) currentOffset = Math.max(15, currentOffset); if (portIndex === totalPortsOnSide - 1) currentOffset = Math.min(85, currentOffset); }
        if (position === Position.Top || position === Position.Bottom) style.left = `${currentOffset}%`; else if (position === Position.Left || position === Position.Right) style.top = `${currentOffset}%`; return style;
    };
    const handleDetailsClick = (e: React.MouseEvent) => { setSelectedElementForDetails(fullNodeObjectForDetails); e.stopPropagation(); };

    const mainTransition: Transition = { opacity: { duration: 0.25 }, scale: { type: "spring", stiffness: 300, damping: 20 }, y: { type: "spring", stiffness: 300, damping: 20 }, boxShadow: { duration: 1.4, ease: "easeInOut" } };
    const exitTransition: Transition = { duration: 0.1, ease: "easeOut" };

    return (
        <motion.div
            // ✅ UI UPDATE: Added rounded-lg and thicker border
            className={`inverter-node group sld-node custom-node-hover relative flex flex-col transition-colors duration-100 ease-out overflow-visible border-2 rounded-lg`}
            style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
            initial={{ opacity: 0, scale: 0.93, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0, boxShadow: String(nodeMainStyle.boxShadow || '') }}
            exit={{ opacity: 0, scale: 0.92, y: 2, transition: exitTransition }}
            transition={mainTransition}
            whileHover={{ scale: 1.02, borderColor: selected ? sldAccentVar : sldAccentVar, boxShadow: selected || isRecentStatusChange ? String(nodeMainStyle.boxShadow) : `${nodeMainStyle.boxShadow}, 0 0 8px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar || sldAccentVar).replace(')', ', 0.3)').replace('var(', 'rgba(')}` }}
            onClick={isNodeEditable ? undefined : handleDetailsClick}
        >
            {portDefinitions.map((port) => {
                const sidePorts = portDefinitions.filter(p => p.position === port.position);
                const indexOnSide = sidePorts.findIndex(p => p.id === port.id);
                const clonedIcon = React.cloneElement(port.icon as React.ReactElement<any>, { ...(port.icon.props || {}), className: `${(port.icon.props as any)?.className || ''} text-white/75 group-hover:text-white dark:text-black/60 dark:group-hover:text-black transition-colors duration-100` });
                return (<Handle key={port.id} type={port.type} position={port.position} id={port.id} className="!w-[9px] !h-[9px] !-m-[4.5px] sld-handle-style group !z-10" style={{ ...getHandleBaseStyle(port.type, port.flowType), ...getHandleStyle(port.position, indexOnSide, sidePorts.length) }} title={port.title}> <div className="flex items-center justify-center w-full h-full">{clonedIcon}</div> </Handle>);
            })}

            <div className="absolute top-1 left-1 right-1 flex items-center justify-between z-20 h-5 pointer-events-none">
                <div title={`Type: ${inverterType.charAt(0).toUpperCase() + inverterType.slice(1).replace('-', ' ')}`} className="p-px px-0.5 bg-background/50 backdrop-blur-sm rounded-sm shadow-xs pointer-events-auto"> <InverterTypeDisplayIcon size={7.5} style={{ color: appearance.textColorVar }} className="opacity-70" /> </div>
                {!isEditMode && (<Button variant="ghost" size="icon" title="View Details" className="h-5 w-5 rounded-full group/infobtn pointer-events-auto bg-transparent hover:bg-black/[.04] dark:hover:bg-white/[.04] p-0" onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}> <InfoIcon className="h-3 w-3 text-gray-400 dark:text-gray-500 group-hover/infobtn:text-[var(--sld-color-accent)] transition-colors" /> </Button>)}
            </div>

            <div className="flex flex-col items-center justify-between w-full h-full px-1 pt-1.5 pb-1 pointer-events-none select-none">
                {/* ✅ UI UPDATE: Replaced the old visual with the new one */}
                <div className="w-full h-[32px] my-1 flex-shrink-0">
                    <DynamicWindInverterVisual
                        appearance={appearance}
                        standardNodeState={standardNodeState}
                        acPowerRatio={acPowerRatio}
                    />
                </div>

                <div className="flex flex-col items-center text-center w-full max-w-full mt-auto space-y-0">
                    <p className="text-[9px] font-semibold leading-tight w-full px-0.5 truncate" style={{ color: appearance.textColorVar }} title={data.label}>
                        {data.label}
                    </p>
                    <div className="min-h-[10px] w-full" style={{ color: appearance.statusTextColorVar }}>
                        <p className="text-[10px] font-normal leading-tight tracking-tight w-full" title={`Status: ${displayStatusText}`}>
                            {displayStatusText}
                        </p>
                    </div>

                    <div className="flex items-center justify-center space-x-1 text-[8px] font-semibold w-full leading-normal truncate" title={`AC Power: ${formattedAcPowerOutputWithContext.replace("N/A", "Not Available")}`}>
                        <ActivityIcon size={8} style={{ color: appearance.statusTextColorVar }} className="flex-shrink-0 opacity-70" />
                        <span className="text-[11px]" style={{ color: appearance.statusTextColorVar }}>
                            {formattedAcPowerOutputWithContext.split(" / ")[0]}
                            {formattedAcPowerOutputWithContext.includes(" / ") && (
                                <span className="text-[9px] opacity-70"> / {formattedAcPowerOutputWithContext.split(" / ")[1]}</span>
                            )}
                        </span>
                        {powerOpcUaNodeId && currentNumericAcPower !== undefined && (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') && (<motion.div className="w-0.5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: appearance.statusTextColorVar }} animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.3, repeat: Infinity }} />)}
                    </div>

                    {formattedTemperature && (
                        <div className="flex items-center justify-center space-x-1 w-full truncate leading-normal text-[8px]" title={`Temperature: ${formattedTemperature}`}>
                            <ThermometerIcon size={8} style={{ color: currentTempColorVar }} className="flex-shrink-0 opacity-70" />
                            <span className="text-[11px]" style={{ color: currentTempColorVar }}>
                                {formattedTemperature}
                            </span>
                            {tempOpcUaNodeId && temperatureValue !== null && (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL' || standardNodeState === 'WARNING' || standardNodeState === 'FAULT') && (<motion.div className="w-0.5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentTempColorVar }} animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.3, repeat: Infinity }} />)}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default memo(WindInverterNode); 