// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces'; // Adjust if path is different
import { DataPoint } from '@/config/dataPoints'; // Adjust if path is different
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
    // net:      { label: "Net Power",icon: TrendingUp, color: "hsl(var(--chart-4))" }, // Kept commented out
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
    // Fallbacks if CSS vars are not found (should ideally not happen with Tailwind setup)
    const directFallbacks: Record<string,string> = { 
        generation: "skyblue", 
        usage: "orange", 
        gridFeed: "mediumpurple", 
        net: "mediumseagreen", // Even if commented out in config, keep a fallback
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
    timeScale: TimeScale;
    isLive?: boolean;
    useDemoData?: boolean; 
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
    if (typeof u !== 'string' || !u.trim()) return v; // Assume watts if no unit or empty string
    const unitClean = u.trim().toUpperCase() as PowerUnit | string;
    const factor = unitToFactorMap[unitClean as PowerUnit];
    return factor !== undefined ? v * factor : v; // Return original value if unit is unknown
};
const convertFromWatts = (v: number, targetUnit: PowerUnit): number => {
    return v / (unitToFactorMap[targetUnit] || 1);
}; 


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

    // Store previous usage value to smooth changes
    const prevDemoUsageRef = useRef<number | null>(null);

    const generateDemoValues = useCallback(() => {
        const now = new Date();
        const totalMinutesInDay = now.getHours() * 60 + now.getMinutes();
    
        // --- Solar Generation Simulation (from previous update) ---
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
    
        // --- Smoothed Usage Simulation ---
        const baseUsageW_target = 600 + (Math.sin(totalMinutesInDay / (120) * Math.PI * 2) * 200); // Base oscillates slowly +/- 200W around 600W over 2 hours
        
        const morningPeakTime = 7.5 * 60; const eveningPeakTime = 18.5 * 60; const usageSpread = 1.2 * 60; // Slightly narrower peak
        const morningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - morningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        const eveningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - eveningPeakTime, 2) / (2 * Math.pow(usageSpread, 2)));
        
        // Peak increase also has a slow oscillation to vary intensity
        const peakUsageIncreaseW_target = 2000 + (Math.sin(totalMinutesInDay / (240) * Math.PI * 2 + Math.PI/2) * 1000); // Peak increase varies +/- 1kW around 2kW over 4 hours
        
        let targetDemoUsageW = baseUsageW_target + 
                                (morningUsageFactor * peakUsageIncreaseW_target) + 
                                (eveningUsageFactor * peakUsageIncreaseW_target * 1.1); // Evening slightly higher

        // Add a very slow, small "appliance cycle" variation
        targetDemoUsageW += (Math.sin(totalMinutesInDay / 30 * Math.PI * 2) * 150); // +/- 150W over 30 mins
        targetDemoUsageW = Math.max(200, targetDemoUsageW); // Minimum 200W usage

        let currentDemoUsageW: number;
        const smoothingFactor = 0.1; // Adjust for more or less smoothing (0.01 = very slow, 0.5 = faster)

        if (prevDemoUsageRef.current === null) {
            currentDemoUsageW = targetDemoUsageW; // Initialize
        } else {
            // Smooth towards the target: current = prev + factor * (target - prev)
            currentDemoUsageW = prevDemoUsageRef.current + smoothingFactor * (targetDemoUsageW - prevDemoUsageRef.current);
        }
        prevDemoUsageRef.current = currentDemoUsageW; // Store for next iteration

    
        // --- Grid Feed Simulation (remains same) ---
        let demoGridFeedW = 0;
        const netLocalW = demoGenerationW - currentDemoUsageW; // Use smoothed usage

        if (exportMode === 'auto') {
            demoGridFeedW = netLocalW; 
        } else { 
            if (netLocalW < -500) { 
                demoGridFeedW = netLocalW * (0.7 + (Math.sin(totalMinutesInDay / 15 * Math.PI) + 1) / 2 * 0.3); // Smoother random component
            } else if (netLocalW > 500) { 
                demoGridFeedW = netLocalW * (0.5 + (Math.sin(totalMinutesInDay / 20 * Math.PI + 0.5) + 1) / 2 * 0.5); // Smoother random component
            } else { 
                demoGridFeedW = (Math.sin(totalMinutesInDay / 10 * Math.PI) * 500); // Smoother small random feed
            }
        }
    
        return {
            generation: convertFromWatts(demoGenerationW, CHART_TARGET_UNIT),
            usage: convertFromWatts(currentDemoUsageW, CHART_TARGET_UNIT),
            gridFeed: convertFromWatts(demoGridFeedW, CHART_TARGET_UNIT),
        };
    }, [exportMode]); // prevDemoUsageRef is managed internally


    const sumValuesForDpIds = useCallback((dpIdsToSum: string[]): number => {
        if (useDemoData) return 0; // Demo data is handled by generateDemoValues for current sums
        if (!allPossibleDataPoints?.length || !Object.keys(nodeValues).length) return 0;
        let sumInWatts = 0;
        dpIdsToSum.forEach(dpId => {
            const dp = allPossibleDataPoints.find(p => p.id === dpId);
            if (dp) {
                const rawValueFromNode = nodeValues[dp.nodeId]; // Could be { value: X, unit: Y } or just X
                let numericValue = 0;
                let unitForConversion = dp.unit; // Use unit from DataPoint config by default

                // Handle complex nodeValues structure if necessary
                if (typeof rawValueFromNode === 'object' && rawValueFromNode !== null) {
                    if ('value' in rawValueFromNode) {
                        const typedValue = rawValueFromNode as { value: unknown, unit?: string };
                        numericValue = Number(typedValue.value) || 0;
                        if ('unit' in rawValueFromNode && typeof typedValue.unit === 'string') {
                            unitForConversion = typedValue.unit; // Prefer unit from node data if available
                        }
                    }
                } else if (typeof rawValueFromNode === 'number') {
                    numericValue = rawValueFromNode;
                }
                
                const factor = dp.factor || 1;
                const valueOfInterest = (isFinite(numericValue) ? numericValue * factor : 0);
                sumInWatts += convertToWatts(valueOfInterest, unitForConversion);
            }
        });
        return convertFromWatts(sumInWatts, CHART_TARGET_UNIT);
    }, [nodeValues, allPossibleDataPoints, useDemoData]);
    
    useEffect(() => {
        setChartData([]); setAnimationKey(Date.now()); setIsGraphReady(false);
        setLastUpdatedDisplayTime('N/A');
        prevDemoUsageRef.current = null; // Reset smoothed usage when config changes
    }, [timeScale, generationDpIds, usageDpIds, exportDpIds, exportMode, useDemoData]);

    useEffect(() => { 
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
            
            const isSelfSufficient = currentGridFeed >= 0; 

            const newPt: ChartDataPoint = {
                timestamp: nowMs,
                generation: parseFloat(currentGen.toFixed(valuePrecision)),
                usage: parseFloat(currentUse.toFixed(valuePrecision)),
                gridFeed: parseFloat(currentGridFeed.toFixed(valuePrecision)),
                isSelfSufficient: isSelfSufficient,
            };

            setChartData(prev => {
                const cutoff = nowMs - durationMs;
                const maxPts = Math.max(pointsToDisplay + Math.floor(pointsToDisplay * 0.25), 120); // Keep reasonable # of pts
                let updated = prev.filter(d => d.timestamp >= cutoff);
                updated.push(newPt);
                return updated.length > maxPts ? updated.slice(-maxPts) : updated;
            });
        };

        if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        // Initial call to populate data immediately if conditions met
        if (useDemoData || (dpsConfigured && (isLive && Object.keys(nodeValues).length > 0))) {
           updateData();
        } else if (!isLive && dpsConfigured && Object.keys(nodeValues).length > 0) {
           // For non-live, historic data could be pre-populated here if available
           // For now, assumes non-live relies on existing chartData from elsewhere or stays empty if not pre-populated
           setIsGraphReady(true); 
        }
        
        if (isLive || useDemoData) {
          liveUpdateTimer.current = setInterval(updateData, useDemoData ? 2000 : liveUpdateIntervalMs); // Demo data updates every 2s
        }
        return () => { if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current); };
    }, [
        nodeValues, generationDpIds, usageDpIds, exportDpIds, exportMode, timeScale, 
        isLive, allPossibleDataPoints, sumValuesForDpIds, isGraphReady, valuePrecision, useDemoData, generateDemoValues
    ]);

    const currentValues = useMemo(() => {
        let liveGen = 0, liveUse = 0, liveGridFeed = 0;
        if (useDemoData) { 
             const demo = generateDemoValues(); // Fresh demo values for display header
             liveGen = demo.generation; liveUse = demo.usage; liveGridFeed = demo.gridFeed;
        } else {
            liveGen = sumValuesForDpIds(generationDpIds); 
            liveUse = sumValuesForDpIds(usageDpIds);
            // For gridFeed, ensure calculation consistency with how chart data points are made
            if (exportMode === 'manual' && exportDpIds.length > 0) {
                 liveGridFeed = sumValuesForDpIds(exportDpIds);
            } else { // 'auto' mode or manual with no export DPs
                 liveGridFeed = liveGen - liveUse;
            }
        }
        return { 
            generation: parseFloat(liveGen.toFixed(valuePrecision)), 
            usage: parseFloat(liveUse.toFixed(valuePrecision)),
            gridFeed: parseFloat(liveGridFeed.toFixed(valuePrecision)), 
            timestamp: (isGraphReady || useDemoData) && chartData.length > 0 ? chartData[chartData.length-1].timestamp : Date.now(),
            isSelfSufficient: liveGridFeed >= 0,
        };
    }, [sumValuesForDpIds, generationDpIds, usageDpIds, exportDpIds, exportMode, chartData, isGraphReady, valuePrecision, useDemoData, generateDemoValues]);

    const chartBackgroundFill = useMemo(() => 
        currentValues.isSelfSufficient ? getResolvedColor('backgroundSuccess', resolvedTheme) : getResolvedColor('backgroundDestructive', resolvedTheme)
    , [currentValues.isSelfSufficient, resolvedTheme]);


    const formatXAxisTick = useCallback((ts: number) => {
        const date = new Date(ts); 
        switch(timeScale){
            case '1d': case '7d': case '1mo':
              const h = date.getHours();
              return (h % 6 === 0 || h === 0) ? date.toLocaleTimeString([],{hour12:false, hour:'numeric'}) : '';
            case '12h': case '6h':
              return date.toLocaleTimeString([],{hour12:false,hour:'numeric',minute:'2-digit'});
            case '1h':  case '30m':
              return date.toLocaleTimeString([],{hour12:false,hour:'numeric',minute:'2-digit'});
            default: // 30s, 1m, 5m
              return date.toLocaleTimeString([],{minute:'2-digit',second:'2-digit'});
        }
    }, [timeScale]);

    const xAxisDomain = useMemo(():[number|'dataMin',number|'dataMax'] => {
        const {durationMs}=timeScaleConfig[timeScale];const now=Date.now();
        if(!isGraphReady || chartData.length < 2) return [now-durationMs,now];
        // For live or demo, X-axis always ends at 'now'
        // For historical, it could end at last data point if `isLive` is false.
        // Current logic uses 'now' if live/demo, or last data point if static and data exists
        const endAnchor = (isLive || useDemoData) ? now : (chartData.length > 0 ? chartData[chartData.length-1].timestamp : now);
        return [endAnchor-durationMs,endAnchor];
    },[timeScale,chartData,isLive,useDemoData,isGraphReady]);
    
    const yAxisDomain = useMemo(():[number,number] => {
        let vals = (!isGraphReady || chartData.length === 0) 
            ? [currentValues.generation, currentValues.usage, currentValues.gridFeed] 
            : chartData.flatMap(d => [d.generation, d.usage, d.gridFeed]);
        
        const finiteVals = vals.filter(v => typeof v === 'number' && isFinite(v));
        
        const defMinY = CHART_TARGET_UNIT === 'kW' ? -10 : -10000; 
        const defMaxY = CHART_TARGET_UNIT === 'kW' ? 50 : 50000;

        if(finiteVals.length === 0) return [defMinY, defMaxY];
        
        let minV = Math.min(...finiteVals);
        let maxV = Math.max(...finiteVals);

        if (minV === maxV) {
            const singleValueMinPad = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 100 : 0.1);
            if (minV === 0) {
                return [ 
                    (CHART_TARGET_UNIT === 'kW' ? -1 : (CHART_TARGET_UNIT === 'W' ? -500 : -0.5)), 
                    (CHART_TARGET_UNIT === 'kW' ? 5  : (CHART_TARGET_UNIT === 'W' ? 2500 : 2.5)) 
                ];
            }
            const paddingAmount = Math.max(Math.abs(minV * 0.5), singleValueMinPad); 
            return [ Math.floor(minV - paddingAmount), Math.ceil(maxV + paddingAmount) ];
        }

        const range = maxV - minV; 
        const rangeMinPad = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 500 : 0.1);
        let pad = Math.max(range * 0.20, rangeMinPad); 
        return [Math.floor(minV - pad), Math.ceil(maxV + pad)];
    },[chartData, currentValues, isGraphReady]);


    if (!useDemoData && (generationDpIds.length === 0 || usageDpIds.length === 0)) {
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4 text-center">Please configure Generation and Usage data points.</div>;
    }
    if (!isGraphReady && (isLive || useDemoData) ) { 
        return <div className="flex flex-col items-center justify-center h-[340px] text-muted-foreground p-4 space-y-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span>Waiting for initial data...</span></div>;
    }
    
    return (
        <motion.div 
            className={cn(
                "space-y-2 p-3 rounded-xl shadow-lg border-2 transition-colors duration-700 ease-in-out", 
                currentValues.isSelfSufficient 
                    ? "border-green-400/60 dark:border-green-500/70" 
                    : "border-red-400/60 dark:border-red-500/70"
            )}
            style={{ backgroundColor: chartBackgroundFill }} // Framer Motion will animate this
            animate={{ backgroundColor: chartBackgroundFill }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        > 
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs sm:text-sm mb-2 px-1">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 items-stretch">
                    {(['generation', 'usage', 'gridFeed'] as const).map(key => {
                        const config = chartConfig[key as keyof typeof chartConfig]; // gridFeed is in chartConfig
                        const value = currentValues[key as keyof Omit<typeof currentValues, 'timestamp' | 'isSelfSufficient'>]; 
                        let itemColor: string;
                        let IconToUse: React.ElementType;
                        let labelText: string;

                        if (key === 'gridFeed') {
                            const gridValueNum = typeof value === 'number' ? value : 0;
                            itemColor = gridValueNum === 0 ? getResolvedColor('net', resolvedTheme) : // 'net' is effectively 'balanced' color
                                        (gridValueNum > 0 ? getResolvedColor('success', resolvedTheme) : getResolvedColor('destructive', resolvedTheme));
                            IconToUse = gridValueNum === 0 ? PlugZap : (gridValueNum > 0 ? ArrowRightToLine : ArrowLeftFromLine);
                            labelText = gridValueNum === 0 ? "Grid Balanced" : (gridValueNum > 0 ? "Grid Export" : "Grid Import");
                        } else {
                            itemColor = getResolvedColor(key, resolvedTheme);
                            IconToUse = config.icon;
                            labelText = config.label;
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
                                        {labelText}
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
                            
                            <ChartTooltip 
                                cursor={{stroke: "hsl(var(--foreground)/0.3)", strokeDasharray: '3 3'}} 
                                content={ 
                                    <ChartTooltipContent 
                                        hideLabel 
                                        labelFormatter={(label,payload) => payload?.[0]?.payload?.timestamp ? new Date(payload[0].payload.timestamp).toLocaleString([],{dateStyle:'short',timeStyle:'medium'}) : ""}
                                        formatter={(value, name, item) => {
                                            const dataKey = item.dataKey as keyof ChartDataPoint;
                                            let label = chartConfig[dataKey as keyof Omit<typeof chartConfig, 'net'>]?.label || name; // Allow net to be missing here
                                            
                                            if (dataKey === 'gridFeed' && item.payload) {
                                                label = item.payload.gridFeed >= 0 ? "Grid Export" : "Grid Import";
                                                // value might be negative, tooltip displays magnitude. Display raw value for clarity here
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: item.color}}/>
                                                        <div className="flex flex-1 justify-between leading-none">
                                                            <span className="text-muted-foreground">{label}</span>
                                                            <span className="font-bold">{(value as number).toFixed(valuePrecision)} {displayUnitLabel}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: item.color}}/>
                                                    <div className="flex flex-1 justify-between leading-none">
                                                        <span className="text-muted-foreground">{label}</span>
                                                        <span className="font-bold">{(value as number).toFixed(valuePrecision)} {displayUnitLabel}</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                        itemSorter={(item)=>{ const order={generation:1,usage:2,gridFeed:3}; return order[item.dataKey as keyof typeof order] ?? 4; }}
                                    /> 
                                } 
                            />
                            <ChartLegend content={<ChartLegendContent className="mt-1 -mb-1" />} />
                            
                            <Line yAxisId="left" dataKey="generation" type="monotone" stroke={getResolvedColor("generation", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} />
                            <Line yAxisId="left" dataKey="usage" type="monotone" stroke={getResolvedColor("usage", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:5}} isAnimationActive={isGraphReady&&(isLive||useDemoData)} animationDuration={useDemoData?400:200} connectNulls={false} />
                            <Line 
                                yAxisId="left" 
                                dataKey="gridFeed" 
                                name={chartConfig.gridFeed.label} 
                                type="monotone" 
                                // Color of the line itself should reflect its state at the *current moment* (for live),
                                // or for historical data, maybe the color should be fixed, or determined point by point (which Recharts doesn't easily support for a single line)
                                // Let's use the currentValues state to determine the color of the entire line, as a simplification
                                stroke={currentValues.gridFeed >=0 ? getResolvedColor("gridFeed", resolvedTheme) : getResolvedColor("destructive", resolvedTheme)}
                                strokeWidth={2.2} 
                                dot={false} 
                                activeDot={{r:5}} 
                                isAnimationActive={isGraphReady&&(isLive||useDemoData)} 
                                animationDuration={useDemoData?400:200} 
                                connectNulls={false} 
                            />
                        </LineChart>
                    </ChartContainer>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default PowerTimelineGraph;