// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces'; // Assuming this path is correct
import { DataPoint } from '@/config/dataPoints'; // Assuming this path is correct
import { useTheme } from 'next-themes';
// Ensure this path is correct for your project structure:
import { generateDailySolarCurve, generateUsageData, getSimulatedHistoricalData, SimulatedPoint } from '../utils/solarDataGenerator';

const getThemeColor = (colorName: string, resolvedTheme: string | undefined): string => {
    if (typeof window === 'undefined') {
      // Fallback colors for SSR or if CSS variables are not available
      const ssrFallbacks: Record<string, string> = {
        'primary': '#3b82f6',
        'muted-foreground': '#71717a',
        'green-500': '#10B981',
        'red-500': '#EF4444',
        'orange-500': '#F59E0B',
        'popover': '#ffffff',
        'popover-foreground': '#020817',
        'border': '#e2e8f0',
      };
      const darkSsrFallbacks: Record<string, string> = {
        'primary': '#60a5fa',
        'muted-foreground': '#a1a1aa',
        'green-500': '#34D399', // Brighter green for dark
        'red-500': '#F87171',   // Brighter red
        'orange-500': '#FBBF24',// Brighter orange
        'popover': '#0f172a', // Dark slate
        'popover-foreground': '#e2e8f0',
        'border': '#334155',
      };
      return (resolvedTheme === 'dark' ? darkSsrFallbacks[colorName] : ssrFallbacks[colorName]) || colorName;
    }

    const style = getComputedStyle(document.documentElement);
    // Attempt to get direct Tailwind color name if defined (e.g. --green-500 as a variable)
    let twColorValue = style.getPropertyValue(`--${colorName}`).trim();

    if (twColorValue) {
        if (twColorValue.split(" ").length === 3) return `hsl(${twColorValue})`; // HSL from ShadCN theme
        return twColorValue; // Direct color string
    }

    // Fallbacks for common cases if full theme system not in place via CSS vars as assumed
    // These specific colors might not be exactly what you get from Tailwind variables;
    // it's better if Tailwind's CSS variables (like --primary, etc.) are correctly set.
    const colorMapLight: Record<string,string> = {
        'green-500': '#10B981', 'red-500': '#EF4444', 'orange-500': '#F59E0B',
        'primary': '#3b82f6', 'muted-foreground': '#71717a',
        'popover': 'white', 'popover-foreground': 'black', 'border': '#e5e7eb'
    };
    const colorMapDark: Record<string,string> = {
        'green-500': '#34D399', 'red-500': '#F87171', 'orange-500': '#FBBF24',
        'primary': '#60a5fa', 'muted-foreground': '#a1a1aa',
        'popover': '#1f2937', 'popover-foreground': 'white', 'border': '#374151'
    };
    return (resolvedTheme === 'dark' ? colorMapDark[colorName] : colorMapLight[colorName]) || colorName;
};


interface ChartDataPoint {
    timestamp: number;
    generation: number;
    usage: number;
    export: number; // Added export
    net: number;
}

export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';

interface PowerTimelineGraphProps {
    nodeValues: NodeData;
    allPossibleDataPoints: DataPoint[];
    generationDpIds: string[];
    usageDpIds: string[];
    exportDpIds: string[];
    exportMode: 'auto' | 'manual';
    timeScale: TimeScale;
    isLive?: boolean;
}

// Removed SIMULATED_PEAK_SOLAR_KW and SIMULATED_BASE_USAGE_KW
// Simulation logic will use internal defaults or be adapted.

const timeScaleConfig: Record<TimeScale, { 
    durationMs: number; 
    tickIntervalMs: number; 
    pointsToDisplay: number;
    liveUpdateIntervalMs: number;
}> = {
    day:  { durationMs: 24 * 60 * 60 * 1000, tickIntervalMs: 2 * 60 * 60 * 1000, pointsToDisplay: 48,  liveUpdateIntervalMs: 10 * 60 * 1000 },
    '6h': { durationMs: 6 * 60 * 60 * 1000,  tickIntervalMs: 1 * 60 * 60 * 1000, pointsToDisplay: 36,  liveUpdateIntervalMs: 5 * 60 * 1000 },
    '1h': { durationMs: 1 * 60 * 60 * 1000,  tickIntervalMs: 10 * 60 * 1000,     pointsToDisplay: 60,  liveUpdateIntervalMs: 30 * 1000 },
    '30m':{ durationMs: 30 * 60 * 1000,     tickIntervalMs: 5 * 60 * 1000,      pointsToDisplay: 60,  liveUpdateIntervalMs: 15 * 1000 },
    '5m': { durationMs: 5 * 60 * 1000,      tickIntervalMs: 1 * 60 * 1000,      pointsToDisplay: 60,  liveUpdateIntervalMs: 5 * 1000 },
    '1m': { durationMs: 1 * 60 * 1000,      tickIntervalMs: 10 * 1000,          pointsToDisplay: 60,  liveUpdateIntervalMs: 1 * 1000 },
};

const PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues,
    allPossibleDataPoints,
    generationDpIds,
    usageDpIds,
    exportDpIds,
    exportMode,
    timeScale,
    isLive = true,
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const { resolvedTheme } = useTheme();
    const liveUpdateTimer = useRef<NodeJS.Timeout | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [animationKey, setAnimationKey] = useState(0);

    const axisStrokeColor = useMemo(() => getThemeColor('muted-foreground', resolvedTheme), [resolvedTheme]);
    const gridStrokeColor = useMemo(() => resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', [resolvedTheme]);

    useEffect(() => {
        setIsLoadingInitial(true);
        setChartData([]);
        setAnimationKey(prevKey => prevKey + 1);
        const now = new Date();
        // console.log(`[${timeScale}] Loading historical data up to:`, now.toISOString());
        
        // Use internal defaults of getSimulatedHistoricalData as SIMULATED_PEAK_SOLAR_KW etc. are removed
        const simulated = getSimulatedHistoricalData(timeScale, now);

        const mergedData: ChartDataPoint[] = simulated.generation.map(genPoint => {
            const usagePoint = simulated.usage.find(u => u.timestamp === genPoint.timestamp) || { timestamp: genPoint.timestamp, value: generateUsageData(genPoint.timestamp) };
            const generationVal = genPoint.value;
            const usageVal = usagePoint.value;
            const exportVal = Math.max(0, generationVal - usageVal); // Calculate export for simulated data
            return {
                timestamp: genPoint.timestamp,
                generation: generationVal,
                usage: usageVal,
                export: parseFloat(exportVal.toFixed(2)),
                net: parseFloat((generationVal - usageVal).toFixed(2)),
            };
        }).sort((a, b) => a.timestamp - b.timestamp);
        
        // console.log(`[${timeScale}] Historical data points:`, mergedData.length, mergedData.slice(0, 5));
        setChartData(mergedData);
        setIsLoadingInitial(false);

    }, [timeScale]);

    useEffect(() => {
        if (!isLive || isLoadingInitial) {
            if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
            return;
        }
        
        const { durationMs, pointsToDisplay, liveUpdateIntervalMs } = timeScaleConfig[timeScale];

        const updateData = () => {
            const nowMs = Date.now();
            let currentGeneration = 0;
            let currentUsage = 0;
            let currentExport = 0;

            const generationDataPoints = generationDpIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[];
            const usageDataPoints = usageDpIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[];
            const exportDataPoints = exportDpIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[];

            let useLiveNodeValues = false;
            if (generationDataPoints.length > 0 && usageDataPoints.length > 0 && Object.keys(nodeValues).length > 0) {
                 const hasGenNodeValue = generationDataPoints.some(dp => typeof nodeValues[dp.nodeId] === 'number');
                 const hasUsageNodeValue = usageDataPoints.some(dp => typeof nodeValues[dp.nodeId] === 'number');
                 if (hasGenNodeValue && hasUsageNodeValue) {
                    useLiveNodeValues = true;
                 }
            }
            
            if (useLiveNodeValues) {
                currentGeneration = generationDataPoints.reduce((sum, dp) => {
                    const value = nodeValues[dp.nodeId];
                    return sum + (typeof value === 'number' && isFinite(value) ? value * (dp.factor || 1) : 0);
                }, 0);

                currentUsage = usageDataPoints.reduce((sum, dp) => {
                    const value = nodeValues[dp.nodeId];
                    // Usage is typically positive, ensure factor is applied correctly if it implies direction
                    return sum + (typeof value === 'number' && isFinite(value) ? Math.abs(value * (dp.factor || 1)) : 0);
                }, 0);

                if (exportMode === 'manual') {
                    currentExport = exportDataPoints.reduce((sum, dp) => {
                        const value = nodeValues[dp.nodeId];
                        return sum + (typeof value === 'number' && isFinite(value) ? value * (dp.factor || 1) : 0);
                    }, 0);
                } else { // auto
                    currentExport = Math.max(0, currentGeneration - currentUsage);
                }
                // console.log(`[${timeScale}] Live node values update: Gen=${currentGeneration}, Usage=${currentUsage}, Export=${currentExport}`);
            } else {
                // Fallback to simulation if not live or nodeValues incomplete
                const simulatedNow = getSimulatedHistoricalData('1m', new Date(nowMs)); // Use 1m for a single point
                currentGeneration = simulatedNow.generation.length > 0 ? simulatedNow.generation[0].value : 0;
                currentUsage = simulatedNow.usage.length > 0 ? simulatedNow.usage[0].value : 0;
                currentExport = Math.max(0, currentGeneration - currentUsage); // Auto for simulated
                // console.log(`[${timeScale}] Simulated live update: Gen=${currentGeneration}, Usage=${currentUsage}, Export=${currentExport}`);
            }
            
            setChartData(prevData => {
                const newDataPoint: ChartDataPoint = {
                    timestamp: nowMs,
                    generation: parseFloat(currentGeneration.toFixed(2)),
                    usage: parseFloat(currentUsage.toFixed(2)),
                    export: parseFloat(currentExport.toFixed(2)),
                    net: parseFloat((currentGeneration - currentUsage).toFixed(2)),
                };

                const cutoffTime = nowMs - durationMs;
                let updatedData = prevData.filter(d => d.timestamp >= cutoffTime);
                updatedData.push(newDataPoint);
                updatedData.sort((a, b) => a.timestamp - b.timestamp);
                
                if (updatedData.length > pointsToDisplay * 2 && updatedData.length > 30) {
                    updatedData = updatedData.slice(-Math.floor(pointsToDisplay * 1.5));
                }
                return updatedData;
            });
        };
        
        if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        liveUpdateTimer.current = setInterval(updateData, liveUpdateIntervalMs);

        return () => {
            if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        };
    }, [
        nodeValues, 
        generationDpIds, 
        usageDpIds, 
        exportDpIds, 
        exportMode, 
        timeScale, 
        isLive, 
        isLoadingInitial, 
        allPossibleDataPoints
    ]);


    const currentValues = useMemo(() => {
        if (chartData.length === 0) return { generation: 0, usage: 0, export: 0, net: 0, timestamp: Date.now() };
        return chartData[chartData.length - 1];
    }, [chartData]);

    const netPowerColor = useMemo(() => {
        if (chartData.length === 0) return getThemeColor('muted-foreground', resolvedTheme);
        return currentValues.net >= 0 ? getThemeColor('green-500', resolvedTheme) : getThemeColor('red-500', resolvedTheme);
    }, [chartData, currentValues, resolvedTheme]);
    
    const generationColor = useMemo(() => getThemeColor('sky-500', resolvedTheme), [resolvedTheme]); // Changed from green
    const usageColor = useMemo(() => getThemeColor('orange-500', resolvedTheme), [resolvedTheme]);
    const exportColor = useMemo(() => getThemeColor('purple-500', resolvedTheme), [resolvedTheme]); // New export color

    const formatTick = useCallback((timestamp: number) => {
        const date = new Date(timestamp);
        switch (timeScale) {
            case 'day':
                const hours = date.getHours();
                if (hours % 3 === 0) { 
                     return date.toLocaleTimeString([], { hour: 'numeric', hour12: false }); // Simpler format
                }
                return '';
            case '6h':
            case '1h':
                return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
            case '30m':
            case '5m':
            case '1m':
            default:
                return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
        }
    }, [timeScale]);

    const xAxisDomain = useMemo((): [number | 'dataMin' | 'auto', number | 'dataMax' | 'auto'] => {
        const { durationMs } = timeScaleConfig[timeScale];
        if (chartData.length < 2 || timeScale === 'day') {
            return ['dataMin', 'dataMax'];
        }
        const lastTimestamp = chartData[chartData.length - 1].timestamp;
        return [lastTimestamp - durationMs, lastTimestamp];
    }, [timeScale, chartData]);

    const yAxisDomain = useMemo((): [number | 'auto', number | 'auto'] => {
        if (chartData.length === 0) return [-10, 50]; // Default if no data

        let minVal = 0;
        let maxVal = 0;
        
        chartData.forEach(d => {
            const gen = isFinite(d.generation) ? d.generation : 0;
            const usg = isFinite(d.usage) ? d.usage : 0;
            const exp = isFinite(d.export) ? d.export : 0;
            const nt = isFinite(d.net) ? d.net : 0;

            minVal = Math.min(minVal, nt); // Net can be negative
            maxVal = Math.max(maxVal, gen, usg, exp, nt);
        });

        if (minVal === 0 && maxVal === 0 && chartData.every(d => d.net === 0 && d.generation === 0 && d.usage === 0 && d.export === 0)) {
            return [-10, 10]; // All zeros
        }
        
        const padding = Math.max(Math.abs(maxVal - minVal) * 0.15, 15);
        const finalMin = Math.floor(minVal - padding);
        const finalMax = Math.ceil(maxVal + padding);

        return [finalMin, finalMax];
    }, [chartData]);

    // Removed verbose debugging logs for brevity in this diff

    if (isLoadingInitial && chartData.length === 0) {
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4">Loading graph data...</div>;
    }
    if (generationDpIds.length === 0 || usageDpIds.length === 0) {
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4 text-center">Please configure Generation and Usage data points for the graph using the settings icon.</div>;
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div className="font-medium">
                    Generation: <span style={{color: generationColor}}>{currentValues.generation.toFixed(2)} kW</span>
                </div>
                <div className="font-medium">
                    Usage: <span style={{color: usageColor}}>{currentValues.usage.toFixed(2)} kW</span>
                </div>
                <div className="font-medium">
                    Export: <span style={{color: exportColor}}>{currentValues.export.toFixed(2)} kW</span>
                </div>
                <div className="font-medium">
                    Net Power: <span style={{ color: netPowerColor }}>{currentValues.net.toFixed(2)} kW</span> {/* Net is Gen - Usage */}
                </div>
            </div>
            <AnimatePresence mode="wait"> 
                <motion.div
                    key={animationKey} // Changed from timeScale to animationKey
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.3 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-[300px]"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 0, bottom: 5 }} // Adjusted margins
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={xAxisDomain}
                                scale="time"
                                tickFormatter={formatTick}
                                stroke={axisStrokeColor}
                                tick={{ fontSize: 10 }}
                                interval="preserveStartEnd"
                                // Consider adding specific ticks for 'day' view if general formatting isn't enough
                                // ticks={timeScale === 'day' ? yourPredefinedDayTicksArray : undefined}
                            />
                            <YAxis
                                yAxisId="left"
                                domain={yAxisDomain}
                                stroke={axisStrokeColor}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `${value.toFixed(0)}`}
                                // DEBUG: Set to true to see if domain is the issue
                                allowDataOverflow={true} 
                                width={40} // Increased width
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: getThemeColor('popover', resolvedTheme),
                                    borderColor: getThemeColor('border', resolvedTheme),
                                    color: getThemeColor('popover-foreground', resolvedTheme),
                                    borderRadius: '0.375rem',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                                }}
                                labelFormatter={(label) => new Date(label as number).toLocaleString([], { dateStyle:'short', timeStyle: 'medium' })}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)} kW`, name]}
                            />
                            <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
                            <Line
                                yAxisId="left" type="monotone" dataKey="net" name="Net Power"
                                stroke={netPowerColor} strokeWidth={2.5} dot={false}
                                isAnimationActive={true} animationDuration={300} connectNulls={false} 
                                // hide={!chartData.some(d => d.net !== 0)}
                            />
                            <Line
                                yAxisId="left" type="monotone" dataKey="generation" name="Generation"
                                stroke={generationColor} strokeWidth={1.5} dot={false}
                                isAnimationActive={true} animationDuration={300} connectNulls={false}
                            />
                            <Line
                                yAxisId="left" type="monotone" dataKey="usage" name="Usage"
                                stroke={usageColor} strokeWidth={1.5} dot={false}
                                isAnimationActive={true} animationDuration={300} connectNulls={false}
                            />
                            <Line
                                yAxisId="left" type="monotone" dataKey="export" name="Export"
                                stroke={exportColor} strokeWidth={1.5} dot={false}
                                isAnimationActive={true} animationDuration={300} connectNulls={false}
                                // Conditionally hide if not relevant, e.g., if all export values are 0
                                // hide={exportMode === 'auto' && !chartData.some(d => d.export > 0)}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default PowerTimelineGraph;