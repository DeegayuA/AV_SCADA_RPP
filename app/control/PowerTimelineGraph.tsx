// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, LegendType } from 'recharts';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces';
import { DataPoint } from '@/config/dataPoints';
import { useTheme } from 'next-themes';
import {
    Loader2, Zap, ShoppingCart, Send, Leaf, AlertTriangleIcon, ArrowRightToLine,
    ArrowLeftFromLine, PlugZap, RadioTower, ChevronLeft, ChevronRight, Scale,
    TrendingDown, TrendingUp,
    Wind, Sun, CloudSun, CloudMoon, Moon, BatteryCharging, BatteryFull, Battery,
    Home, Factory, Building, Waves, Thermometer, Gauge, Activity, Server, Cloud, Cog,
    Plug, type LucideIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const iconMap: Record<string, LucideIcon> = {
  Zap, Wind, Sun, CloudSun, CloudMoon, Moon, BatteryCharging, BatteryFull, Battery,
  PlugZap, Plug, ShoppingCart, Home, Factory, Building, Waves, Thermometer,
  TrendingUp, TrendingDown, Gauge, Activity, Send, Server, Cloud, Cog,
};
import {
  ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = '30s' | '1m' | '5m' | '30m' | '1h' | '6h' | '12h' | '1d' | '7d' | '1mo';

// --- Component Constants ---
const POWER_PRECISION: Record<PowerUnit, number> = { 'W': 0, 'kW': 2, 'MW': 3, 'GW': 4 };
const MAX_POINTS_FOR_RECHARTS = 750;
const MIN_BUFFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const BUFFER_DURATION_MULTIPLIER = 15;

const AnimatedNumber = ({ value, precision }: { value: number; precision: number }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 100, damping: 20 });
    const display = useTransform(spring, (current) => parseFloat(current.toFixed(precision)));
    useEffect(() => { spring.set(value); }, [spring, value]);
    return <motion.span>{display}</motion.span>;
};

type ChartDataPoint = {
    timestamp: number;
    [key: string]: number; // Dynamic keys for each series
};

interface GridFeedSegment { type: 'export' | 'import'; data: ChartDataPoint[]; }
import { PowerTimelineGraphConfig, TimelineSeries } from './PowerTimelineGraphConfigurator';

interface PowerTimelineGraphProps {
    nodeValues: NodeData;
    allPossibleDataPoints: DataPoint[];
    config: PowerTimelineGraphConfig;
    timeScale: TimeScale;
    isLiveSourceAvailable?: boolean;
    useDemoDataSource?: boolean;
    useWindDemoDataSource?: boolean;
}

const timeScaleAggregationInterval: Record<TimeScale, number | null> = {
    '30s': null, '1m': null, '5m': 5 * 1000, '30m': 30 * 1000, '1h': 1 * 60 * 1000,
    '6h': 5 * 60 * 1000, '12h': 10 * 60 * 1000, '1d': 15 * 60 * 1000,
    '7d': 1 * 60 * 60 * 1000, '1mo': 3 * 60 * 60 * 1000,
};

const timeScaleConfig: Record<TimeScale, { durationMs: number; tickIntervalMs: number; pointsToDisplay: number; liveUpdateIntervalMs: number; }> = {
    '30s': { durationMs: 30*1000, tickIntervalMs: 3*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 1*1000 },
    '1m':  { durationMs: 1*60*1000, tickIntervalMs: 6*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 1*1000 },
    '5m':  { durationMs: 5*60*1000, tickIntervalMs: 30*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 5*1000 },
    '30m': { durationMs: 30*60*1000, tickIntervalMs: 3*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 15*1000 },
    '1h':  { durationMs: 60*60*1000, tickIntervalMs: 6*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 30*1000 },
    '6h':  { durationMs: 6*60*60*1000, tickIntervalMs: 36*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 2*60*1000 },
    '12h': { durationMs: 12*60*60*1000, tickIntervalMs: 72*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 5*60*1000 },
    '1d':  { durationMs: 24*60*60*1000, tickIntervalMs: 2.4*60*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 10*60*1000 },
    '7d':  { durationMs: 7*24*60*60*1000, tickIntervalMs: 16.8*60*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 30*60*1000 },
    '1mo': { durationMs: 30*24*60*60*1000, tickIntervalMs: 3*24*60*60*1000, pointsToDisplay: 10, liveUpdateIntervalMs: 60*60*1000 }
};

const unitToFactorMap: Record<PowerUnit, number> = { W: 1, kW: 1000, MW: 1000000, GW: 1000000000 };
const convertToWatts = (v: number, u?: string): number => { if (typeof v !== 'number' || !isFinite(v)) return 0; if (typeof u !== 'string' || !u.trim()) return v; const unitClean = u.trim().toUpperCase() as PowerUnit | string; const factor = unitToFactorMap[unitClean as PowerUnit]; return factor !== undefined ? v * factor : v; };
const convertFromWatts = (v: number, targetUnit: PowerUnit): number => { if (typeof v !== 'number' || !isFinite(v)) return 0; return v / (unitToFactorMap[targetUnit] || 1);};

const PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues, allPossibleDataPoints, config, timeScale,
    isLiveSourceAvailable = true, useDemoDataSource = false, useWindDemoDataSource = false,
}) => {
    const { series: timelineSeries, exportMode } = config;
    const [chartData, setChartData] = useState<any[]>([]);
    const { resolvedTheme } = useTheme();
    const [isGraphReady, setIsGraphReady] = useState(false);
    const [animationKey, setAnimationKey] = useState(Date.now());
    const [lastUpdatedDisplayTime, setLastUpdatedDisplayTime] = useState<string>('N/A');
    const prevDemoUsageRef = useRef<number | null>(null);

    const dataBufferRef = useRef<ChartDataPoint[]>([]);
    const demoDataIngestTimer = useRef<NodeJS.Timeout | null>(null);
    const graphUpdateTimer = useRef<NodeJS.Timeout | null>(null);

    const [isForcedLiveUiButtonActive, setIsForcedLiveUiButtonActive] = useState(false);
    const [historicalTimeOffsetMs, setHistoricalTimeOffsetMs] = useState(0);
    const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({});
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, time: 0 });
    const [viewDomain, setViewDomain] = useState<[number, number] | null>(null);

    const handleWheel = (e: any) => {
        if (e.deltaY === 0) return;
        e.preventDefault();

        const { durationMs } = timeScaleConfig[timeScale];
        const currentDomain = viewDomain || [Date.now() - durationMs - historicalTimeOffsetMs, Date.now() - historicalTimeOffsetMs];

        const zoomFactor = 1.1;
        const newDuration = e.deltaY < 0 ? (currentDomain[1] - currentDomain[0]) / zoomFactor : (currentDomain[1] - currentDomain[0]) * zoomFactor;

        // Prevent zooming out beyond the original timeScale duration
        if (newDuration > durationMs) {
            setViewDomain([currentDomain[1] - durationMs, currentDomain[1]]);
            return;
        }

        // Center the zoom on the cursor
        const chart = e.currentTarget;
        const chartRect = chart.getBoundingClientRect();
        const mouseX = e.clientX - chartRect.left;

        const chartWidth = chartRect.width;
        // Adjust for padding/margin if the chart's inner area is different
        const chartAreaX = mouseX - 60; // Approximate left margin of the chart
        const chartAreaWidth = chartWidth - 70; // Approximate total width minus margins

        if (chartAreaX < 0 || chartAreaX > chartAreaWidth) return;

        const timeAtCursor = currentDomain[0] + (currentDomain[1] - currentDomain[0]) * (chartAreaX / chartAreaWidth);

        const newStart = timeAtCursor - newDuration * (chartAreaX / chartAreaWidth);
        const newEnd = newStart + newDuration;

        setViewDomain([newStart, newEnd]);
        setHistoricalTimeOffsetMs(Date.now() - newEnd);
    };

    useEffect(() => {
        const initialVisibility: Record<string, boolean> = {};
        timelineSeries.forEach(s => {
            initialVisibility[s.id] = s.visible;
        });
        setSeriesVisibility(initialVisibility);
    }, [timelineSeries]);

    useEffect(() => {
        const fetchData = async () => {
            const { durationMs } = timeScaleConfig[timeScale];
            const end = new Date(Date.now() - historicalTimeOffsetMs);
            const start = new Date(end.getTime() - durationMs);

            const datesToFetch = new Set<string>();
            let currentDate = new Date(start);
            while (currentDate <= end) {
                datesToFetch.add(currentDate.toISOString().substring(0, 10));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const promises = Array.from(datesToFetch).map(date =>
                fetch(`/api/graph-history?date=${date}`).then(res => res.json())
            );

            try {
                const results = await Promise.all(promises);
                const historicalData = results.flat();

                // Assuming the API returns data points with a 'timestamp' and other values.
                // We need to transform this into the ChartDataPoint format.
                const formattedData = historicalData.map((d: any) => {
                    const seriesValues: { [key: string]: number } = {};
                    timelineSeries.forEach(series => {
                        let sum = 0;
                        series.dpIds.forEach(dpId => {
                            const dp = allPossibleDataPoints.find(p => p.id === dpId);
                            if (dp && d[dp.nodeId] !== undefined) {
                                const rawValue = d[dp.nodeId];
                                const factor = dp.factor || 1;
                                const valueInWatts = convertToWatts(rawValue * factor, dp.unit);
                                const multiplier = series.multiplier || 1;
                                sum += series.invert ? -valueInWatts * multiplier : valueInWatts * multiplier;
                            }
                        });
                        seriesValues[series.id] = sum;
                    });
                    return { timestamp: new Date(d.timestamp).getTime(), ...seriesValues };
                });

                dataBufferRef.current = formattedData.sort((a, b) => a.timestamp - b.timestamp);
                setAnimationKey(Date.now()); // Trigger re-render
            } catch (error) {
                console.error("Failed to fetch historical graph data:", error);
            }
        };

        if (historicalTimeOffsetMs > 0 || !isLiveSourceAvailable) {
            fetchData();
        }
    }, [timeScale, historicalTimeOffsetMs, isLiveSourceAvailable, allPossibleDataPoints, timelineSeries]);

    const handleVisibilityToggle = (seriesId: string) => {
        setSeriesVisibility(prev => ({
            ...prev,
            [seriesId]: !prev[seriesId],
        }));
    };

    const handleLegendClick = (e: any) => {
        handleVisibilityToggle(e.dataKey);
    };

    const visibleSeries = useMemo(() => timelineSeries.filter(s => seriesVisibility[s.id]), [timelineSeries, seriesVisibility]);
    const drawableSeries = useMemo(() => visibleSeries.filter(s => s.drawOnGraph && s.role !== 'gridFeed'), [visibleSeries]);
    const gridFeedSeries = useMemo(() => visibleSeries.filter(s => s.drawOnGraph && s.role === 'gridFeed'), [visibleSeries]);

    const gridFeedSegments = useMemo(() => {
        const segments: { seriesId: string, type: 'export' | 'import', data: ChartDataPoint[] }[] = [];
        if (!chartData || chartData.length < 1) return segments;

        gridFeedSeries.forEach(series => {
            let currentSegment: ChartDataPoint[] | null = null;
            let currentSegmentType: 'export' | 'import' | null = null;

            for (let i = 0; i < chartData.length; i++) {
                const point = chartData[i];
                const value = point[series.id];
                if (typeof value !== 'number') continue;

                const pointType = value >= 0 ? 'export' : 'import';

                if (currentSegmentType !== pointType) {
                    if (currentSegment && currentSegment.length > 0) {
                        segments.push({ seriesId: series.id, type: currentSegmentType!, data: currentSegment });
                    }
                    currentSegment = [];
                    currentSegmentType = pointType;

                    if (i > 0) {
                        const prevPoint = chartData[i-1];
                        const prevValue = prevPoint[series.id];
                        if (typeof prevValue === 'number' && (prevValue >= 0 && value < 0) || (prevValue < 0 && value >= 0)) {
                            const t0 = prevPoint.timestamp, t1 = point.timestamp;
                            const v0 = prevValue, v1 = value;
                            if (t1 > t0 && v1 !== v0) {
                                const tZero = t0 + (t1 - t0) * (-v0 / (v1 - v0));
                                const interpolatedPoint: ChartDataPoint = { timestamp: tZero, [series.id]: 0 };
                                if (segments.length > 0 && segments[segments.length - 1].data.length > 0) {
                                    segments[segments.length - 1].data.push(interpolatedPoint);
                                }
                                currentSegment.push(interpolatedPoint);
                            }
                        }
                    }
                }
                if(currentSegment) currentSegment.push(point);
            }
            if (currentSegment && currentSegment.length > 0 && currentSegmentType) {
                segments.push({ seriesId: series.id, type: currentSegmentType, data: currentSegment });
            }
        });
        return segments;
    }, [chartData, gridFeedSeries]);

    const chartConfig = useMemo((): ChartConfig => {
        const dynamicConfig: ChartConfig = {
            netPower: { label: "Net Power", icon: Scale, color: "hsl(var(--chart-5))" }
        };
        timelineSeries.forEach(series => {
            const LucideIcon = iconMap[series.icon] || Zap;
            dynamicConfig[series.id] = {
                label: series.name,
                color: series.color,
                icon: LucideIcon,
            };
        });
        return dynamicConfig;
    }, [timelineSeries]);

    const previousTimeScaleRef = useRef(timeScale);
    useEffect(() => {
      if (previousTimeScaleRef.current !== timeScale) {
        setIsForcedLiveUiButtonActive(false);
        setHistoricalTimeOffsetMs(0);
        previousTimeScaleRef.current = timeScale;
        setAnimationKey(Date.now());
      }
    }, [timeScale]);

    const effectiveUseDemoData = useMemo(() => (useDemoDataSource || useWindDemoDataSource) && !isForcedLiveUiButtonActive && historicalTimeOffsetMs === 0 && !viewDomain, [useDemoDataSource, useWindDemoDataSource, isForcedLiveUiButtonActive, historicalTimeOffsetMs, viewDomain]);
    const effectiveIsLive = useMemo(() => (isLiveSourceAvailable || isForcedLiveUiButtonActive) && !effectiveUseDemoData && historicalTimeOffsetMs === 0 && !viewDomain, [isLiveSourceAvailable, isForcedLiveUiButtonActive, effectiveUseDemoData, historicalTimeOffsetMs, viewDomain]);

    const resetZoomAndPan = () => {
        setViewDomain(null);
        setHistoricalTimeOffsetMs(0);
        setIsForcedLiveUiButtonActive(true);
    };

    const processDataPoint = useCallback((timestamp: number, seriesValues: { [key: string]: number }): ChartDataPoint => {
        // Storing raw data (in Watts) without rounding. Rounding happens at display time.
        return { timestamp, ...seriesValues };
    }, []);

    const generateDemoValues = useCallback(() => {
        const now = new Date();
        const totalMinutesInDay = now.getHours() * 60 + now.getMinutes();
        const seriesValues: { [key: string]: number } = {};

        // All demo values are generated in WATTS
        if (timelineSeries[0]) {
            const solarPotential = Math.sin((totalMinutesInDay - 6 * 60) * Math.PI / (13 * 60));
            const solarValueInWatts = Math.max(0, solarPotential * 25000); // Demo W (was 25 kW)
            seriesValues[timelineSeries[0].id] = solarValueInWatts;
        }
        if (timelineSeries[1]) {
            const usageValueInWatts = (8 + Math.sin(totalMinutesInDay / 120 * Math.PI) * 4) * 1000; // Demo W (was 8-12 kW)
            seriesValues[timelineSeries[1].id] = usageValueInWatts;
        }
        return seriesValues;
    }, [timelineSeries]);

    const sumValuesForDpIds = useCallback((series: TimelineSeries): number => {
        if (!allPossibleDataPoints?.length || !nodeValues || Object.keys(nodeValues).length === 0) {
            return 0;
        }
        let sumInWatts = 0;
        series.dpIds.forEach(dpId => {
            const dp = allPossibleDataPoints.find(p => p.id === dpId);
            if (dp) {
                const rawValueFromNode = nodeValues[dp.nodeId];
                let numericValue = 0;
                // The unit for conversion comes from the data point itself, or the series override
                let unitForConversion = series.unit || dp.unit;
                if (typeof rawValueFromNode === 'object' && rawValueFromNode !== null) {
                    if ('value' in rawValueFromNode) {
                        const typedValue = rawValueFromNode as { value: unknown, unit?: string };
                        numericValue = Number(typedValue.value);
                        if (typeof typedValue.unit === 'string') { unitForConversion = typedValue.unit;}
                    }
                } else if (typeof rawValueFromNode === 'number') {
                    numericValue = rawValueFromNode;
                }
                const factor = dp.factor || 1;
                const valueOfInterest = (isFinite(numericValue) ? numericValue * factor : 0);
                sumInWatts += convertToWatts(valueOfInterest, unitForConversion);
            }
        });
        // The final value is always returned in Watts, with multiplier and inversion applied.
        const multiplier = series.multiplier || 1;
        const valueInWatts = sumInWatts * multiplier;
        return series.invert ? valueInWatts * -1 : valueInWatts;
    }, [nodeValues, allPossibleDataPoints]);

    useEffect(() => {
      setChartData([]);
      setIsGraphReady(false);
      setLastUpdatedDisplayTime('N/A');
      prevDemoUsageRef.current = null;
      dataBufferRef.current = [];
      if (graphUpdateTimer.current) clearInterval(graphUpdateTimer.current);
      graphUpdateTimer.current = null;
      if (demoDataIngestTimer.current) clearInterval(demoDataIngestTimer.current);
      demoDataIngestTimer.current = null;
      setAnimationKey(Date.now());
    }, [timeScale, timelineSeries, exportMode, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs]);

    useEffect(() => {
      const dpsConfigured = timelineSeries.length > 0 && timelineSeries.some(s => s.dpIds.length > 0);
      if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }

      if (effectiveUseDemoData) {
          const demoIngestInterval = 1000;
          const generateAndBufferDemo = () => {
              const demoValues = generateDemoValues();
              dataBufferRef.current.push(processDataPoint(Date.now(), demoValues));
          };
          if (dpsConfigured) {
            if (dataBufferRef.current.length === 0) generateAndBufferDemo();
            demoDataIngestTimer.current = setInterval(generateAndBufferDemo, demoIngestInterval);
          }
      } else if (effectiveIsLive && dpsConfigured && allPossibleDataPoints?.length > 0 && nodeValues && Object.keys(nodeValues).length > 0) {
          const currentTimestamp = Date.now();
          const seriesValues: { [key: string]: number } = {};
          timelineSeries.forEach(series => {
              seriesValues[series.id] = sumValuesForDpIds(series);
          });
          dataBufferRef.current.push(processDataPoint(currentTimestamp, seriesValues));
      }

      return () => { if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }};
    }, [nodeValues, timelineSeries, allPossibleDataPoints, sumValuesForDpIds, generateDemoValues, effectiveIsLive, effectiveUseDemoData, processDataPoint]);

    useEffect(() => {
        const dpsConfigured = timelineSeries.length > 0 && timelineSeries.some(s => s.dpIds.length > 0);

        const aggregateData = (rawData: ChartDataPoint[], intervalMs: number): ChartDataPoint[] => {
            if (!intervalMs || rawData.length === 0) return rawData;

            const aggregated: ChartDataPoint[] = [];
            let bucketStart = Math.floor(rawData[0].timestamp / intervalMs) * intervalMs;
            let currentBucketPoints: ChartDataPoint[] = [];
            const seriesIds = timelineSeries.map(s => s.id);

            for (const point of rawData) {
                if (point.timestamp >= bucketStart + intervalMs) {
                    if (currentBucketPoints.length > 0) {
                        const avgValues: { [key: string]: number } = {};
                        seriesIds.forEach(id => {
                            const sum = currentBucketPoints.reduce((s, p) => s + (p[id] || 0), 0);
                            avgValues[id] = sum / currentBucketPoints.length;
                        });
                        aggregated.push(processDataPoint(bucketStart + intervalMs / 2, avgValues));
                    }
                    bucketStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
                    currentBucketPoints = [point];
                } else {
                    currentBucketPoints.push(point);
                }
            }
             if (currentBucketPoints.length > 0) {
                const avgValues: { [key: string]: number } = {};
                seriesIds.forEach(id => {
                    const sum = currentBucketPoints.reduce((s, p) => s + (p[id] || 0), 0);
                    avgValues[id] = sum / currentBucketPoints.length;
                });
                aggregated.push(processDataPoint(bucketStart + intervalMs / 2, avgValues));
            }
            return aggregated;
        };

        const updateAndRenderGraph = () => {
            const nowMs = Date.now();
            const { durationMs } = timeScaleConfig[timeScale];
            let viewAnchorTime = nowMs - historicalTimeOffsetMs;

            if (!effectiveIsLive && !effectiveUseDemoData && dataBufferRef.current.length > 0) {
                const latestBufferedTimestamp = dataBufferRef.current[dataBufferRef.current.length -1]?.timestamp || nowMs;
                viewAnchorTime = Math.min(latestBufferedTimestamp, nowMs - historicalTimeOffsetMs);
            }
            const cutoffTimeForDisplay = viewAnchorTime - durationMs;

            let rawPointsInWindow = dataBufferRef.current.filter(d => d.timestamp >= cutoffTimeForDisplay && d.timestamp <= viewAnchorTime);
            if(rawPointsInWindow.length === 0 && dataBufferRef.current.length > 0) {
                rawPointsInWindow = dataBufferRef.current.filter(d => d.timestamp <= viewAnchorTime);
            }
            rawPointsInWindow.sort((a, b) => a.timestamp - b.timestamp);

            const aggregationIntervalMs = timeScaleAggregationInterval[timeScale];
            let pointsForGraph = aggregationIntervalMs ? aggregateData(rawPointsInWindow, aggregationIntervalMs) : rawPointsInWindow;

            if (pointsForGraph.length > MAX_POINTS_FOR_RECHARTS) {
                pointsForGraph = pointsForGraph.slice(-MAX_POINTS_FOR_RECHARTS);
            }

            setChartData(pointsForGraph);
            if (pointsForGraph.length > 0 || historicalTimeOffsetMs > 0 || effectiveUseDemoData) {
              setLastUpdatedDisplayTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }

            if (!isGraphReady && dpsConfigured && ( (effectiveUseDemoData || effectiveIsLive) && pointsForGraph.length > 0) || (!effectiveIsLive && !effectiveUseDemoData)) {
                 setIsGraphReady(true);
            }

            const bufferPruningDuration = Math.max(durationMs * BUFFER_DURATION_MULTIPLIER, MIN_BUFFER_DURATION_MS);
            const absoluteOldestTimestampToKeep = Date.now() - bufferPruningDuration;

            let i = 0;
            while(i < dataBufferRef.current.length && dataBufferRef.current[i].timestamp < absoluteOldestTimestampToKeep) i++;
            if (i > 0) {
                dataBufferRef.current.splice(0, i);
            }
        };

        if (graphUpdateTimer.current) { clearInterval(graphUpdateTimer.current); graphUpdateTimer.current = null; }
        if (!dpsConfigured && (effectiveIsLive || effectiveUseDemoData)) {
            setIsGraphReady(false);
            setChartData([]);
            return;
        }
        updateAndRenderGraph();
        if ((effectiveIsLive || effectiveUseDemoData) && historicalTimeOffsetMs === 0) {
            if (dpsConfigured) {
                const { liveUpdateIntervalMs } = timeScaleConfig[timeScale];
                graphUpdateTimer.current = setInterval(updateAndRenderGraph, liveUpdateIntervalMs);
            }
        }
        return () => { if (graphUpdateTimer.current) { clearInterval(graphUpdateTimer.current); graphUpdateTimer.current = null; }};
    }, [timeScale, isGraphReady, timelineSeries, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs, processDataPoint, sumValuesForDpIds, nodeValues]);

    const currentData = useMemo(() => {
        const dpsConfigured = timelineSeries.length > 0 && timelineSeries.some(s => s.dpIds.length > 0);
        const rawSeriesValuesInWatts: { [key: string]: number } = {};

        // Determine the source of the latest data point (live, demo, or historical)
        if (historicalTimeOffsetMs > 0 && chartData.length > 0) {
            const lastPointInView = chartData[chartData.length - 1];
            if (lastPointInView) {
                timelineSeries.forEach(series => { rawSeriesValuesInWatts[series.id] = lastPointInView[series.id] || 0; });
            }
        } else if (effectiveUseDemoData && dpsConfigured) {
            const lastDemoPoint = dataBufferRef.current[dataBufferRef.current.length - 1];
            if (lastDemoPoint && lastDemoPoint.timestamp > Date.now() - 5000) {
                timelineSeries.forEach(series => { rawSeriesValuesInWatts[series.id] = lastDemoPoint[series.id] || 0; });
            } else {
                const demo = generateDemoValues();
                timelineSeries.forEach(series => { rawSeriesValuesInWatts[series.id] = demo[series.id] || 0; });
            }
        } else if (effectiveIsLive && dpsConfigured && nodeValues && Object.keys(nodeValues).length > 0 && allPossibleDataPoints && allPossibleDataPoints.length > 0) {
            timelineSeries.forEach(series => { rawSeriesValuesInWatts[series.id] = sumValuesForDpIds(series); });
        } else if (chartData.length > 0) {
            const pointSource = chartData[chartData.length - 1];
            timelineSeries.forEach(series => { rawSeriesValuesInWatts[series.id] = pointSource[series.id] || 0; });
        }

        // Fill in any missing series with 0
        timelineSeries.forEach(series => {
            if (rawSeriesValuesInWatts[series.id] === undefined) { rawSeriesValuesInWatts[series.id] = 0; }
        });

        // Convert raw Watt values to the desired display format for the UI
        const displaySeriesValues: { [key: string]: number } = {};
        timelineSeries.forEach(series => {
            const rawValue = rawSeriesValuesInWatts[series.id];
            const displayUnit = (series.unit as PowerUnit) || 'W';
            displaySeriesValues[series.id] = convertFromWatts(rawValue, displayUnit);
        });

        const totalGenerationInWatts = timelineSeries
            .filter(s => s.role === 'generation')
            .reduce((sum, s) => sum + (rawSeriesValuesInWatts[s.id] || 0), 0);

        const totalUsageInWatts = timelineSeries
            .filter(s => s.role === 'usage')
            .reduce((sum, s) => sum + (rawSeriesValuesInWatts[s.id] || 0), 0);

        const netPowerInWatts = totalGenerationInWatts - totalUsageInWatts;

        return {
            displayValues: displaySeriesValues, // Values converted for top display
            rawValuesInWatts: rawSeriesValuesInWatts, // Original values for logic
            metadata: {
                netPowerInWatts,
                isSelfSufficient: netPowerInWatts >= 0,
            }
        };
    }, [
        nodeValues, allPossibleDataPoints, chartData, timelineSeries, sumValuesForDpIds,
        generateDemoValues, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs
    ]);

    const formatXAxisTick = useCallback((ts: number) => {
        const date = new Date(ts);
        const optionsBase: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true, // Ensure 12-hour format
        };

        switch(timeScale) {
            case '1mo':
                // For month view, show Month Day, e.g., "Jan 5"
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            case '7d':
                 // For 7-day view, show Weekday Day, e.g., "Mon 5" or just "5 AM" for intermediate ticks
                const isStartOfWeekOrSignificant = date.getHours() === 0; // Example logic, refine as needed
                if (isStartOfWeekOrSignificant) {
                     return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
                }
                return date.toLocaleTimeString([], optionsBase).replace(':00', ''); // Remove seconds for cleaner "X AM/PM"
            case '1d':
                // For 1-day view, show hour and minute, e.g., "2:00 PM"
                return date.toLocaleTimeString([], optionsBase);
            case '12h':
            case '6h':
            case '1h':
            case '30m':
                 // For these scales, "X:MM AM/PM" is good
                return date.toLocaleTimeString([], optionsBase);
            case '5m':
                // For 5min scale, "X:MM:SS AM/PM" if needed, or just "X:MM AM/PM" if seconds aren't critical
                return date.toLocaleTimeString([], {...optionsBase, second: '2-digit'});
            default: // 30s, 1m
                // For very short scales, include seconds, e.g., "2:05:30 PM"
                return date.toLocaleTimeString([], {...optionsBase, second: '2-digit' });
        }
    }, [timeScale]);

    const handleMouseDown = (e: any) => {
        if (e.target.classList.contains('recharts-surface')) {
            setIsPanning(true);
            const { durationMs } = timeScaleConfig[timeScale];
            const currentDomain = viewDomain || [Date.now() - durationMs - historicalTimeOffsetMs, Date.now() - historicalTimeOffsetMs];
            setPanStart({ x: e.clientX, time: currentDomain[0] });
        }
    };

    const handleMouseMove = (e: any) => {
        if (!isPanning) return;

        const { durationMs } = timeScaleConfig[timeScale];
        const currentDomain = viewDomain || [Date.now() - durationMs - historicalTimeOffsetMs, Date.now() - historicalTimeOffsetMs];
        const domainDuration = currentDomain[1] - currentDomain[0];

        const chart = e.currentTarget;
        const chartRect = chart.getBoundingClientRect();
        const chartWidth = chartRect.width - 70; // Adjust for margins

        const dx = e.clientX - panStart.x;
        const dt = (dx / chartWidth) * domainDuration;

        const newStart = panStart.time - dt;
        const newEnd = newStart + domainDuration;

        setViewDomain([newStart, newEnd]);
        setHistoricalTimeOffsetMs(Date.now() - newEnd);
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const xAxisDomain = useMemo(():[number,number|'dataMax'] => {
        if (viewDomain) {
            return viewDomain as [number, number];
        }
        const { durationMs } = timeScaleConfig[timeScale];
        let viewEndTime: number;

        if (effectiveIsLive || (effectiveUseDemoData && historicalTimeOffsetMs === 0)) {
            viewEndTime = Date.now();
        } else if (historicalTimeOffsetMs > 0) {
            viewEndTime = Date.now() - historicalTimeOffsetMs;
        } else {
            if (chartData.length > 0) {
                viewEndTime = chartData[chartData.length -1].timestamp;
            } else if (dataBufferRef.current.length > 0) {
                viewEndTime = dataBufferRef.current[dataBufferRef.current.length -1].timestamp;
            } else {
                viewEndTime = Date.now();
            }
        }
        return [viewEndTime - durationMs, viewEndTime];
    },[timeScale, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs, chartData]);

    const yAxisDomain = useMemo(():[number,number] => {
        const dataToUse = chartData.length > 0 ? chartData : [currentData.rawValuesInWatts];
        let allValues: number[] = [];
        const seriesIds = timelineSeries.map(s => s.id);

        dataToUse.forEach(d => {
            seriesIds.forEach(id => {
                if (typeof d[id] === 'number' && isFinite(d[id])) {
                    allValues.push(d[id]);
                }
            });
        });
        if (allValues.length === 0) return [-5000, 20000]; // Default domain in Watts (-5kW to 20kW)

        let minV = Math.min(...allValues);
        let maxV = Math.max(...allValues);

        if (minV === maxV) {
            minV -= 1000; // Pad by 1kW
            maxV += 1000; // Pad by 1kW
        } else {
            const range = maxV - minV;
            const padding = Math.max(range * 0.1, 500); // Pad by 10% or at least 500W
            minV -= padding;
            maxV += padding;
        }

        if (minV > 0 && minV < 2000) minV = Math.min(0, minV); // Ensure 0 is visible if we are close
        if (maxV < 0 && maxV > -2000) maxV = Math.max(0, maxV);

        return [Math.floor(minV), Math.ceil(maxV)];
    }, [chartData, currentData.rawValuesInWatts, timelineSeries]);

    const yAxisTickFormatter = useCallback((value: number): string => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)} MW`;
        if (absValue >= 1000) return `${(value / 1000).toFixed(1)} kW`;
        return `${value.toFixed(0)} W`;
    }, []);


    const isCurrentlyDrawingLiveOrDemo = (effectiveIsLive || effectiveUseDemoData) && historicalTimeOffsetMs === 0;

    const handleTimeShift = (direction: 'prev' | 'next') => {
        const { durationMs } = timeScaleConfig[timeScale];
        const shiftAmount = durationMs / 2;
        setIsForcedLiveUiButtonActive(false);
        if (direction === 'prev') {
            const oldestDataPointTimestamp = dataBufferRef.current[0]?.timestamp;
            if (oldestDataPointTimestamp === undefined && dataBufferRef.current.length > 0) return;
            const currentWindowEndTime = Date.now() - historicalTimeOffsetMs;
            const prospectiveNewWindowStartTime = (currentWindowEndTime - shiftAmount) - durationMs;
            if (oldestDataPointTimestamp === undefined || prospectiveNewWindowStartTime >= oldestDataPointTimestamp ) {
                setHistoricalTimeOffsetMs(prev => prev + shiftAmount);
            } else {
                const maxPossibleOffset = Date.now() - (oldestDataPointTimestamp + durationMs);
                setHistoricalTimeOffsetMs(Math.max(0, maxPossibleOffset));
            }
        } else {
            setHistoricalTimeOffsetMs(prevOffset => Math.max(0, prevOffset - shiftAmount));
        }
        setAnimationKey(Date.now());
    };

    const disablePrevButton = useMemo(() => {
        if (isCurrentlyDrawingLiveOrDemo || dataBufferRef.current.length === 0) {
            return true;
        }
        const oldestDataPointTimestamp = dataBufferRef.current[0].timestamp;
        const { durationMs } = timeScaleConfig[timeScale];
        const currentWindowStartTime = (Date.now() - historicalTimeOffsetMs) - durationMs;
        return currentWindowStartTime <= oldestDataPointTimestamp;
    }, [isCurrentlyDrawingLiveOrDemo, historicalTimeOffsetMs, timeScale, dataBufferRef.current.length > 0 ? dataBufferRef.current[0]?.timestamp : null]);

    const dpsAreConfigured = timelineSeries.length > 0 && timelineSeries.some(s => s.dpIds.length > 0);

    if (!effectiveUseDemoData && !dpsAreConfigured) {
        return <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">Please configure at least one data series.</div>;
    }
    if (!isGraphReady && isCurrentlyDrawingLiveOrDemo && chartData.length === 0 && dataBufferRef.current.length === 0 && dpsAreConfigured) {
        return <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 space-y-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span>Waiting for initial data...</span></div>;
    }
    if (isGraphReady && !isCurrentlyDrawingLiveOrDemo && chartData.length === 0 && dpsAreConfigured) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 space-y-2">
                <AlertTriangleIcon className="h-8 w-8 text-amber-500" />
                <span>No data available for this time period.</span>
                <span>Try adjusting the time scale or navigating.</span>
            </div>
        );
    }

    return (
    <TooltipProvider delayDuration={150}>
        <motion.div
            className={cn(
                "space-y-2 p-3 rounded-lg shadow-lg border-2 transition-colors duration-700 ease-in-out",
                currentData.metadata.isSelfSufficient ? "border-green-400/60 dark:border-green-500/70" : "border-red-400/60 dark:border-red-500/70",
                "bg-background/50"
            )}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs sm:text-sm mb-2 px-1">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-2 items-stretch">
                {timelineSeries.map(series => {
                    const value = currentData.displayValues[series.id] || 0;
                    const displayUnit = (series.unit as PowerUnit) || 'W';
                    const precision = series.precision ?? POWER_PRECISION[displayUnit];
                    const IconToUse = chartConfig[series.id]?.icon || Zap;
                    const isVisible = seriesVisibility[series.id];
                    return (
                    <motion.button
                        key={series.id}
                        onClick={() => handleVisibilityToggle(series.id)}
                        className={cn(
                            "flex items-center text-left gap-1.5 sm:gap-2 p-2 rounded-lg bg-background/70 dark:bg-black/30 shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                            !isVisible && "opacity-40 hover:opacity-60",
                            isVisible && "ring-1 ring-foreground/10"
                        )}
                        whileHover={{ scale: 1.02 }} whileTap={{scale:0.98}}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                        <IconToUse className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{color: series.color}} />
                        <div className="flex flex-col">
                            <span className="text-xs sm:text-[0.8rem] text-muted-foreground leading-tight">{series.name}</span>
                            <span className="font-bold text-sm sm:text-[0.9rem] leading-tight" style={{color: series.color}}>
                                <AnimatedNumber value={value} precision={precision} /> {displayUnit}
                            </span>
                        </div>
                    </motion.button>
                )})}
                 <motion.div
                    key={currentData.metadata.isSelfSufficient ? 'green-status' : 'red-status'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay:0.1, ease: "easeOut" }}
                    className={cn(
                        "flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs sm:text-sm col-span-2 sm:col-span-1 md:col-auto shadow-md",
                        currentData.metadata.isSelfSufficient ? 'bg-green-500/20 text-green-700 dark:bg-green-500/25 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-300'
                    )}
                >
                    {currentData.metadata.isSelfSufficient ? <Leaf className="h-4 w-4 sm:h-5 sm:w-5"/> : <AlertTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5"/>}
                    <span className="leading-tight">{currentData.metadata.isSelfSufficient ? "Self-Sufficient" : "Grid Dependent"}</span>
                </motion.div>
              </div>
              <div className="flex flex-wrap items-center space-x-1.5 text-xs text-muted-foreground mt-1 sm:mt-0">
                 <Tooltip> <TooltipTrigger asChild>
                    <Button
                        variant={isCurrentlyDrawingLiveOrDemo && !isForcedLiveUiButtonActive ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => { setIsForcedLiveUiButtonActive(true); setHistoricalTimeOffsetMs(0); setAnimationKey(Date.now());}}
                        className="h-7 px-2"
                        disabled={isForcedLiveUiButtonActive || (isCurrentlyDrawingLiveOrDemo && historicalTimeOffsetMs === 0 && !isForcedLiveUiButtonActive && !useDemoDataSource && isLiveSourceAvailable)}
                    >
                        <RadioTower className={cn("h-4 w-4", isCurrentlyDrawingLiveOrDemo && "animate-pulse text-green-500", historicalTimeOffsetMs === 0 && !isCurrentlyDrawingLiveOrDemo && "text-muted-foreground" )} />
                        <span className="ml-1.5">{(isCurrentlyDrawingLiveOrDemo) ? "Now" : "Go to now"}</span>
                    </Button>
                </TooltipTrigger><TooltipContent><p>{(isCurrentlyDrawingLiveOrDemo) ? "Currently Live" : "Return to Live View"}</p></TooltipContent></Tooltip>
                {viewDomain && (
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={resetZoomAndPan} className="h-7 px-2">
                            <Scale className="h-4 w-4 mr-1.5" />
                            Reset View
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Reset zoom and pan</p></TooltipContent></Tooltip>
                )}
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleTimeShift('prev')} className="h-7 w-7" disabled={disablePrevButton}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Previous Time Window</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleTimeShift('next')} className="h-7 w-7" disabled={historicalTimeOffsetMs === 0}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Next Time Window</p></TooltipContent></Tooltip>
                <div className='flex items-center space-x-1.5 ml-1'>
                    {effectiveIsLive && historicalTimeOffsetMs === 0 && dpsAreConfigured && (
                        <div className="flex items-center px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-800/70 text-green-700 dark:text-green-300 text-[0.65rem] font-medium tracking-tighter">
                            <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600"></span></span>LIVE
                        </div>
                    )}
                    {effectiveUseDemoData && historicalTimeOffsetMs === 0 && dpsAreConfigured && (
                        <div className="flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800/70 text-blue-700 dark:text-blue-300 text-[0.65rem] font-medium tracking-tighter"> DEMO </div>
                    )}
                    {historicalTimeOffsetMs > 0 && dpsAreConfigured && <div className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800/70 text-amber-700 dark:text-amber-300 text-[0.65rem] font-medium tracking-tighter">HISTORICAL</div> }
                    {dpsAreConfigured && <span className='text-[0.7rem]'>Updated: {lastUpdatedDisplayTime}</span>}
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={animationKey + "-" + timelineSeries.map(s => s.id).join('-')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full h-[280px] sm:h-[300px]"
                >
                   {isGraphReady && dpsAreConfigured && (chartData.length > 0 || !isCurrentlyDrawingLiveOrDemo) ? (
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <ComposedChart
                            accessibilityLayer
                            data={chartData}
                            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                             <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={resolvedTheme === 'dark' ? 0.3 : 0.5} />
                            <XAxis dataKey="timestamp" type="number" domain={xAxisDomain as [number, number]} scale="time" tickFormatter={formatXAxisTick} tickLine={false} axisLine={false} tickMargin={8} minTickGap={timeScale === '1mo' || timeScale === '7d' ? 15 : 30} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))"/>
                            <YAxis yAxisId="left" domain={yAxisDomain} orientation="left" width={60} tickFormatter={yAxisTickFormatter} tickLine={false} axisLine={false} tickMargin={5} stroke="hsl(var(--muted-foreground))"/>

                            <ChartTooltip
                                cursor={{ stroke: "hsl(var(--foreground)/0.3)", strokeWidth: 1.5, strokeDasharray: '3 3' }}
                                wrapperStyle={{ outline: "none" }}
                                content={
                                    <ChartTooltipContent
                                        className="w-[240px] sm:w-[260px] tabular-nums"
                                        labelFormatter={(value, payload) => {
                                            if (!payload || payload.length === 0 || !payload[0]?.payload?.timestamp) return "Invalid Date";
                                            const ts = payload[0].payload.timestamp; const date = new Date(ts);
                                            const optionsBase: Intl.DateTimeFormatOptions = { hour: 'numeric', minute:'2-digit', hour12: true };
                                            const optionsWithSeconds: Intl.DateTimeFormatOptions = { ...optionsBase, second:'2-digit' };

                                            switch(timeScale){
                                                case '1mo': return date.toLocaleString([], { year:'numeric', month:'short', day:'numeric', ...optionsBase });
                                                case '7d': return date.toLocaleString([], { month:'short', day:'numeric', weekday:'short', ...optionsBase });
                                                case '1d': case '12h': case '6h': return date.toLocaleString([], { day:'numeric', month:'short', ...optionsWithSeconds });
                                                case '1h':  case '30m': case '5m': return date.toLocaleTimeString([], optionsWithSeconds);
                                                default: // 30s, 1m
                                                   return date.toLocaleTimeString([], {...optionsWithSeconds, fractionalSecondDigits: timeScale === '30s' || timeScale === '1m' ? 1: undefined } as any);
                                            }
                                        }}
                                        formatter={(value, name, item, index, payloadProp) => {
                                            const rawValueInWatts = value as number;
                                            const series = timelineSeries.find(s => s.id === item.dataKey);
                                            if (!series) return null;

                                            const displayUnit = (series.unit as PowerUnit) || 'W';
                                            const precision = series.precision ?? POWER_PRECISION[displayUnit];
                                            const displayValue = convertFromWatts(rawValueInWatts, displayUnit);

                                            const config = chartConfig[item.dataKey as string];
                                            if (!config) return null;

                                            const mainContent = (
                                                <div className="flex items-center gap-2.5">
                                                    {config.icon && <config.icon className="h-4 w-4 shrink-0" style={{ color: config.color }} />}
                                                    <div className="flex flex-1 justify-between leading-none">
                                                        <span className="text-muted-foreground">{config.label}</span>
                                                        <span className="font-bold" style={{ color: config.color }}>
                                                            {displayValue.toFixed(precision)} <span className="ml-1 font-normal text-muted-foreground">{displayUnit}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            );

                                            const currentPoint = item.payload as ChartDataPoint;
                                            const isLastItem = Array.isArray(payloadProp) && index === payloadProp.length - 1;

                                            if (isLastItem) {
                                                const totalGenerationW = timelineSeries
                                                    .filter(s => s.role === 'generation')
                                                    .reduce((sum, s) => sum + (currentPoint[s.id] || 0), 0);

                                                const totalUsageW = timelineSeries
                                                    .filter(s => s.role === 'usage')
                                                    .reduce((sum, s) => sum + (currentPoint[s.id] || 0), 0);

                                                const netPowerW = totalGenerationW - totalUsageW;
                                                const { unit: displayUnit, value: displayValue } = formatPowerForDisplay(netPowerW);

                                                const netPowerConfig = chartConfig['netPower'];
                                                const netColor = netPowerW >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))";

                                                return (
                                                    <div key={`${name as string}-${index}-with-net`}>
                                                        {mainContent}
                                                        <div className="flex items-center gap-2.5 border-t border-border/50 pt-1.5 mt-1.5 text-xs" key="net-power-footer">
                                                            {netPowerConfig?.icon && <netPowerConfig.icon className="h-4 w-4 shrink-0" style={{ color: netColor }} />}
                                                            <div className="flex flex-1 justify-between leading-none">
                                                                <span className="text-muted-foreground">{netPowerConfig?.label || "Net Power"}</span>
                                                                <span className="font-bold" style={{color: netColor}}>
                                                                   {displayValue} <span className="ml-1 font-normal text-muted-foreground">{displayUnit}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return mainContent;
                                        }}
                                    />
                                }
                            />
                            { chartData.length > 3 &&
                              <ChartLegend
                                onClick={handleLegendClick}
                                payload={drawableSeries.map(series => ({
                                    id: series.id,
                                    dataKey: series.id,
                                    value: series.name,
                                    type: "line",
                                    color: series.color,
                                    inactive: !seriesVisibility[series.id],
                                }))}
                                content={<ChartLegendContent className="mt-1 -mb-1 text-xs" />}
                              />
                            }
                            <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--foreground)/0.3)" strokeDasharray="3 3" strokeWidth={1}/>

                            {drawableSeries.map(series => {
                                if (series.displayType === 'area') {
                                    return (
                                        <Area
                                            key={series.id}
                                            yAxisId="left"
                                            dataKey={series.id}
                                            name={series.name}
                                            type="monotone"
                                            stroke={series.color}
                                            fill={series.color}
                                            fillOpacity={0.2}
                                            strokeWidth={2.2}
                                            dot={false}
                                            activeDot={{ r: 4, stroke: series.color }}
                                            isAnimationActive={isGraphReady && isCurrentlyDrawingLiveOrDemo}
                                            animationDuration={effectiveUseDemoData ? 200 : 120}
                                            connectNulls={false}
                                        />
                                    );
                                }
                                return (
                                    <Line
                                        key={series.id}
                                        yAxisId="left"
                                        dataKey={series.id}
                                        name={series.name}
                                        type="monotone"
                                        stroke={series.color}
                                        strokeWidth={2.2}
                                        dot={false}
                                        activeDot={{ r: 4, fillOpacity: 0.7 }}
                                        isAnimationActive={isGraphReady && isCurrentlyDrawingLiveOrDemo}
                                        animationDuration={effectiveUseDemoData ? 200 : 120}
                                        connectNulls={false}
                                    />
                                );
                            })}

                            {gridFeedSegments.map((segment, index) => (
                                <Line
                                    key={`gridFeed-segment-${segment.seriesId}-${segment.type}-${index}`}
                                    yAxisId="left"
                                    dataKey={segment.seriesId}
                                    data={segment.data}
                                    type="monotone"
                                    stroke={segment.type === 'export' ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                                    strokeWidth={2.2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    isAnimationActive={isGraphReady && isCurrentlyDrawingLiveOrDemo}
                                    animationDuration={effectiveUseDemoData ? 200 : 120}
                                    connectNulls={false}
                                    legendType="none"
                                />
                            ))}
                        </ComposedChart>
                    </ChartContainer>
                     ) : null }
                </motion.div>
            </AnimatePresence>
        </motion.div>
    </TooltipProvider>
    );
};

// --- Helper Functions ---

function formatPowerForDisplay(watts: number): { value: string; unit: PowerUnit } {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000000) {
        return { value: (watts / 1000000).toFixed(2), unit: 'MW' };
    }
    if (absWatts >= 1000) {
        return { value: (watts / 1000).toFixed(2), unit: 'kW' };
    }
    return { value: watts.toFixed(0), unit: 'W' };
}

function getSimulatedHistoricalWindData(timeScale: TimeScale, currentDate: Date, maxWindOutputW: number) {
    const now = currentDate.getTime();
    const { durationMs } = timeScaleConfig[timeScale];
    const dataPoints: { timestamp: number; value: number }[] = [];
    const pointCount = Math.min(100, Math.max(10, Math.floor(durationMs / (5 * 60 * 1000))));

    for (let i = 0; i < pointCount; i++) {
        const timestamp = now - durationMs + (i * durationMs / pointCount);
        const timeOfDayMinutes = new Date(timestamp).getHours() * 60 + new Date(timestamp).getMinutes();
        const windTimePattern = Math.sin((timeOfDayMinutes / (24 * 60)) * 2 * Math.PI + Math.PI) * 0.3 + 0.7;
        const windVariability = Math.sin((timestamp / (30 * 60 * 1000)) * 2 * Math.PI) * 0.4 + 0.6;
        const windNoise = (Math.random() - 0.5) * 0.3;
        let windFactor = Math.max(0, Math.min(1, windTimePattern * windVariability + windNoise));
        
        dataPoints.push({
            timestamp,
            value: windFactor * maxWindOutputW // Value is in Watts
        });
    }
    
    return { generation: dataPoints };
}

function generateUsageData(timestamp: number, baseUsageW: number, variationW: number): number {
    const timeOfDayMinutes = new Date(timestamp).getHours() * 60 + new Date(timestamp).getMinutes();
    const morningPeak = Math.exp(-Math.pow(timeOfDayMinutes - 7.5 * 60, 2) / (2 * Math.pow(60, 2)));
    const eveningPeak = Math.exp(-Math.pow(timeOfDayMinutes - 18.5 * 60, 2) / (2 * Math.pow(60, 2)));
    const peakUsage = (morningPeak + eveningPeak * 1.2) * variationW;
    const randomVariation = (Math.random() - 0.5) * variationW * 0.3;
    const totalUsageW = baseUsageW + peakUsage + randomVariation;
    return Math.max(100, totalUsageW); // Return value in Watts
}

export default PowerTimelineGraph;
