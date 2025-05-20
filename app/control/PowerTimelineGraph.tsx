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
    net: number;
}

export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';

interface PowerTimelineGraphProps {
    nodeValues: NodeData;
    generationNodes: string[];
    usageNodes: string[];
    timeScale: TimeScale;
    allPossibleDataPoints: DataPoint[];
    isLive?: boolean;
}

const SIMULATED_PEAK_SOLAR_KW = 50;
const SIMULATED_BASE_USAGE_KW = 10;

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
    generationNodes,
    usageNodes,
    timeScale,
    allPossibleDataPoints,
    isLive = true,
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const { resolvedTheme } = useTheme();
    const liveUpdateTimer = useRef<NodeJS.Timeout | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [animationKey, setAnimationKey] = useState(0); // To force re-render of motion.div

    const axisStrokeColor = useMemo(() => getThemeColor('muted-foreground', resolvedTheme), [resolvedTheme]);
    const gridStrokeColor = useMemo(() => resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', [resolvedTheme]);

    useEffect(() => {
        setIsLoadingInitial(true);
        setChartData([]); // Clear previous data on timescale change
        setAnimationKey(prevKey => prevKey + 1); // Change key to ensure framer-motion re-animates
        const now = new Date();
        console.log(`[${timeScale}] Loading historical data up to:`, now.toISOString());
        const { generation, usage } = getSimulatedHistoricalData(timeScale, now, SIMULATED_PEAK_SOLAR_KW, SIMULATED_BASE_USAGE_KW);

        const mergedData: ChartDataPoint[] = generation.map(genPoint => {
            const usagePoint = usage.find(u => u.timestamp === genPoint.timestamp) || { timestamp: genPoint.timestamp, value: generateUsageData(genPoint.timestamp, SIMULATED_BASE_USAGE_KW)};
            return {
                timestamp: genPoint.timestamp,
                generation: genPoint.value,
                usage: usagePoint.value,
                net: parseFloat((genPoint.value - usagePoint.value).toFixed(2)),
            };
        }).sort((a,b) => a.timestamp - b.timestamp); // Ensure sorted
        
        console.log(`[${timeScale}] Historical data points:`, mergedData.length, mergedData.slice(0, 5));
        setChartData(mergedData);
        setIsLoadingInitial(false);

    }, [timeScale]);


    useEffect(() => {
        if (!isLive || isLoadingInitial) {
            if(liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
            return;
        }
        
        const { durationMs, pointsToDisplay, liveUpdateIntervalMs } = timeScaleConfig[timeScale];

        const updateData = () => {
            const nowMs = Date.now();
            let currentGeneration = 0;
            let currentUsage = 0;

            let useLiveNodeValues = false;
            if (generationNodes.length > 0 && usageNodes.length > 0 && Object.keys(nodeValues).length > 0) {
                const hasGenNode = generationNodes.some(n => typeof nodeValues[n] === 'number');
                const hasUsageNode = usageNodes.some(n => typeof nodeValues[n] === 'number');
                if (hasGenNode && hasUsageNode) { // Only use live if both types of nodes are present and numeric
                    useLiveNodeValues = true;
                }
            }
            
            if (useLiveNodeValues) {
                 currentGeneration = generationNodes.reduce((sum, nodeId) => {
                    const value = nodeValues[nodeId];
                    return sum + (typeof value === 'number' && isFinite(value) ? value : 0);
                }, 0);

                currentUsage = usageNodes.reduce((sum, nodeId) => {
                    const value = nodeValues[nodeId];
                    return sum + (typeof value === 'number' && isFinite(value) ? Math.abs(value) : 0);
                }, 0);
                console.log(`[${timeScale}] Live node values update: Gen=${currentGeneration}, Usage=${currentUsage}`);
            } else {
                const todaySolarCurve = generateDailySolarCurve(new Date(nowMs), SIMULATED_PEAK_SOLAR_KW, 60);
                const closestGenerationPoint = todaySolarCurve.length > 0 ? todaySolarCurve.reduce((prev, curr) => 
                    Math.abs(curr.timestamp - nowMs) < Math.abs(prev.timestamp - nowMs) ? curr : prev
                ) : { timestamp: nowMs, value: 0 };
                currentGeneration = closestGenerationPoint.value;
                currentUsage = generateUsageData(nowMs, SIMULATED_BASE_USAGE_KW);
                 // console.log(`[${timeScale}] Simulated live update: Gen=${currentGeneration}, Usage=${currentUsage}`);
            }
            
            setChartData(prevData => {
                const newDataPoint: ChartDataPoint = {
                    timestamp: nowMs,
                    generation: parseFloat(currentGeneration.toFixed(2)),
                    usage: parseFloat(currentUsage.toFixed(2)),
                    net: parseFloat((currentGeneration - currentUsage).toFixed(2)),
                };

                const cutoffTime = nowMs - durationMs;
                // Filter out old data points
                let updatedData = prevData.filter(d => d.timestamp >= cutoffTime);
                // Add new data point
                updatedData.push(newDataPoint);
                // Sort to ensure timestamps are in order for the line chart
                updatedData.sort((a, b) => a.timestamp - b.timestamp);
                
                // Trim if data grows too large (beyond pointsToDisplay * buffer)
                if (updatedData.length > pointsToDisplay * 2 && updatedData.length > 30) { // Increased buffer for trimming
                    updatedData = updatedData.slice(-Math.floor(pointsToDisplay * 1.5));
                }
                // console.log(`[${timeScale}] chartData updated, length:`, updatedData.length);
                return updatedData;
            });
        };
        
        // Run initial update if chart is not empty, to append a "now" point quickly
        // This depends if you want the live updates to start immediately or wait for the first interval.
        // For now, let setInterval handle the first call for consistency.
        
        if(liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        liveUpdateTimer.current = setInterval(updateData, liveUpdateIntervalMs);

        return () => {
            if (liveUpdateTimer.current) clearInterval(liveUpdateTimer.current);
        };
    }, [nodeValues, generationNodes, usageNodes, timeScale, isLive, isLoadingInitial]); // Removed chartData from here to avoid self-triggering loops


    const currentValues = useMemo(() => {
        if (chartData.length === 0) return { generation: 0, usage: 0, net: 0, timestamp: Date.now() };
        return chartData[chartData.length - 1];
    }, [chartData]);

    const netPowerColor = useMemo(() => {
        if (chartData.length === 0) return axisStrokeColor;
        // Using explicit colors for debugging initially
        return currentValues.net >= 0 ? '#10B981' : '#EF4444';
        // return currentValues.net >= 0 ? getThemeColor('green-500', resolvedTheme) : getThemeColor('red-500', resolvedTheme);
    }, [chartData, currentValues, axisStrokeColor, resolvedTheme]);
    
    const generationColor = useMemo(() => '#34D399', []); // Explicit for debugging
    const usageColor = useMemo(() => '#FBBF24', []); // Explicit for debugging
    // const generationColor = useMemo(() => getThemeColor('green-500', resolvedTheme), [resolvedTheme]);
    // const usageColor = useMemo(() => getThemeColor('orange-500', resolvedTheme), [resolvedTheme]);

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
            // For day or insufficient data, let Recharts auto-determine based on full dataset range
            return ['dataMin', 'dataMax'];
        }
        const lastTimestamp = chartData[chartData.length - 1].timestamp;
        return [lastTimestamp - durationMs, lastTimestamp];
    }, [timeScale, chartData]);


    const yAxisDomain = useMemo((): [number | 'auto', number | 'auto'] => {
        if (chartData.length === 0) return [-SIMULATED_BASE_USAGE_KW -10, SIMULATED_PEAK_SOLAR_KW + 10];

        let minVal = 0; // Start min at 0 or slightly below if net can be negative
        let maxVal = 0; // Start max at 0
        
        chartData.forEach(d => {
            // Ensure values are finite numbers
            const gen = isFinite(d.generation) ? d.generation : 0;
            const usg = isFinite(d.usage) ? d.usage : 0;
            const nt = isFinite(d.net) ? d.net : 0;

            minVal = Math.min(minVal, nt); // Net can be negative
            maxVal = Math.max(maxVal, gen, usg, nt);
        });

        // If all values were 0 or not finite, set a default small range
        if (minVal === 0 && maxVal === 0 && chartData.every(d => d.net === 0 && d.generation === 0 && d.usage === 0)) {
            return [-10, 10];
        }
        
        // If still at initial values due to all NaNs or Infinities (though filtered above)
        if (minVal === Infinity && maxVal === -Infinity) {
             return [-10, SIMULATED_PEAK_SOLAR_KW + 10];
        }


        const padding = Math.max(Math.abs(maxVal - minVal) * 0.15, 15); // Increased padding
        const finalMin = Math.floor(minVal - padding);
        const finalMax = Math.ceil(maxVal + padding);

        return [finalMin, finalMax];
    }, [chartData]);

    // DEBUGGING LOG:
    useEffect(() => {
      if (chartData.length > 0) {
        // console.log("Current chartData:", JSON.stringify(chartData.slice(-5), null, 2));
        // console.log("XAxis Domain:", xAxisDomain);
        // console.log("YAxis Domain:", yAxisDomain);
      }
    }, [chartData, xAxisDomain, yAxisDomain]);


    if (isLoadingInitial && chartData.length === 0){ // Only show full loading if data isn't even there yet
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4">Loading graph data...</div>;
    }
    if (generationNodes.length === 0 || usageNodes.length === 0) {
        return <div className="flex items-center justify-center h-[340px] text-muted-foreground p-4">Please configure Generation and Usage nodes.</div>;
    }


    return (
        <div className="space-y-3">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div className="font-medium">
                    Generation: <span style={{color: generationColor}}>{currentValues.generation.toFixed(2)} kW</span>
                </div>
                <div className="font-medium">
                    Usage: <span style={{color: usageColor}}>{currentValues.usage.toFixed(2)} kW</span>
                </div>
                <div className="font-medium">
                    Net Power: <span style={{ color: netPowerColor }}>{currentValues.net.toFixed(2)} kW</span>
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
                                // hide={!chartData.some(d => d.net !== 0)} // Example: hide if all data is zero
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
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default PowerTimelineGraph;