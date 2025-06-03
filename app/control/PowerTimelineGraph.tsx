// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces'; // Adjust if path is different
import { DataPoint } from '@/config/dataPoints'; // Adjust if path is different
import { useTheme } from 'next-themes';
import { Loader2, Zap, ShoppingCart, Send, Leaf, AlertTriangleIcon, ArrowRightToLine, ArrowLeftFromLine, PlugZap, RadioTower } from 'lucide-react'; // Added RadioTower for live button
import { Button } from "@/components/ui/button"; // Assuming you have a Button component

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from '@/lib/utils';


export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = '30s' | '1m' | '5m' | '30m' | '1h' | '6h' | '12h' | '1d' | '7d' | '1mo';

const CHART_TARGET_UNIT: PowerUnit = 'kW';
const POWER_PRECISION: Record<PowerUnit, number> = { 'W': 0, 'kW': 2, 'MW': 3, 'GW': 4 };

const chartConfig = {
    generation: { label: "Generation", icon: Zap, color: "hsl(var(--chart-1))" },
    usage:    { label: "Usage", icon: ShoppingCart, color: "hsl(var(--chart-2))" },
    gridFeed: { label: "Grid Feed", icon: Send, color: "hsl(var(--chart-3))" }, 
} satisfies ChartConfig;


const getResolvedColor = (
    colorName: keyof Omit<typeof chartConfig, 'net'> | 'net' | 'destructive' | 'success' | 'backgroundDefault' | 'backgroundSuccess' | 'backgroundDestructive', 
    theme?: string 
): string => {
    const currentTheme = theme || (typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') ? 'dark' : 'light' : 'light');

    if (typeof window === 'undefined') { /* SSR Fallbacks */
        const fallbacks: Record<string, string> = {
            generation: "hsl(200,80%,50%)", usage: "hsl(40,90%,50%)", gridFeed: "hsl(280,70%,60%)", net: "hsl(120,70%,45%)",
            destructive: "hsl(0,70%,50%)", success: "hsl(120,60%,40%)",
            backgroundDefault: "hsl(0, 0%, 98%)", backgroundSuccess: "hsla(120,60%,50%,0.05)", backgroundDestructive: "hsla(0,70%,50%,0.05)"
        };
        return fallbacks[colorName] || "hsl(0,0%,50%)";
    }
    const style = getComputedStyle(document.documentElement);
    let cssVarToLookup: string | undefined;

    if (colorName === 'destructive') cssVarToLookup = '--destructive';
    else if (colorName === 'success') cssVarToLookup = '--success';
    else if (colorName === 'backgroundDefault') return `hsl(${style.getPropertyValue('--background').trim()})`;
    else if (colorName === 'backgroundSuccess') {
        const successHSLValues = style.getPropertyValue('--success')?.trim() || '130 60% 40%';
        return `hsla(${successHSLValues} / ${currentTheme === 'dark' ? 0.1 : 0.06})`;
    } else if (colorName === 'backgroundDestructive') {
        const destructiveHSLValues = style.getPropertyValue('--destructive')?.trim() || '0 70% 50%';
        return `hsla(${destructiveHSLValues} / ${currentTheme === 'dark' ? 0.1 : 0.06})`;
    } else if (chartConfig[colorName as keyof typeof chartConfig]) { 
         const match = chartConfig[colorName as keyof typeof chartConfig]?.color?.match(/var\((--chart-\d+)\)/);
         if (match?.[1]) cssVarToLookup = match[1];
    }
    
    if (cssVarToLookup) {
        let hslValue = style.getPropertyValue(cssVarToLookup).trim();
        if (hslValue) return hslValue.startsWith("hsl") ? hslValue : `hsl(${hslValue})`;
    }
    const directFallbacks: Record<string,string> = { 
        generation: "skyblue", 
        usage: "orange", 
        gridFeed: "mediumpurple", 
        net: "mediumseagreen",
        destructive: "tomato", 
        success:"limegreen" 
    };
    return directFallbacks[colorName as Exclude<typeof colorName, 'backgroundDefault'|'backgroundSuccess'|'backgroundDestructive'>] || "grey";
};

const AnimatedNumber = ({ value, precision }: { value: number; precision: number }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 100, damping: 20 });
    const display = useTransform(spring, (current) => parseFloat(current.toFixed(precision)));
    useEffect(() => { spring.set(value); }, [spring, value]);
    return <motion.span>{display}</motion.span>;
};

interface ChartDataPoint {
    timestamp: number;
    generation: number;
    usage: number;
    gridFeed: number; 
    isSelfSufficient?: boolean;
}
interface PowerTimelineGraphProps {
    nodeValues: NodeData;
    allPossibleDataPoints: DataPoint[];
    generationDpIds: string[];
    usageDpIds: string[];
    exportDpIds: string[]; 
    exportMode: 'auto' | 'manual';
    timeScale: TimeScale; // This prop will be monitored to reset forced live mode
    isLiveSourceAvailable?: boolean; // Prop indicating if WebSocket connection is potentially up
    useDemoDataSource?: boolean; // Prop to suggest using demo data by default
}

const timeScaleConfig: Record<TimeScale, { 
    durationMs: number; tickIntervalMs: number; pointsToDisplay: number; liveUpdateIntervalMs: number;
}> = {
   '30s': { durationMs: 30*1000,          tickIntervalMs: 3*1000,          pointsToDisplay: 10, liveUpdateIntervalMs: 1*1000 },
  '1m':  { durationMs: 1*60*1000,        tickIntervalMs: 6*1000,          pointsToDisplay: 10, liveUpdateIntervalMs: 1*1000 },
  '5m':  { durationMs: 5*60*1000,        tickIntervalMs: 30*1000,         pointsToDisplay: 10, liveUpdateIntervalMs: 5*1000 },
  '30m': { durationMs: 30*60*1000,       tickIntervalMs: 3*60*1000,       pointsToDisplay: 10, liveUpdateIntervalMs: 15*1000 },
  '1h':  { durationMs: 60*60*1000,       tickIntervalMs: 6*60*1000,       pointsToDisplay: 10, liveUpdateIntervalMs: 30*1000 },
  '6h':  { durationMs: 6*60*60*1000,     tickIntervalMs: 36*60*1000,      pointsToDisplay: 10, liveUpdateIntervalMs: 2*60*1000 },
  '12h': { durationMs: 12*60*60*1000,    tickIntervalMs: 72*60*1000,      pointsToDisplay: 10, liveUpdateIntervalMs: 5*60*1000 },
  '1d':  { durationMs: 24*60*60*1000,    tickIntervalMs: 2.4*60*60*1000,  pointsToDisplay: 10, liveUpdateIntervalMs: 10*60*1000 },
  '7d':  { durationMs: 7*24*60*60*1000,  tickIntervalMs: 16.8*60*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 30*60*1000 },
  '1mo': { durationMs: 30*24*60*60*1000, tickIntervalMs: 72*60*60*1000,   pointsToDisplay: 10, liveUpdateIntervalMs: 60*60*1000 }
};
const unitToFactorMap: Record<PowerUnit, number> = { W: 1, kW: 1000, MW: 1000000, GW: 1000000000 };
const convertToWatts = (v: number, u?: string): number => {
    if (typeof u !== 'string' || !u.trim()) return v;
    const unitClean = u.trim().toUpperCase() as PowerUnit | string;
    const factor = unitToFactorMap[unitClean as PowerUnit];
    return factor !== undefined ? v * factor : v;
};
const convertFromWatts = (v: number, targetUnit: PowerUnit): number => {
    return v / (unitToFactorMap[targetUnit] || 1);
}; 


const PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues, allPossibleDataPoints, generationDpIds, usageDpIds, exportDpIds,
    exportMode, timeScale, isLiveSourceAvailable = true, useDemoDataSource = false,
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const { resolvedTheme } = useTheme();
    const [isGraphReady, setIsGraphReady] = useState(false); 
    const [animationKey, setAnimationKey] = useState(Date.now());
    const [lastUpdatedDisplayTime, setLastUpdatedDisplayTime] = useState<string>('N/A');
    
    const displayUnitLabel = CHART_TARGET_UNIT; 
    const valuePrecision = POWER_PRECISION[CHART_TARGET_UNIT];
    const prevDemoUsageRef = useRef<number | null>(null);

    const dataBufferRef = useRef<ChartDataPoint[]>([]);
    const demoDataIngestTimer = useRef<NodeJS.Timeout | null>(null);
    const graphUpdateTimer = useRef<NodeJS.Timeout | null>(null);

    // State to manage if the "Go Live" button has been clicked to force live mode
    const [isForcedLiveUiButtonActive, setIsForcedLiveUiButtonActive] = useState(false);

    // Reset forced live mode if the parent changes the timeScale
    const previousTimeScaleRef = useRef(timeScale);
    useEffect(() => {
        if (previousTimeScaleRef.current !== timeScale) {
            setIsForcedLiveUiButtonActive(false);
            previousTimeScaleRef.current = timeScale;
        }
    }, [timeScale]);

    // Determine effective operating modes
    const effectiveUseDemoData = useMemo(() => useDemoDataSource && !isForcedLiveUiButtonActive, [useDemoDataSource, isForcedLiveUiButtonActive]);
    const effectiveIsLive = useMemo(() => (isLiveSourceAvailable || isForcedLiveUiButtonActive) && !effectiveUseDemoData, [isLiveSourceAvailable, isForcedLiveUiButtonActive, effectiveUseDemoData]);


    const generateDemoValues = useCallback(() => {
        // ... (Demo value generation logic remains the same)
        const now = new Date();
        const totalMinutesInDay = now.getHours() * 60 + now.getMinutes();
        const peakSolarTime = 13 * 60; 
        const solarActivityStart = 6.0 * 60; 
        const solarActivityEnd = 19.0 * 60;   
        let solarPotentialFactor = 0;
        if (totalMinutesInDay >= solarActivityStart && totalMinutesInDay <= solarActivityEnd) {
            solarPotentialFactor = Math.sin((totalMinutesInDay - solarActivityStart) * Math.PI / (solarActivityEnd - solarActivityStart));
            solarPotentialFactor = Math.max(0, solarPotentialFactor);
        }
        const maxSolarOutputW = 12000; 
        const cloudCycle1Minutes = 180; 
        const cloudPhase1 = (totalMinutesInDay / cloudCycle1Minutes) * 2 * Math.PI;
        const cloudEffect1 = (Math.sin(cloudPhase1 + Math.PI/4) + 1) / 2; 
        const cloudCycle2Minutes = 75;  
        const cloudPhase2 = (totalMinutesInDay / cloudCycle2Minutes) * 2 * Math.PI;
        const cloudEffect2 = (Math.sin(cloudPhase2) + 1) / 2;
        let combined_cloud_density = (cloudEffect1 * 0.6 + cloudEffect2 * 0.4); 
        const dailyWeatherTypeCycleMinutes = 24 * 60; 
        const dailyWeatherPhase = (totalMinutesInDay / dailyWeatherTypeCycleMinutes) * 2 * Math.PI + Math.PI; 
        const daily_max_cloud_impact = 0.6 + ((Math.sin(dailyWeatherPhase) + 1) / 2) * 0.4; 
        let final_cloud_cover_effect = combined_cloud_density * daily_max_cloud_impact;
        final_cloud_cover_effect = Math.min(0.95, Math.max(0, final_cloud_cover_effect));
        const weatherGenerationFactor = 1.0 - final_cloud_cover_effect;
        let demoGenerationW = solarPotentialFactor * maxSolarOutputW * weatherGenerationFactor;
        demoGenerationW += (Math.sin(totalMinutesInDay / 5 * Math.PI * 2) * 25); 
        demoGenerationW = Math.max(0, demoGenerationW);
        const baseUsageW_target = 600 + (Math.sin(totalMinutesInDay / (120) * Math.PI * 2) * 200);
        const morningPeakTime = 7.5 * 60; const eveningPeakTime = 18.5 * 60; const usageSpread = 1.2 * 60;
        const morningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - morningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        const eveningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - eveningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        const peakUsageIncreaseW_target = 2000 + (Math.sin(totalMinutesInDay / (240) * Math.PI * 2 + Math.PI/2) * 1000);
        let targetDemoUsageW = baseUsageW_target + 
                                (morningUsageFactor * peakUsageIncreaseW_target) + 
                                (eveningUsageFactor * peakUsageIncreaseW_target * 1.1);
        targetDemoUsageW += (Math.sin(totalMinutesInDay / 30 * Math.PI * 2) * 150);
        targetDemoUsageW = Math.max(200, targetDemoUsageW);
        let currentDemoUsageW: number;
        const smoothingFactor = 0.1; 
        if (prevDemoUsageRef.current === null) {
            currentDemoUsageW = targetDemoUsageW;
        } else {
            currentDemoUsageW = prevDemoUsageRef.current + smoothingFactor * (targetDemoUsageW - prevDemoUsageRef.current);
        }
        prevDemoUsageRef.current = currentDemoUsageW;
        let demoGridFeedW = 0;
        const netLocalW = demoGenerationW - currentDemoUsageW;
        if (exportMode === 'auto') {
            demoGridFeedW = netLocalW; 
        } else { 
            if (netLocalW < -500) { 
                demoGridFeedW = netLocalW * (0.7 + (Math.sin(totalMinutesInDay / 15 * Math.PI) + 1) / 2 * 0.3);
            } else if (netLocalW > 500) { 
                demoGridFeedW = netLocalW * (0.5 + (Math.sin(totalMinutesInDay / 20 * Math.PI + 0.5) + 1) / 2 * 0.5);
            } else { 
                demoGridFeedW = (Math.sin(totalMinutesInDay / 10 * Math.PI) * 500);
            }
        }
        return {
            generation: convertFromWatts(demoGenerationW, CHART_TARGET_UNIT),
            usage: convertFromWatts(currentDemoUsageW, CHART_TARGET_UNIT),
            gridFeed: convertFromWatts(demoGridFeedW, CHART_TARGET_UNIT),
        };
    }, [exportMode, CHART_TARGET_UNIT]);

    const sumValuesForDpIds = useCallback((dpIdsToSum: string[]): number => {
        if (!allPossibleDataPoints?.length || !Object.keys(nodeValues || {}).length) { return 0; }
        let sumInWatts = 0;
        dpIdsToSum.forEach(dpId => {
            const dp = allPossibleDataPoints.find(p => p.id === dpId);
            if (dp) {
                const rawValueFromNode = nodeValues[dp.nodeId];
                let numericValue = 0; let unitForConversion = dp.unit;
                if (typeof rawValueFromNode === 'object' && rawValueFromNode !== null) {
                    if ('value' in rawValueFromNode) {
                        const typedValue = rawValueFromNode as { value: unknown, unit?: string };
                        numericValue = Number(typedValue.value) || 0;
                        if ('unit' in rawValueFromNode && typeof typedValue.unit === 'string') { unitForConversion = typedValue.unit;}
                    }
                } else if (typeof rawValueFromNode === 'number') { numericValue = rawValueFromNode; }
                const factor = dp.factor || 1;
                const valueOfInterest = (isFinite(numericValue) ? numericValue * factor : 0);
                sumInWatts += convertToWatts(valueOfInterest, unitForConversion);
            }
        });
        return convertFromWatts(sumInWatts, CHART_TARGET_UNIT);
    }, [nodeValues, allPossibleDataPoints, CHART_TARGET_UNIT]);

    // Effect for resetting state and buffer when major configurations change (now includes effective modes)
    useEffect(() => {
        setChartData([]);
        setAnimationKey(Date.now());
        setIsGraphReady(false);
        setLastUpdatedDisplayTime('N/A');
        prevDemoUsageRef.current = null;
        dataBufferRef.current = [];

        if (graphUpdateTimer.current) clearInterval(graphUpdateTimer.current);
        graphUpdateTimer.current = null;
        if (demoDataIngestTimer.current) clearInterval(demoDataIngestTimer.current);
        demoDataIngestTimer.current = null;
    }, [timeScale, generationDpIds, usageDpIds, exportDpIds, exportMode, effectiveIsLive, effectiveUseDemoData]); // Added effectiveIsLive, effectiveUseDemoData

    // Effect for POPULATING dataBufferRef (Ingestion of data)
    useEffect(() => {
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;
        if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }

        if (effectiveUseDemoData) { // Use effective mode
            const demoIngestInterval = 1000;
            const generateAndBufferDemo = () => { /* ... same ... */ 
                const nowMs = Date.now();
                const demo = generateDemoValues();
                const newBufferedPoint: ChartDataPoint = { timestamp: nowMs, generation: parseFloat(demo.generation.toFixed(valuePrecision)), usage: parseFloat(demo.usage.toFixed(valuePrecision)), gridFeed: parseFloat(demo.gridFeed.toFixed(valuePrecision)), isSelfSufficient: demo.gridFeed >= 0 };
                dataBufferRef.current.push(newBufferedPoint);
            };
            if (dataBufferRef.current.length === 0 && dpsConfigured) generateAndBufferDemo();
            if(dpsConfigured) demoDataIngestTimer.current = setInterval(generateAndBufferDemo, demoIngestInterval);
        
        } else if (effectiveIsLive && dpsConfigured && allPossibleDataPoints?.length > 0 && Object.keys(nodeValues || {}).length > 0) { // Use effective mode
            const nowMs = Date.now();
            let currentGen = sumValuesForDpIds(generationDpIds);
            let currentUse = sumValuesForDpIds(usageDpIds);
            let currentGridFeed = (exportMode === 'manual' && exportDpIds.length > 0) ? sumValuesForDpIds(exportDpIds) : ( Math.abs(currentGen) - Math.abs(currentUse));
            const newBufferedPoint: ChartDataPoint = {
                timestamp: nowMs, generation: parseFloat(currentGen.toFixed(valuePrecision)),
                usage: parseFloat(currentUse.toFixed(valuePrecision)), gridFeed: parseFloat(currentGridFeed.toFixed(valuePrecision)),
                isSelfSufficient: currentGridFeed >= 0,
            };
            dataBufferRef.current.push(newBufferedPoint);
        }
        return () => { if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }};
    }, [
        nodeValues, generationDpIds, usageDpIds, exportDpIds, exportMode, allPossibleDataPoints,
        valuePrecision, sumValuesForDpIds, generateDemoValues,
        effectiveIsLive, effectiveUseDemoData // Core dependencies for ingestion logic
    ]);

    // Effect for UPDATING THE GRAPH DISPLAY from dataBufferRef (Rendering logic)
    useEffect(() => {
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;
        const updateAndRenderGraph = (isInitialSetup: boolean = false) => { /* ... same ... */
            const nowMs = Date.now();
            const { durationMs } = timeScaleConfig[timeScale];
            let viewAnchorTime = nowMs;
            if (!effectiveIsLive && !effectiveUseDemoData && dataBufferRef.current.length > 0) { // Use effective modes
                viewAnchorTime = dataBufferRef.current[dataBufferRef.current.length - 1].timestamp;
            }
            const cutoffTimeForDisplay = viewAnchorTime - durationMs;
            let pointsForGraph = dataBufferRef.current.filter(d => d.timestamp >= cutoffTimeForDisplay);
            const maxDataPointsOnGraph = Math.max(timeScaleConfig[timeScale].pointsToDisplay * 6, 180);
            if (pointsForGraph.length > maxDataPointsOnGraph) { pointsForGraph = pointsForGraph.slice(-maxDataPointsOnGraph); }
            setChartData(currentChartData => { if (JSON.stringify(currentChartData) === JSON.stringify(pointsForGraph)) { return currentChartData;} return pointsForGraph; });
            setLastUpdatedDisplayTime(new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            if (!isGraphReady && (effectiveUseDemoData || effectiveIsLive) && dpsConfigured && pointsForGraph.length > 0) { setIsGraphReady(true); // Use effective modes
            } else if (!isGraphReady && !effectiveIsLive && !effectiveUseDemoData && dpsConfigured) { setIsGraphReady(true); } // Use effective modes
            const bufferHistoryToKeepMs = Math.max(durationMs * 5, 2 * 24 * 60 * 60 * 1000); 
            const bufferCutoffTimestamp = nowMs - bufferHistoryToKeepMs;
            let i = 0; while(i < dataBufferRef.current.length && dataBufferRef.current[i].timestamp < bufferCutoffTimestamp) i++;
            if (i > 0) { dataBufferRef.current.splice(0, i); }
         };
        if (graphUpdateTimer.current) { clearInterval(graphUpdateTimer.current); graphUpdateTimer.current = null; }
        if (!dpsConfigured && (effectiveIsLive || effectiveUseDemoData)) { setIsGraphReady(false); setChartData([]); return; } // Use effective modes
        updateAndRenderGraph(true);
        if (effectiveIsLive || effectiveUseDemoData) { // Use effective modes
             if (dpsConfigured) {
                const { liveUpdateIntervalMs } = timeScaleConfig[timeScale];
                graphUpdateTimer.current = setInterval(() => updateAndRenderGraph(false), liveUpdateIntervalMs);
             }
        }
        return () => { if (graphUpdateTimer.current) { clearInterval(graphUpdateTimer.current); graphUpdateTimer.current = null; }};
    }, [
        timeScale, isGraphReady, generationDpIds, usageDpIds, // Configuration for dpsConfigured
        effectiveIsLive, effectiveUseDemoData // Core dependencies for rendering timers and logic
    ]);
    
    const currentValues = useMemo(() => {
        let liveGen = 0, liveUse = 0, liveGridFeed = 0;
        let currentTimestamp = Date.now(); let isSufficient = false;
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;

        if (effectiveUseDemoData && dpsConfigured) { // Use effective mode
             const demo = generateDemoValues();
             liveGen = demo.generation; liveUse = demo.usage; liveGridFeed = demo.gridFeed; isSufficient = liveGridFeed >= 0;
        } else if (effectiveIsLive && dpsConfigured && Object.keys(nodeValues || {}).length > 0 && allPossibleDataPoints && allPossibleDataPoints.length > 0) { // Use effective mode
            liveGen = sumValuesForDpIds(generationDpIds); liveUse = sumValuesForDpIds(usageDpIds);
            if (exportMode === 'manual' && exportDpIds.length > 0) { liveGridFeed = sumValuesForDpIds(exportDpIds); } else { liveGridFeed = liveGen - liveUse; }
            isSufficient = liveGridFeed >= 0;
        } else if (chartData.length > 0) {
            const lastPoint = chartData[chartData.length-1];
            liveGen = lastPoint.generation; liveUse = lastPoint.usage; liveGridFeed = lastPoint.gridFeed;
            currentTimestamp = lastPoint.timestamp; isSufficient = lastPoint.isSelfSufficient ?? liveGridFeed >= 0;
        }
        return { 
            generation: parseFloat(liveGen.toFixed(valuePrecision)), usage: parseFloat(liveUse.toFixed(valuePrecision)),
            gridFeed: parseFloat(liveGridFeed.toFixed(valuePrecision)), timestamp: currentTimestamp, isSelfSufficient: isSufficient,
        };
    }, [
        nodeValues, allPossibleDataPoints, chartData, generationDpIds, usageDpIds, exportDpIds, exportMode, 
        valuePrecision, generateDemoValues, sumValuesForDpIds,
        effectiveIsLive, effectiveUseDemoData // Core dependencies for calculating current values
    ]);

    const chartBackgroundFill = useMemo(() => currentValues.isSelfSufficient ? getResolvedColor('backgroundSuccess', resolvedTheme) : getResolvedColor('backgroundDestructive', resolvedTheme), [currentValues.isSelfSufficient, resolvedTheme]);

    const formatXAxisTick = useCallback((ts: number) => { /* ... same ... */ 
        const date = new Date(ts); 
        switch(timeScale){
            case '1d': case '7d': case '1mo': const h = date.getHours(); return (h % 6 === 0 || h === 0) ? date.toLocaleTimeString([],{hour12:false, hour:'numeric'}) : '';
            case '12h': case '6h': return date.toLocaleTimeString([],{hour12:false,hour:'numeric',minute:'2-digit'});
            case '1h':  case '30m': return date.toLocaleTimeString([],{hour12:false,hour:'numeric',minute:'2-digit'});
            default: return date.toLocaleTimeString([],{minute:'2-digit',second:'2-digit'});
        }
    }, [timeScale]);

    const xAxisDomain = useMemo(():[number|'dataMin',number|'dataMax'] => { /* ... same logic but use effectiveIsLive/Demo ... */
        const {durationMs}=timeScaleConfig[timeScale]; const now=Date.now(); let endAnchor = now;
        if (effectiveIsLive || effectiveUseDemoData) { endAnchor = now; // Use effective modes
        } else if (chartData.length > 0) { endAnchor = chartData[chartData.length -1].timestamp;
        } else if (dataBufferRef.current.length > 0 && !effectiveIsLive && !effectiveUseDemoData) { endAnchor = dataBufferRef.current[dataBufferRef.current.length -1].timestamp;} // Use effective modes
        return [endAnchor-durationMs, endAnchor];
    },[timeScale,chartData, effectiveIsLive, effectiveUseDemoData]); // Added effectiveIsLive, effectiveUseDemoData
    
    const yAxisDomain = useMemo(():[number,number] => { /* ... same ... */
        let vals = chartData.length > 0 ? chartData.flatMap(d => [d.generation, d.usage, d.gridFeed]) : [currentValues.generation, currentValues.usage, currentValues.gridFeed];
        const finiteVals = vals.filter(v => typeof v === 'number' && isFinite(v));
        const defMinY = CHART_TARGET_UNIT === 'kW' ? -10 : -10000; const defMaxY = CHART_TARGET_UNIT === 'kW' ? 50 : 50000;
        if(finiteVals.length === 0) return [defMinY, defMaxY];
        let minV = Math.min(...finiteVals); let maxV = Math.max(...finiteVals);
        if (minV === maxV) {
            const singleValueMinPad = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 100 : 0.1);
            if (minV === 0) { return [ (CHART_TARGET_UNIT === 'kW' ? -1 : (CHART_TARGET_UNIT === 'W' ? -500 : -0.5)), (CHART_TARGET_UNIT === 'kW' ? 5  : (CHART_TARGET_UNIT === 'W' ? 2500 : 2.5)) ]; }
            const paddingAmount = Math.max(Math.abs(minV * 0.5), singleValueMinPad); 
            return [ Math.floor(minV - paddingAmount), Math.ceil(maxV + paddingAmount) ];
        }
        const range = maxV - minV; const rangeMinPad = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 500 : 0.1);
        let pad = Math.max(range * 0.20, rangeMinPad); return [Math.floor(minV - pad), Math.ceil(maxV + pad)];
    },[chartData, currentValues, CHART_TARGET_UNIT]);

    const isNaturallyLivePropDriven = isLiveSourceAvailable && !useDemoDataSource && !isForcedLiveUiButtonActive;
    const isCurrentlyDrawingLive = effectiveIsLive && !effectiveUseDemoData;


    // ----- UI Conditional Rendering -----
    if (!effectiveUseDemoData && (generationDpIds.length === 0 || usageDpIds.length === 0)) { // Check based on effective demo mode
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4 text-center">Please configure Generation and Usage data points.</div>;
    }
    if (!isGraphReady && (effectiveIsLive || effectiveUseDemoData) && (chartData.length === 0 && dataBufferRef.current.length === 0) ) { // Check based on effective modes
        return <div className="flex flex-col items-center justify-center h-[340px] text-muted-foreground p-4 space-y-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span>Waiting for initial data...</span></div>;
    }
    
    return (
        <motion.div 
            className={cn( /* ... same ... */
                "space-y-2 p-3 rounded-xl shadow-lg border-2 transition-colors duration-700 ease-in-out", 
                currentValues.isSelfSufficient ? "border-green-400/60 dark:border-green-500/70" : "border-red-400/60 dark:border-red-500/70"
            )}
            style={{ backgroundColor: chartBackgroundFill }} animate={{ backgroundColor: chartBackgroundFill }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        > 
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs sm:text-sm mb-2 px-1">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 items-stretch">
                    {/* ... (Current value display remains the same) ... */}
                    {(['generation', 'usage', 'gridFeed'] as const).map(key => {
                        const configEntry = chartConfig[key as keyof typeof chartConfig];
                        const value = currentValues[key as keyof Omit<typeof currentValues, 'timestamp' | 'isSelfSufficient'>]; 
                        let itemColor: string; let IconToUse: React.ElementType; let labelText: string;
                        if (key === 'gridFeed') {
                            const gridValueNum = typeof value === 'number' ? value : 0;
                            itemColor = gridValueNum === 0 ? getResolvedColor('net', resolvedTheme) : (gridValueNum > 0 ? getResolvedColor('success', resolvedTheme) : getResolvedColor('destructive', resolvedTheme));
                            IconToUse = gridValueNum === 0 ? PlugZap : (gridValueNum > 0 ? ArrowRightToLine : ArrowLeftFromLine);
                            labelText = gridValueNum === 0 ? "Grid Balanced" : (gridValueNum > 0 ? "Grid Export" : "Grid Import");
                        } else { itemColor = getResolvedColor(key, resolvedTheme); IconToUse = configEntry.icon; labelText = configEntry.label; }
                        return (
                            <motion.div key={key} className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-lg bg-background/50 dark:bg-black/20 shadow" whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                                <IconToUse className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{color: itemColor}} />
                                <div className="flex flex-col">
                                    <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{labelText}</span>
                                    <span className="font-bold text-sm sm:text-base leading-tight" style={{color: itemColor}}><AnimatedNumber value={typeof value === 'number' ? Math.abs(value) : 0} precision={valuePrecision} /> {displayUnitLabel}</span>
                                </div>
                            </motion.div>
                        )
                    })}
                     <motion.div key={currentValues.isSelfSufficient ? 'green-status' : 'red-status'} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay:0.1, ease: "easeOut" }}
                        className={cn("flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs sm:text-sm col-span-2 sm:col-span-1 md:col-auto shadow", currentValues.isSelfSufficient ? 'bg-green-500/20 text-green-700 dark:bg-green-500/25 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-300' )}>
                        {currentValues.isSelfSufficient ? <Leaf className="h-4 w-4 sm:h-5 sm:w-5"/> : <AlertTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5"/>}
                        <span className="leading-tight">{currentValues.isSelfSufficient ? "Self-Sufficient" : "Grid Dependent"}</span>
                    </motion.div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1 sm:mt-0">
                    <Button
                        variant={isCurrentlyDrawingLive ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                            // Only force live if not already forced by this button
                            // and not already naturally live by props.
                            if (!isForcedLiveUiButtonActive && !isNaturallyLivePropDriven) {
                                setIsForcedLiveUiButtonActive(true);
                            }
                        }}
                        className="text-xs px-2 py-1 h-auto"
                        disabled={isForcedLiveUiButtonActive || isNaturallyLivePropDriven}
                    >
                        {isCurrentlyDrawingLive && <RadioTower className="h-3 w-3 mr-1.5 animate-pulse text-green-500" />}
                        {!isCurrentlyDrawingLive && <RadioTower className="h-3 w-3 mr-1.5" />}
                        {isCurrentlyDrawingLive ? "Live" : "Go Live"}
                    </Button>

                    {/* Conditional LIVE indicator (could be removed if button is sufficient) */}
                    {isCurrentlyDrawingLive && (generationDpIds.length > 0 && usageDpIds.length > 0) && (
                         <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-800/70 text-green-700 dark:text-green-300 text-[0.7rem] font-medium">
                             <span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>REALTIME
                         </div>
                    )}
                     {effectiveUseDemoData && (generationDpIds.length > 0 && usageDpIds.length > 0) && (
                        <div className="flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800/70 text-blue-700 dark:text-blue-300 text-[0.7rem] font-medium">
                            DEMO
                        </div>
                    )}
                   <span>Updated: {lastUpdatedDisplayTime}</span>
                </div>
            </div>
            {/* Chart Area (remains the same) */}
            <AnimatePresence mode="wait"> 
                <motion.div key={animationKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-[260px] sm:h-[280px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <LineChart accessibilityLayer data={chartData} margin={{ top: 5, right: 12, left: -15, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="2 2" stroke={resolvedTheme === 'dark' ? "hsl(var(--border)/0.4)" : "hsl(var(--border)/0.7)"} />
                            <XAxis dataKey="timestamp" type="number" domain={xAxisDomain} scale="time" tickFormatter={formatXAxisTick} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} stroke="hsl(var(--muted-foreground))"/>
                            <YAxis yAxisId="left" domain={yAxisDomain} orientation="left" width={60} tickFormatter={(v) => v.toFixed(0)} tickLine={false} axisLine={false} tickMargin={5} stroke="hsl(var(--muted-foreground))"/>
                            <ChartTooltip cursor={{stroke: "hsl(var(--foreground)/0.3)", strokeDasharray: '3 3'}} 
                                content={ <ChartTooltipContent hideLabel 
                                    labelFormatter={(label,payload) => payload?.[0]?.payload?.timestamp ? new Date(payload[0].payload.timestamp).toLocaleString([],{dateStyle:'short',timeStyle:'medium'}) : ""}
                                    formatter={(value, name, item) => { /* ... same ... */ 
                                        const dataKey = item.dataKey as keyof ChartDataPoint;
                                        let label = (chartConfig[dataKey as keyof Omit<typeof chartConfig, 'net'>] as { label: string })?.label || name;
                                        if (dataKey === 'gridFeed' && item.payload) {
                                            label = item.payload.gridFeed >= 0 ? "Grid Export" : "Grid Import";
                                            return ( <div className="flex items-center gap-2"> <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: item.color}}/> <div className="flex flex-1 justify-between leading-none"> <span className="text-muted-foreground">{label}</span> <span className="font-bold">{(value as number).toFixed(valuePrecision)} {displayUnitLabel}</span> </div> </div> );
                                        } return ( <div className="flex items-center gap-2"> <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: item.color}}/> <div className="flex flex-1 justify-between leading-none"> <span className="text-muted-foreground">{label}</span> <span className="font-bold">{(value as number).toFixed(valuePrecision)} {displayUnitLabel}</span> </div> </div> );
                                    }}
                                    itemSorter={(item)=>{ const order={generation:1,usage:2,gridFeed:3}; return order[item.dataKey as keyof typeof order] ?? 4; }}
                                /> } />
                            <ChartLegend content={<ChartLegendContent className="mt-1 -mb-1" />} />
                            <Line yAxisId="left" dataKey="generation" type="monotone" stroke={getResolvedColor("generation", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(effectiveIsLive||effectiveUseDemoData)} animationDuration={effectiveUseDemoData?400:200} connectNulls={false} />
                            <Line yAxisId="left" dataKey="usage" type="monotone" stroke={getResolvedColor("usage", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(effectiveIsLive||effectiveUseDemoData)} animationDuration={effectiveUseDemoData?400:200} connectNulls={false} />
                            <Line yAxisId="left" dataKey="gridFeed" name={chartConfig.gridFeed.label} type="monotone" stroke={currentValues.gridFeed >=0 ? getResolvedColor("gridFeed", resolvedTheme) : getResolvedColor("destructive", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(effectiveIsLive||effectiveUseDemoData)} animationDuration={effectiveUseDemoData?400:200} connectNulls={false} />
                        </LineChart>
                    </ChartContainer>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default PowerTimelineGraph;