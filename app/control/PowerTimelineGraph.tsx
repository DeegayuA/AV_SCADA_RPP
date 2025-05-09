// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea, // For potential future highlighting
} from 'recharts';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces'; // Adjust path if needed
import { DataPoint } from '@/config/dataPoints'; // Adjust path if needed
import { useTheme } from 'next-themes';

// Helper to get a color from the current theme (if using Tailwind CSS with custom theme colors)
const getThemeColor = (colorName: string, resolvedTheme: string | undefined) => {
    if (typeof window === 'undefined') return colorName; // Default for SSR
    const style = getComputedStyle(document.documentElement);
    const twColor = style.getPropertyValue(`--color-${colorName}`).trim();
    if (twColor) return twColor;

    // Fallback for common colors if theme variables aren't set up this way
    if (colorName === 'primary') return resolvedTheme === 'dark' ? '#60a5fa' : '#3b82f6'; // Example blue
    if (colorName === 'muted-foreground') return resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
    return colorName;
};

interface PowerDataPoint {
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
    isLive?: boolean; // Optional: set to false if you want to pause live updates
}

const timeScaleConfig: Record<TimeScale, { durationMs: number; tickIntervalMs: number; pointsToKeepRoughly: number }> = {
    day:  { durationMs: 24 * 60 * 60 * 1000, tickIntervalMs: 2 * 60 * 60 * 1000, pointsToKeepRoughly: (24 * 60 * 60) / 30 }, // Every 30s
    '6h': { durationMs: 6 * 60 * 60 * 1000,  tickIntervalMs: 1 * 60 * 60 * 1000, pointsToKeepRoughly: (6 * 60 * 60) / 15 },  // Every 15s
    '1h': { durationMs: 1 * 60 * 60 * 1000,  tickIntervalMs: 10 * 60 * 1000,     pointsToKeepRoughly: (1 * 60 * 60) / 5  },   // Every 5s
    '30m':{ durationMs: 30 * 60 * 1000,     tickIntervalMs: 5 * 60 * 1000,      pointsToKeepRoughly: (30 * 60) / 2   },     // Every 2s
    '5m': { durationMs: 5 * 60 * 1000,      tickIntervalMs: 1 * 60 * 1000,      pointsToKeepRoughly: (5 * 60) / 1    },      // Every 1s
    '1m': { durationMs: 1 * 60 * 1000,      tickIntervalMs: 10 * 1000,          pointsToKeepRoughly: (1 * 60) / 1    },      // Every 1s
};

const PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues,
    generationNodes,
    usageNodes,
    timeScale,
    allPossibleDataPoints,
    isLive = true,
}) => {
    const [data, setData] = useState<PowerDataPoint[]>([]);
    const { resolvedTheme } = useTheme();

    const axisStrokeColor = useMemo(() => getThemeColor('muted-foreground', resolvedTheme), [resolvedTheme]);
    const gridStrokeColor = useMemo(() => resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', [resolvedTheme]);

    const getNodeName = useCallback((nodeId: string): string => {
        const point = allPossibleDataPoints.find(dp => dp.nodeId === nodeId);
        return point?.name || nodeId;
    }, [allPossibleDataPoints]);

    const generationNodeNames = useMemo(() => generationNodes.map(getNodeName).join(', ') || 'N/A', [generationNodes, getNodeName]);
    const usageNodeNames = useMemo(() => usageNodes.map(getNodeName).join(', ') || 'N/A', [usageNodes, getNodeName]);

    useEffect(() => {
        if (!isLive || generationNodes.length === 0 || usageNodes.length === 0) {
            // Optionally clear data if not live or not configured, or just pause updates
            // setData([]);
            return;
        }

        const { durationMs, pointsToKeepRoughly } = timeScaleConfig[timeScale];
        const now = Date.now();

        const totalGeneration = generationNodes.reduce((sum, nodeId) => {
            const value = nodeValues[nodeId];
            return sum + (typeof value === 'number' ? value : 0);
        }, 0);

        const totalUsage = usageNodes.reduce((sum, nodeId) => {
            const value = nodeValues[nodeId];
            return sum + (typeof value === 'number' ? Math.abs(value) : 0); // Ensure usage is positive
        }, 0);

        const netPower = totalGeneration - totalUsage;

        setData(prevData => {
            const newDataPoint: PowerDataPoint = {
                timestamp: now,
                generation: parseFloat(totalGeneration.toFixed(2)),
                usage: parseFloat(totalUsage.toFixed(2)),
                net: parseFloat(netPower.toFixed(2)),
            };

            // Filter out old data and limit array size
            const cutoffTime = now - durationMs;
            let updatedData = prevData.filter(d => d.timestamp >= cutoffTime);
            updatedData.push(newDataPoint);

            // To prevent excessive data points if updates are very frequent relative to scale
            if (updatedData.length > pointsToKeepRoughly * 1.5 && updatedData.length > 50) { // *1.5 buffer
                 // Heuristic to trim older data if exceeding expected points due to rapid updates
                 // For '1m' scale, target 60 points (1 per sec). If we get >90, trim.
                updatedData = updatedData.slice(-Math.floor(pointsToKeepRoughly * 1.2));
            }
            return updatedData;
        });

    }, [nodeValues, generationNodes, usageNodes, timeScale, isLive, allPossibleDataPoints]); // Removed data from dependencies to avoid loop on setData


    const currentValues = useMemo(() => {
        if (data.length === 0) return { generation: 0, usage: 0, net: 0, timestamp: Date.now() };
        return data[data.length - 1];
    }, [data]);

    const netPowerColor = useMemo(() => {
        if (data.length === 0) return axisStrokeColor; // Default color or gray
        return currentValues.net >= 0 ? '#10B981' : '#EF4444'; // Green / Red from Tailwind
    }, [data, currentValues, axisStrokeColor]);

    const formatTick = useCallback((timestamp: number) => {
        const date = new Date(timestamp);
        switch (timeScale) {
            case 'day':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: 'numeric', hour12: false });
            case '6h':
            case '1h':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            case '30m':
            case '5m':
            case '1m':
                return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
            default:
                return date.toLocaleTimeString();
        }
    }, [timeScale]);

    const xTicks = useMemo(() => {
        if (data.length === 0) return undefined;
        const { durationMs, tickIntervalMs } = timeScaleConfig[timeScale];
        const lastTimestamp = data[data.length-1]?.timestamp || Date.now();
        const firstTimestamp = lastTimestamp - durationMs;
        
        const ticks: number[] = [];
        let currentTick = Math.floor(firstTimestamp / tickIntervalMs) * tickIntervalMs + tickIntervalMs;

        while(currentTick <= lastTimestamp) {
            ticks.push(currentTick);
            currentTick += tickIntervalMs;
        }
        if(ticks.length === 0 && data.length > 0) ticks.push(data[0].timestamp); // ensure at least one tick if data exists
        if(ticks.length > 0 && data.length > 0 && ticks[ticks.length-1] < data[data.length-1].timestamp && ticks.length < 10) { // Ensure last tick or close to it
            ticks.push(data[data.length-1].timestamp)
        }

        return ticks.filter((t, i, arr) => i === 0 || t > arr[i-1] + tickIntervalMs / 2); // Basic de-clutter

    }, [data, timeScale]);


    const yAxisDomain = useMemo(() => {
        if (data.length < 2) return ['auto', 'auto']; // Need at least two points for meaningful auto domain sometimes

        let min = Infinity;
        let max = -Infinity;
        data.forEach(d => {
            min = Math.min(min, d.net);
            max = Math.max(max, d.net);
        });

        if (min === Infinity || max === -Infinity || min === max) { // Handle single point or all same values
            const val = min === Infinity ? 0 : min;
            return [val - Math.abs(val * 0.1) - 5, val + Math.abs(val * 0.1) + 5]; // Add some padding
        }

        const padding = Math.max(Math.abs(max - min) * 0.1, 5); // Add 10% padding, at least 5 units
        return [Math.floor(min - padding), Math.ceil(max + padding)];
    }, [data]);


    if (generationNodes.length === 0 && usageNodes.length === 0) {
        return <div className="flex items-center justify-center h-full text-muted-foreground p-4">Please configure Generation and Usage nodes for the graph.</div>;
    }
    if (generationNodes.length === 0) {
        return <div className="flex items-center justify-center h-full text-muted-foreground p-4">Please configure Generation nodes for the graph.</div>;
    }
    if (usageNodes.length === 0) {
        return <div className="flex items-center justify-center h-full text-muted-foreground p-4">Please configure Usage nodes for the graph.</div>;
    }


    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div className="font-medium">
                    Generation: <span className="text-green-500">{currentValues.generation.toFixed(2)} kW</span>
                    <div className="text-xs text-muted-foreground truncate" title={generationNodeNames}>Nodes: {generationNodeNames}</div>
                </div>
                <div className="font-medium">
                    Usage: <span className="text-orange-500">{currentValues.usage.toFixed(2)} kW</span>
                    <div className="text-xs text-muted-foreground truncate" title={usageNodeNames}>Nodes: {usageNodeNames}</div>
                </div>
                <div className="font-medium">
                    Net Power: <span style={{ color: netPowerColor }}>{currentValues.net.toFixed(2)} kW</span>
                    <div className="text-xs text-muted-foreground">Timestamp: {formatTick(currentValues.timestamp)}</div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }} // Adjusted left margin for Y-axis values
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={xTicks}
                        tickFormatter={formatTick}
                        stroke={axisStrokeColor}
                        tick={{ fontSize: 10 }}
                        axisLine={{ stroke: axisStrokeColor }}
                    />
                    <YAxis
                        domain={yAxisDomain}
                        stroke={axisStrokeColor}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${value.toFixed(0)}`} // Keep whole numbers for Y-axis
                        allowDataOverflow={true}
                         width={40} // Give Y-axis enough space
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: resolvedTheme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)', // slate-800 / white
                            borderColor: resolvedTheme === 'dark' ? '#475569' : '#CBD5E1', // slate-600 / slate-300
                            borderRadius: '0.375rem', // md
                            color: resolvedTheme === 'dark' ? '#E2E8F0' : '#1E293B', // slate-200 / slate-800
                        }}
                        labelFormatter={(label) => `Time: ${formatTick(label as number)}`}
                        formatter={(value: number, name: string) => {
                            const unit = name.toLowerCase().includes('power') || name.toLowerCase().includes('generation') || name.toLowerCase().includes('usage') ? ' kW' : '';
                            return [`${value.toFixed(2)}${unit}`, name];
                        }}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}} />
                    <Line
                        type="monotone"
                        dataKey="net"
                        name="Net Power"
                        stroke={netPowerColor}
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={true} // Enable animation for new data
                        animationDuration={300} // Smooth animation
                        connectNulls={true} // Connects lines even if there are null data points (though we filter them)
                    />
                     {/* You can add more lines if needed, e.g., for separate Generation/Usage */}
                    
                    <Line type="monotone" dataKey="generation" name="Generation" stroke="#10B981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="usage" name="Usage" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                   
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PowerTimelineGraph;