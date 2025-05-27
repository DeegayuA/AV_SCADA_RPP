// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// ... other imports from previous correct version
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces';
import { DataPoint } from '@/config/dataPoints';
import { useTheme } from 'next-themes';
import { Loader2, Zap, ShoppingCart, Send, TrendingUp, Leaf, AlertTriangleIcon, ArrowRightToLine, ArrowLeftFromLine, PlugZap } from 'lucide-react';

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
    // net:      { label: "Net Power",icon: TrendingUp, color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;


const getResolvedColor = ( /* ... same as previous ... */
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
    const directFallbacks: Record<string,string> = { generation: "skyblue", usage: "orange", gridFeed: "mediumpurple", net: "mediumseagreen", destructive: "tomato", success:"limegreen" };
    return directFallbacks[colorName as Exclude<typeof colorName, 'backgroundDefault'|'backgroundSuccess'|'backgroundDestructive'>] || "grey";
};


const AnimatedNumber = ({ value, precision }: { value: number; precision: number }) => { /* ... same ... */
    const spring = useSpring(value, { mass: 0.8, stiffness: 100, damping: 20 });
    const display = useTransform(spring, (current) => parseFloat(current.toFixed(precision)));
    useEffect(() => { spring.set(value); }, [spring, value]);
    return <motion.span>{display}</motion.span>;
};

interface ChartDataPoint { /* ... same ... */
    timestamp: number;
    generation: number;
    usage: number;
    gridFeed: number; 
    // net: number; 
    isSelfSufficient?: boolean;
}
interface PowerTimelineGraphProps { /* ... same ... */
    nodeValues: NodeData;
    allPossibleDataPoints: DataPoint[];
    generationDpIds: string[];
    usageDpIds: string[];
    exportDpIds: string[]; 
    exportMode: 'auto' | 'manual';
    timeScale: TimeScale;
    isLive?: boolean;
    useDemoData?: boolean; 
}

const timeScaleConfig: Record<TimeScale, { 
    durationMs: number; tickIntervalMs: number; pointsToDisplay: number; liveUpdateIntervalMs: number;
}> = { /* ... same ... */
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
const convertToWatts = (v: number, u?: string) => { /* ... same ... */
    if (typeof u !== 'string' || !u.trim()) return v;
    const uc = u.trim().toUpperCase() as PowerUnit | string;
    const f = unitToFactorMap[uc as PowerUnit]; return f !== undefined ? v * f : v;
};
const convertFromWatts = (v: number, u: PowerUnit) => v / (unitToFactorMap[u] || 1); 


const PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues, allPossibleDataPoints, generationDpIds, usageDpIds, exportDpIds,
    exportMode, timeScale, isLive = true, useDemoData = false,
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const { resolvedTheme } = useTheme();
    const liveUpdateTimer = useRef<NodeJS.Timeout | null>(null);
    const [isGraphReady, setIsGraphReady] = useState(false); 
    const [animationKey, setAnimationKey] = useState(Date.now());
    const [lastUpdatedDisplayTime, setLastUpdatedDisplayTime] = useState<string>('N/A');
    
    const displayUnitLabel = CHART_TARGET_UNIT; 
    const valuePrecision = POWER_PRECISION[CHART_TARGET_UNIT];

    const generateDemoValues = useCallback(() => {
        const now = new Date();
        const totalMinutesInDay = now.getHours() * 60 + now.getMinutes();
    
        // Solar generation: More pronounced curve, potential for zero at night
        const peakSolarTime = 13 * 60; // 1 PM
        const solarActivityStart = 6.5 * 60; // 6.30 AM
        const solarActivityEnd = 18.5 * 60; // 6.30 PM
        let solarFactor = 0;
        if (totalMinutesInDay > solarActivityStart && totalMinutesInDay < solarActivityEnd) {
            solarFactor = Math.sin((totalMinutesInDay - solarActivityStart) * Math.PI / (solarActivityEnd - solarActivityStart));
            solarFactor = Math.max(0, solarFactor); // Ensure non-negative
        }
        const maxSolarOutputW = 12000; // Peak 12kW in Watts
        let demoGenerationW = solarFactor * maxSolarOutputW * (0.75 + Math.random() * 0.5); // More variability
        demoGenerationW = Math.max(0, demoGenerationW + (Math.random() - 0.5) * 800); 
    
        // Usage: Base load + morning/evening peaks, some randomness
        const baseUsageW = 800 + Math.random() * 400; // Base 0.8-1.2kW
        const morningPeakTime = 7.5 * 60; const eveningPeakTime = 18.5 * 60; const usageSpread = 1.5 * 60;
        const morningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - morningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        const eveningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - eveningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        const peakUsageIncreaseW = 2500 + Math.random() * 1500; // Additional peak up to 2.5-4kW
        let demoUsageW = baseUsageW + (morningUsageFactor * peakUsageIncreaseW) + (eveningUsageFactor * peakUsageIncreaseW * 1.2);
        demoUsageW = Math.max(300, demoUsageW + (Math.random() - 0.5) * 400); // Min usage 0.3kW
    
        let demoGridFeedW = 0;
        const netLocalW = demoGenerationW - demoUsageW; // What's left after local usage

        if (exportMode === 'auto') {
            demoGridFeedW = netLocalW; // positive is export, negative is import
        } else { // 'manual' demo for grid feed
            if (netLocalW < -500) { // Significant deficit, likely import
                demoGridFeedW = netLocalW * (0.7 + Math.random() * 0.3); // Import a portion of deficit
            } else if (netLocalW > 500) { // Significant surplus, likely export
                demoGridFeedW = netLocalW * (0.5 + Math.random() * 0.5); // Export a portion of surplus
            } else { // Near balance, could be small import/export or zero
                demoGridFeedW = (Math.random() - 0.5) * 1000; // Small random feed +/- 0.5kW
            }
        }
    
        return {
            generation: convertFromWatts(demoGenerationW, CHART_TARGET_UNIT),
            usage: convertFromWatts(demoUsageW, CHART_TARGET_UNIT),
            gridFeed: convertFromWatts(demoGridFeedW, CHART_TARGET_UNIT),
        };
    }, [exportMode]);


    const sumValuesForDpIds = useCallback((dpIdsToSum: string[]): number => { /* ... same ... */
        if (useDemoData) return 0; 
        if (!allPossibleDataPoints?.length || !Object.keys(nodeValues).length) return 0;
        let sumInWatts = 0;
        dpIdsToSum.forEach(dpId => {
            const dp = allPossibleDataPoints.find(p => p.id === dpId);
            if (dp) {
                const rV = nodeValues[dp.nodeId]; const f = dp.factor || 1;
                const vOI = (typeof rV === 'number' && isFinite(rV) ? rV * f : 0);
                sumInWatts += convertToWatts(vOI, dp.unit);
            }
        });
        return convertFromWatts(sumInWatts, CHART_TARGET_UNIT);
    }, [nodeValues, allPossibleDataPoints, useDemoData]);
    
    useEffect(() => { /* ... unchanged config reset effect ... */
        setChartData([]); setAnimationKey(Date.now()); setIsGraphReady(false);
        setLastUpdatedDisplayTime('N/A');
    }, [timeScale, generationDpIds, usageDpIds, exportDpIds, exportMode, useDemoData]);

    useEffect(() => { /* Main data update logic */
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;
        if ((!isLive && !useDemoData) || (!useDemoData && !dpsConfigured)) {
            if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
            setIsGraphReady(dpsConfigured && !isLive); return;
        }
        const { durationMs, liveUpdateIntervalMs, pointsToDisplay } = timeScaleConfig[timeScale];
        
        const updateData = () => {
            const nowMs = Date.now();
            setLastUpdatedDisplayTime(new Date(nowMs).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
            
            let currentGen = 0, currentUse = 0, currentGridFeed = 0;

            if (useDemoData) {
                const demo = generateDemoValues();
                currentGen = demo.generation; currentUse = demo.usage; currentGridFeed = demo.gridFeed;
                 if (!isGraphReady) setIsGraphReady(true);
            } else {
                const canProcess = dpsConfigured && allPossibleDataPoints?.length && Object.keys(nodeValues).length > 0;
                if (canProcess) {
                    currentGen = sumValuesForDpIds(generationDpIds);
                    currentUse = sumValuesForDpIds(usageDpIds);
                    currentGridFeed = (exportMode === 'manual' && exportDpIds.length > 0) ? sumValuesForDpIds(exportDpIds) : (currentGen - currentUse);
                    if (!isGraphReady) setIsGraphReady(true);
                } else if (isGraphReady) { /* Was ready, but now no data */ } 
                else { return; } 
            }
            
            // const netPower = currentGen - currentUse; // Net Power logic commented out
            const isSelfSufficient = currentGridFeed >= 0; // Self-sufficient if not importing (gridFeed is 0 or positive/exporting)

            const newPt: ChartDataPoint = {
                timestamp: nowMs,
                generation: parseFloat(currentGen.toFixed(valuePrecision)),
                usage: parseFloat(currentUse.toFixed(valuePrecision)),
                gridFeed: parseFloat(currentGridFeed.toFixed(valuePrecision)),
                // net: parseFloat(netPower.toFixed(valuePrecision)), // Net Power removed from data point
                isSelfSufficient: isSelfSufficient,
            };

            setChartData(prev => {
                const cutoff = nowMs - durationMs;
                const maxPts = Math.max(pointsToDisplay + Math.floor(pointsToDisplay * 0.25), 120);
                let updated = prev.filter(d => d.timestamp >= cutoff);
                updated.push(newPt);
                return updated.length > maxPts ? updated.slice(-maxPts) : updated;
            });
        };

        if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        if (useDemoData || (dpsConfigured && Object.keys(nodeValues).length > 0)) updateData();
        
        liveUpdateTimer.current = setInterval(updateData, useDemoData ? 2000 : liveUpdateIntervalMs);
        return () => { if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current); };
    }, [
        nodeValues, generationDpIds, usageDpIds, exportDpIds, exportMode, timeScale, 
        isLive, allPossibleDataPoints, sumValuesForDpIds, isGraphReady, valuePrecision, useDemoData, generateDemoValues
    ]);

    const currentValues = useMemo(() => { // Includes gridFeed, isSelfSufficient, excludes net
        let liveGen = 0, liveUse = 0, liveGridFeed = 0;
        if (useDemoData) { // Use a fresh demo value for currentValues if demo mode
             const demo = generateDemoValues();
             liveGen = demo.generation; liveUse = demo.usage; liveGridFeed = demo.gridFeed;
        } else {
            liveGen = sumValuesForDpIds(generationDpIds); liveUse = sumValuesForDpIds(usageDpIds);
            liveGridFeed = (exportMode === 'manual' && exportDpIds.length > 0) ? sumValuesForDpIds(exportDpIds) : (liveGen - liveUse);
        }
        return { 
            generation: parseFloat(liveGen.toFixed(valuePrecision)), 
            usage: parseFloat(liveUse.toFixed(valuePrecision)),
            gridFeed: parseFloat(liveGridFeed.toFixed(valuePrecision)), 
            // net: parseFloat((liveGen - liveUse).toFixed(valuePrecision)), // Net power removed
            timestamp: (isGraphReady || useDemoData) && chartData.length > 0 ? chartData[chartData.length-1].timestamp : Date.now(),
            isSelfSufficient: liveGridFeed >= 0,
        };
    }, [nodeValues, sumValuesForDpIds, generationDpIds, usageDpIds, exportDpIds, exportMode, chartData, isGraphReady, valuePrecision, useDemoData, generateDemoValues]);

    // const netPowerLineColor = useMemo(() => // Net Power commented out
    //     currentValues.isSelfSufficient ? getResolvedColor('net', resolvedTheme) : getResolvedColor('destructive', resolvedTheme)
    // , [currentValues.isSelfSufficient, resolvedTheme]);

    const chartBackgroundFill = useMemo(() => 
        currentValues.isSelfSufficient ? getResolvedColor('backgroundSuccess', resolvedTheme) : getResolvedColor('backgroundDestructive', resolvedTheme)
    , [currentValues.isSelfSufficient, resolvedTheme]);


    const formatXAxisTick = useCallback((ts: number) => { /* ... same ... */ 
        const date = new Date(ts); switch(timeScale){
            case '1d':const h=date.getHours();return(h%3===0||h===0)?date.toLocaleTimeString([],{hour12:false,hour:'numeric'}):'';
            case '6h':case '1h':return date.toLocaleTimeString([],{hour12:false,hour:'numeric',minute:'2-digit'});
            default:return date.toLocaleTimeString([],{minute:'2-digit',second:'2-digit'});
        }
    }, [timeScale]);
    const xAxisDomain = useMemo(():[number|'dataMin',number|'dataMax'] => { /* ... same ... */
        const {durationMs}=timeScaleConfig[timeScale];const now=Date.now();
        if(!isGraphReady||chartData.length<2)return[now-durationMs,now];
        const lastTs=chartData[chartData.length-1].timestamp;const end=isLive||useDemoData?now:lastTs;
        return[end-durationMs,end];
    },[timeScale,chartData,isLive,useDemoData,isGraphReady]);
    
    const yAxisDomain = useMemo(():[number,number] => { /* Includes gridFeed, excludes net */
        let vals = (!isGraphReady || chartData.length === 0) 
            ? [currentValues.generation, currentValues.usage, currentValues.gridFeed] 
            : chartData.flatMap(d => [d.generation, d.usage, d.gridFeed]); // Removed d.net
        const finiteVals = vals.filter(v => typeof v === 'number' && isFinite(v));
        const defMinY = CHART_TARGET_UNIT === 'kW' ? -10 : -10000; const defMaxY = CHART_TARGET_UNIT === 'kW' ? 50 : 50000;
        if(finiteVals.length === 0) return [defMinY, defMaxY];
        let minV = Math.min(...finiteVals, 0), maxV = Math.max(...finiteVals, 0);
        if (minV === 0 && maxV === 0 && finiteVals.every(v => v === 0)) return [defMinY / 10, defMaxY / 10];
        const range = Math.abs(maxV - minV); const minPadV = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 500 : 0.1);
        let pad = range * 0.20; pad = (range === 0) ? Math.max(Math.abs(maxV * 0.25), minPadV) : Math.max(pad, minPadV);
        return [Math.min(Math.floor(minV - pad), 0), Math.max(Math.ceil(maxV + pad), 0)];
    },[chartData,currentValues,isGraphReady]);


    if (!useDemoData && (generationDpIds.length === 0 || usageDpIds.length === 0)) {
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4 text-center">Please configure Generation and Usage data points.</div>;
    }
    if (!isGraphReady && (isLive || useDemoData) ) { 
        return <div className="flex flex-col items-center justify-center h-[340px] text-muted-foreground p-4 space-y-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span>Waiting for initial data...</span></div>;
    }
    
    return (
        <motion.div 
            className={cn(
                "space-y-2 p-3 rounded-xl shadow-lg border-2 transition-colors duration-700 ease-in-out", // Changed to rounded-xl
                currentValues.isSelfSufficient 
                    ? "border-green-400/60 dark:border-green-500/70" 
                    : "border-red-400/60 dark:border-red-500/70"
            )}
            style={{ backgroundColor: chartBackgroundFill }}
            animate={{ backgroundColor: chartBackgroundFill }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        > 
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs sm:text-sm mb-2 px-1">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 items-stretch"> {/* Use items-stretch for equal height Gefühl */}
                    {(['generation', 'usage', 'gridFeed'] as const).map(key => { // Removed 'net'
                        const IconComponent = chartConfig[key].icon;
                        const value = currentValues[key as keyof Omit<typeof currentValues, 'net' | 'timestamp' | 'isSelfSufficient'>]; // Assure value is number
                        let itemColor = getResolvedColor(key, resolvedTheme);
                        let IconToUse = IconComponent;

                        if (key === 'gridFeed') {
                            const gridValue = typeof value === 'number' ? value : 0;
                            if (gridValue === 0) itemColor = getResolvedColor('net', resolvedTheme); 
                            else itemColor = gridValue > 0 ? getResolvedColor('success', resolvedTheme) : getResolvedColor('destructive', resolvedTheme);
                            IconToUse = gridValue === 0 ? PlugZap : (gridValue > 0 ? ArrowRightToLine : ArrowLeftFromLine);
                        }
                        
                        return (
                            <motion.div 
                                key={key} 
                                className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-lg bg-background/50 dark:bg-black/20 shadow"
                                whileHover={{ scale: 1.03 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                                <IconToUse className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{color: itemColor}} />
                                <div className="flex flex-col">
                                    <span className="text-xs sm:text-sm text-muted-foreground leading-tight">
                                        {key === 'gridFeed' ? (typeof value === 'number' && value > 0 ? "Grid Export" : (typeof value === 'number' && value < 0 ? "Grid Import" : "Grid Balanced")) : chartConfig[key].label}
                                    </span>
                                    <span className="font-bold text-sm sm:text-base leading-tight" style={{color: itemColor}}>
                                        <AnimatedNumber value={typeof value === 'number' ? Math.abs(value) : 0} precision={valuePrecision} /> {displayUnitLabel}
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })}
                     <motion.div 
                        key={currentValues.isSelfSufficient ? 'green-status' : 'red-status'}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay:0.1, ease: "easeOut" }}
                        className={cn(
                            "flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs sm:text-sm col-span-2 sm:col-span-1 md:col-auto shadow",
                            currentValues.isSelfSufficient 
                                ? 'bg-green-500/20 text-green-700 dark:bg-green-500/25 dark:text-green-300' 
                                : 'bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-300'
                        )}
                    >
                        {currentValues.isSelfSufficient ? <Leaf className="h-4 w-4 sm:h-5 sm:w-5"/> : <AlertTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5"/>}
                        <span className="leading-tight">{currentValues.isSelfSufficient ? "Self-Sufficient" : "Grid Dependent"}</span>
                    </motion.div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1 sm:mt-0">
                    {isLive && !useDemoData && (
                         <div className="flex items-center mr-2 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-800/70 text-green-700 dark:text-green-300 text-[0.7rem] font-medium">
                             <span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>LIVE
                         </div>
                    )}
                     {useDemoData && (
                        <div className="flex items-center mr-2 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800/70 text-blue-700 dark:text-blue-300 text-[0.7rem] font-medium">
                            DEMO
                        </div>
                    )}
                   <span>Updated: {lastUpdatedDisplayTime}</span>
                </div>
            </div>
            <AnimatePresence mode="wait"> 
                <motion.div key={animationKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-[260px] sm:h-[280px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <LineChart accessibilityLayer data={chartData} margin={{ top: 5, right: 12, left: -15, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="2 2" stroke={resolvedTheme === 'dark' ? "hsl(var(--border)/0.4)" : "hsl(var(--border)/0.7)"} />
                            <XAxis dataKey="timestamp" type="number" domain={xAxisDomain} scale="time" tickFormatter={formatXAxisTick} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} stroke="hsl(var(--muted-foreground))"/>
                            <YAxis yAxisId="left" domain={yAxisDomain} orientation="left" width={60} tickFormatter={(v) => v.toFixed(0)} tickLine={false} axisLine={false} tickMargin={5} stroke="hsl(var(--muted-foreground))"/>
                            
                            <ChartTooltip cursor={{stroke: "hsl(var(--foreground)/0.3)", strokeDasharray: '3 3'}} content={ <ChartTooltipContent hideLabel labelFormatter={(l,p) => p?.[0]?.payload?.timestamp ? new Date(p[0].payload.timestamp).toLocaleString([],{dateStyle:'short',timeStyle:'medium'}) : ""} formatter={(v,n,item)=>{const dk=item.dataKey as keyof ChartDataPoint; let lbl=chartConfig[dk as keyof Omit<typeof chartConfig,'net'|'gridFeed'>]?.label || n; if(dk==='gridFeed')lbl=item.payload.gridFeed>=0? "Grid Export":"Grid Import"; return (<div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: item.color}}/><div className="flex flex-1 justify-between leading-none"><span className="text-muted-foreground">{lbl}</span><span className="font-bold">{(v as number).toFixed(valuePrecision)} {displayUnitLabel}</span></div></div>);}} itemSorter={(i)=>{const o={generation:1,usage:2,gridFeed:3};return o[i.dataKey as keyof typeof o]??4;}}/> } />
                            <ChartLegend content={<ChartLegendContent className="mt-1 -mb-1" />} />
                            {/* Net Power Line Commented Out */}
                            {/* <Line yAxisId="left" dataKey="net" type="monotone" name={chartConfig.net.label} stroke={netPowerLineColor} strokeWidth={3} dot={false} activeDot={{r:6,strokeWidth:2,stroke:netPowerLineColor}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} /> */}
                            <Line yAxisId="left" dataKey="generation" type="monotone" stroke={getResolvedColor("generation", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} />
                            <Line yAxisId="left" dataKey="usage" type="monotone" stroke={getResolvedColor("usage", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} />
                            <Line yAxisId="left" dataKey="gridFeed" name={chartConfig.gridFeed.label} type="monotone" stroke={currentValues.gridFeed >=0 ? getResolvedColor("gridFeed", resolvedTheme) : getResolvedColor("destructive", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} />
                        </LineChart>
                    </ChartContainer>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default PowerTimelineGraph;