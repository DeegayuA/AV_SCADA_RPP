// components/PowerTimelineGraph.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, LegendType } from 'recharts';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces';
import { DataPoint } from '@/config/dataPoints';
import { useTheme } from 'next-themes';
import {
    Loader2, Zap, ShoppingCart, Send, Leaf, AlertTriangleIcon, ArrowRightToLine,
    ArrowLeftFromLine, PlugZap, RadioTower, ChevronLeft, ChevronRight, Scale,
    TrendingDown, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = '30s' | '1m' | '5m' | '30m' | '1h' | '6h' | '12h' | '1d' | '7d' | '1mo';

// --- Component Constants ---
const CHART_TARGET_UNIT: PowerUnit = 'kW';
const POWER_PRECISION: Record<PowerUnit, number> = { 'W': 0, 'kW': 2, 'MW': 3, 'GW': 4 };
const MAX_POINTS_FOR_RECHARTS = 750;
const MIN_BUFFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const BUFFER_DURATION_MULTIPLIER = 15;

const baseChartConfig = {
    generation: { label: "Generation", icon: Zap, color: "hsl(var(--chart-1))", directFallback: "skyblue" },
    usage:    { label: "Usage", icon: ShoppingCart, color: "hsl(var(--chart-2))", directFallback: "orange" },
    gridFeed: { label: "Grid Flow", icon: Send, color: "hsl(var(--chart-3))", directFallback: "mediumpurple" },
    netPower: { label: "Net Power", icon: Scale, color: "hsl(var(--chart-5))", directFallback: "slateblue" }
} satisfies ChartConfig & Record<string, { directFallback?: string }>;
type ActualLineKey = keyof Pick<typeof baseChartConfig, "generation" | "usage" | "gridFeed">;

const CSS_VAR_CACHE = new Map<string, string>();
let currentThemeForCache: string | undefined = undefined;

const getResolvedColor = (
    colorName: keyof typeof baseChartConfig | 'net' | 'destructive' | 'success' | 'backgroundDefault' | 'backgroundSuccess' | 'backgroundDestructive',
    theme?: string
): string => {
    const activeTheme = theme || (typeof window !== 'undefined' ? (document.documentElement.classList.contains('dark') ? 'dark' : 'light') : 'light');

    if (currentThemeForCache !== activeTheme) {
        CSS_VAR_CACHE.clear();
        currentThemeForCache = activeTheme;
    }

    const cacheKey = `${colorName}-${activeTheme}`;
    if (CSS_VAR_CACHE.has(cacheKey)) {
        return CSS_VAR_CACHE.get(cacheKey)!;
    }

    if (typeof window === 'undefined' || !document.documentElement.style.getPropertyValue('--primary')) {
        const ssrFallbacks: Record<string, string> = {
            generation: "hsl(200,80%,50%)", usage: "hsl(40,90%,50%)", gridFeed: "hsl(280,70%,60%)",
            netPower: "hsl(250, 70%, 60%)", net: "hsl(120,70%,45%)", destructive: "hsl(0,70%,50%)",
            success: "hsl(120,60%,40%)", backgroundDefault: activeTheme === 'dark' ? "hsl(0,0%,10%)" : "hsl(0, 0%, 98%)",
            backgroundSuccess: activeTheme === 'dark' ? "hsla(120,60%,50%,0.1)" : "hsla(120,60%,50%,0.05)",
            backgroundDestructive: activeTheme === 'dark' ? "hsla(0,70%,50%,0.1)" : "hsla(0,70%,50%,0.05)"
        };
        return ssrFallbacks[colorName as string] || "hsl(0,0%,50%)";
    }

    const style = getComputedStyle(document.documentElement);
    let resolvedColorValue: string | undefined;

    const colorMappings: Partial<Record<typeof colorName, { cssVar?: string; direct?: string }>> = {
        'destructive': { cssVar: '--destructive', direct: 'hsl(0, 72%, 51%)' },
        'success': { cssVar: '--success', direct: 'hsl(142, 71%, 45%)' },
        'net': { direct: 'hsl(120, 70%, 45%)' },
    };

    const mappedColorInfo = colorMappings[colorName as keyof typeof colorMappings];
    if (mappedColorInfo?.cssVar) {
        const hslValue = style.getPropertyValue(mappedColorInfo.cssVar).trim();
        if (hslValue) resolvedColorValue = hslValue.startsWith("hsl") ? hslValue : `hsl(${hslValue})`;
        if (!resolvedColorValue) resolvedColorValue = mappedColorInfo.direct;
    } else if (baseChartConfig[colorName as keyof typeof baseChartConfig]) {
        const chartConfigEntry = baseChartConfig[colorName as keyof typeof baseChartConfig];
        const match = chartConfigEntry?.color?.match(/var\((--chart-\d+)\)/);
        if (match?.[1]) {
            const hslValue = style.getPropertyValue(match[1]).trim();
            if (hslValue) resolvedColorValue = hslValue.startsWith("hsl") ? hslValue : `hsl(${hslValue})`;
        }
        if (!resolvedColorValue && chartConfigEntry.color?.startsWith("hsl")) resolvedColorValue = chartConfigEntry.color;
        if (!resolvedColorValue) resolvedColorValue = chartConfigEntry.directFallback;
    }

    if (!resolvedColorValue) {
        if (colorName === 'backgroundDefault') {
            const bgVal = style.getPropertyValue('--background').trim();
            resolvedColorValue = `hsl(${bgVal})`;
        } else if (colorName === 'backgroundSuccess') {
            const successHSLValues = style.getPropertyValue('--success')?.trim() || '130 60% 40%';
            resolvedColorValue = `hsla(${successHSLValues} / ${activeTheme === 'dark' ? 0.12 : 0.07})`;
        } else if (colorName === 'backgroundDestructive') {
            const destructiveHSLValues = style.getPropertyValue('--destructive')?.trim() || '0 70% 50%';
            resolvedColorValue = `hsla(${destructiveHSLValues} / ${activeTheme === 'dark' ? 0.12 : 0.07})`;
        }
    }

    if (!resolvedColorValue) {
        let fallback: string | undefined;
        const cName = colorName as string;
        const mappedColor = colorMappings[cName as keyof typeof colorMappings];
        if (mappedColor?.direct) {
            fallback = mappedColor.direct;
        } else {
             const baseConfigEntry = baseChartConfig[cName as keyof typeof baseChartConfig];
             if (baseConfigEntry?.directFallback) {
                fallback = baseConfigEntry.directFallback;
             }
        }
        resolvedColorValue = fallback || "hsl(0,0%,50%)";
    }

    CSS_VAR_CACHE.set(cacheKey, resolvedColorValue);
    return resolvedColorValue;
};


const AnimatedNumber = ({ value, precision }: { value: number; precision: number }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 100, damping: 20 });
    const display = useTransform(spring, (current) => parseFloat(current.toFixed(precision)));
    useEffect(() => { spring.set(value); }, [spring, value]);
    return <motion.span>{display}</motion.span>;
};

interface ChartDataPoint {
    timestamp: number; generation: number; usage: number; gridFeed: number; isSelfSufficient?: boolean;
}
interface GridFeedSegment { type: 'export' | 'import'; data: ChartDataPoint[]; }
interface PowerTimelineGraphProps {
    nodeValues: NodeData; allPossibleDataPoints: DataPoint[]; generationDpIds: string[];
    usageDpIds: string[]; exportDpIds: string[]; windDpIds: string[]; exportMode: 'auto' | 'manual';
    timeScale: TimeScale; isLiveSourceAvailable?: boolean; useDemoDataSource?: boolean; useWindDemoDataSource?: boolean;
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

const  PowerTimelineGraph: React.FC<PowerTimelineGraphProps> = ({
    nodeValues, allPossibleDataPoints, generationDpIds, usageDpIds, exportDpIds, windDpIds,
    exportMode, timeScale, isLiveSourceAvailable = true, useDemoDataSource = false, useWindDemoDataSource = false,
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

    const [isForcedLiveUiButtonActive, setIsForcedLiveUiButtonActive] = useState(false);
    const [visibleLines, setVisibleLines] = useState<Record<ActualLineKey, boolean>>({ generation: true, usage: true, gridFeed: true });
    const [historicalTimeOffsetMs, setHistoricalTimeOffsetMs] = useState(0);

    const previousTimeScaleRef = useRef(timeScale);
    useEffect(() => {
      if (previousTimeScaleRef.current !== timeScale) {
        setIsForcedLiveUiButtonActive(false);
        setHistoricalTimeOffsetMs(0);
        previousTimeScaleRef.current = timeScale;
        setAnimationKey(Date.now());
      }
    }, [timeScale]);

    const effectiveUseDemoData = useMemo(() => (useDemoDataSource || useWindDemoDataSource) && !isForcedLiveUiButtonActive && historicalTimeOffsetMs === 0, [useDemoDataSource, useWindDemoDataSource, isForcedLiveUiButtonActive, historicalTimeOffsetMs]);
    const effectiveIsLive = useMemo(() => (isLiveSourceAvailable || isForcedLiveUiButtonActive) && !effectiveUseDemoData && historicalTimeOffsetMs === 0, [isLiveSourceAvailable, isForcedLiveUiButtonActive, effectiveUseDemoData, historicalTimeOffsetMs]);

    const processDataPoint = useCallback((timestamp: number, gen: number, use: number, gridFeedVal: number): ChartDataPoint => {
      return {
        timestamp,
        generation: parseFloat(gen.toFixed(valuePrecision)),
        usage: parseFloat(use.toFixed(valuePrecision)),
        gridFeed: parseFloat(gridFeedVal.toFixed(valuePrecision)),
        isSelfSufficient: gridFeedVal >= 0
      };
    }, [valuePrecision]);

    const generateDemoValues = useCallback(() => {
        const now = new Date(); const totalMinutesInDay = now.getHours() * 60 + now.getMinutes(); const peakSolarTime = 13 * 60; const solarActivityStart = 6.0 * 60; const solarActivityEnd = 19.0 * 60; let solarPotentialFactor = 0; if (totalMinutesInDay >= solarActivityStart && totalMinutesInDay <= solarActivityEnd) { solarPotentialFactor = Math.sin((totalMinutesInDay - solarActivityStart) * Math.PI / (solarActivityEnd - solarActivityStart)); solarPotentialFactor = Math.max(0, solarPotentialFactor); } const maxSolarOutputW = 12000; const cloudCycle1Minutes = 180; const cloudPhase1 = (totalMinutesInDay / cloudCycle1Minutes) * 2 * Math.PI; const cloudEffect1 = (Math.sin(cloudPhase1 + Math.PI/4) + 1) / 2; const cloudCycle2Minutes = 75;  const cloudPhase2 = (totalMinutesInDay / cloudCycle2Minutes) * 2 * Math.PI; const cloudEffect2 = (Math.sin(cloudPhase2) + 1) / 2; let combined_cloud_density = (cloudEffect1 * 0.6 + cloudEffect2 * 0.4); const dailyWeatherTypeCycleMinutes = 24 * 60; const dailyWeatherPhase = (totalMinutesInDay / dailyWeatherTypeCycleMinutes) * 2 * Math.PI + Math.PI; const daily_max_cloud_impact = 0.6 + ((Math.sin(dailyWeatherPhase) + 1) / 2) * 0.4; let final_cloud_cover_effect = combined_cloud_density * daily_max_cloud_impact; final_cloud_cover_effect = Math.min(0.95, Math.max(0, final_cloud_cover_effect)); const weatherGenerationFactor = 1.0 - final_cloud_cover_effect; let demoSolarGenerationW = solarPotentialFactor * maxSolarOutputW * weatherGenerationFactor; demoSolarGenerationW += (Math.sin(totalMinutesInDay / 5 * Math.PI * 2) * 25); demoSolarGenerationW = Math.max(0, demoSolarGenerationW); const baseUsageW_target = 600 + (Math.sin(totalMinutesInDay / (120) * Math.PI * 2) * 200); const morningPeakTime = 7.5 * 60; const eveningPeakTime = 18.5 * 60; const usageSpread = 1.2 * 60; const morningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - morningPeakTime, 2) / (2 * Math.pow(usageSpread, 2))); const eveningUsageFactor = Math.exp(-Math.pow(totalMinutesInDay - eveningPeakTime, 2) / (2 * Math.pow(usageSpread, 2))); const peakUsageIncreaseW_target = 2000 + (Math.sin(totalMinutesInDay / (240) * Math.PI * 2 + Math.PI/2) * 1000); let targetDemoUsageW = baseUsageW_target + (morningUsageFactor * peakUsageIncreaseW_target) + (eveningUsageFactor * peakUsageIncreaseW_target * 1.1); targetDemoUsageW += (Math.sin(totalMinutesInDay / 30 * Math.PI * 2) * 150); targetDemoUsageW = Math.max(200, targetDemoUsageW); let currentDemoUsageW: number; const smoothingFactor = 0.1; if (prevDemoUsageRef.current === null) { currentDemoUsageW = targetDemoUsageW; } else { currentDemoUsageW = prevDemoUsageRef.current + smoothingFactor * (targetDemoUsageW - prevDemoUsageRef.current); } prevDemoUsageRef.current = currentDemoUsageW; let demoGridFeedW = 0; const windTimePattern = Math.sin((totalMinutesInDay / (24 * 60)) * 2 * Math.PI + Math.PI) * 0.3 + 0.7; const windVariability = Math.sin((totalMinutesInDay / (30 * 60)) * 2 * Math.PI) * 0.4 + 0.6; const windNoise = (Math.random() - 0.5) * 0.3; let windFactor = windTimePattern * windVariability + windNoise; windFactor = Math.max(0, Math.min(1, windFactor)); const maxWindOutputW = 15000; let demoWindGenerationW = windFactor * maxWindOutputW; const demoGenerationW = demoSolarGenerationW + demoWindGenerationW; const netLocalW = demoGenerationW - currentDemoUsageW; if (exportMode === 'auto') { demoGridFeedW = netLocalW; } else { if (netLocalW < -500) { demoGridFeedW = netLocalW * (0.7 + (Math.sin(totalMinutesInDay / 15 * Math.PI) + 1) / 2 * 0.3); } else if (netLocalW > 500) { demoGridFeedW = netLocalW * (0.5 + (Math.sin(totalMinutesInDay / 20 * Math.PI + 0.5) + 1) / 2 * 0.5); } else { demoGridFeedW = (Math.sin(totalMinutesInDay / 10 * Math.PI) * 500); } }
        return { generation: convertFromWatts(demoGenerationW, CHART_TARGET_UNIT), usage: convertFromWatts(currentDemoUsageW, CHART_TARGET_UNIT), gridFeed: convertFromWatts(demoGridFeedW, CHART_TARGET_UNIT), };
    }, [exportMode, CHART_TARGET_UNIT]);

    const sumValuesForDpIds = useCallback((dpIdsToSum: string[]): number => {
        if (!allPossibleDataPoints?.length || !nodeValues || Object.keys(nodeValues).length === 0) {
            return 0;
        }
        let sumInWatts = 0;
        dpIdsToSum.forEach(dpId => {
            const dp = allPossibleDataPoints.find(p => p.id === dpId);
            if (dp) {
                const rawValueFromNode = nodeValues[dp.nodeId];
                let numericValue = 0;
                let unitForConversion = dp.unit;
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
        return convertFromWatts(sumInWatts, CHART_TARGET_UNIT);
    }, [nodeValues, allPossibleDataPoints, CHART_TARGET_UNIT]);

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
    }, [timeScale, generationDpIds, usageDpIds, exportDpIds, exportMode, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs]);

    useEffect(() => {
      const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;
      if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }

      if (effectiveUseDemoData) {
          const demoIngestInterval = 1000;
          const generateAndBufferDemo = () => {
              const demo = useWindDemoDataSource ? { generation: getSimulatedHistoricalWindData(timeScale, new Date(), 15000).generation[0].value, usage: generateUsageData(Date.now(), 600, 200), gridFeed: 0 } : generateDemoValues();
              dataBufferRef.current.push(processDataPoint(Date.now(), demo.generation, demo.usage, demo.gridFeed));
          };
          if (dpsConfigured) {
            if (dataBufferRef.current.length === 0) generateAndBufferDemo();
            demoDataIngestTimer.current = setInterval(generateAndBufferDemo, demoIngestInterval);
          }
      } else if (effectiveIsLive && dpsConfigured && allPossibleDataPoints?.length > 0 && nodeValues && Object.keys(nodeValues).length > 0) {
          const currentTimestamp = Date.now();
          let currentGen = sumValuesForDpIds(generationDpIds);
          let currentUse = sumValuesForDpIds(usageDpIds);
          let currentGridFeedVal = (exportMode === 'manual' && exportDpIds.length > 0)
                                   ? sumValuesForDpIds(exportDpIds)
                                   : (currentGen - currentUse);
          dataBufferRef.current.push(processDataPoint(currentTimestamp, currentGen, currentUse, currentGridFeedVal));
      }

      return () => { if (demoDataIngestTimer.current) { clearInterval(demoDataIngestTimer.current); demoDataIngestTimer.current = null; }};
    }, [nodeValues, generationDpIds, usageDpIds, exportDpIds, exportMode, allPossibleDataPoints, sumValuesForDpIds, generateDemoValues, effectiveIsLive, effectiveUseDemoData, processDataPoint]);

    useEffect(() => {
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;

        const aggregateData = (rawData: ChartDataPoint[], intervalMs: number): ChartDataPoint[] => {
            if (!intervalMs || rawData.length === 0) return rawData;
            const aggregated: ChartDataPoint[] = [];
            let bucketStart = Math.floor(rawData[0].timestamp / intervalMs) * intervalMs;
            let currentBucketPoints: ChartDataPoint[] = [];

            for (const point of rawData) {
                if (point.timestamp >= bucketStart + intervalMs) {
                    if (currentBucketPoints.length > 0) {
                        const avgGeneration = currentBucketPoints.reduce((sum, p) => sum + p.generation, 0) / currentBucketPoints.length;
                        const avgUsage = currentBucketPoints.reduce((sum, p) => sum + p.usage, 0) / currentBucketPoints.length;
                        const avgGridFeed = currentBucketPoints.reduce((sum, p) => sum + p.gridFeed, 0) / currentBucketPoints.length;
                        aggregated.push(processDataPoint(bucketStart + intervalMs / 2, avgGeneration, avgUsage, avgGridFeed));
                    }
                    bucketStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
                    currentBucketPoints = [point];
                } else {
                    currentBucketPoints.push(point);
                }
            }
            if (currentBucketPoints.length > 0) {
                const avgGeneration = currentBucketPoints.reduce((sum, p) => sum + p.generation, 0) / currentBucketPoints.length;
                const avgUsage = currentBucketPoints.reduce((sum, p) => sum + p.usage, 0) / currentBucketPoints.length;
                const avgGridFeed = currentBucketPoints.reduce((sum, p) => sum + p.gridFeed, 0) / currentBucketPoints.length;
                aggregated.push(processDataPoint(bucketStart + intervalMs / 2, avgGeneration, avgUsage, avgGridFeed));
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
    }, [timeScale, isGraphReady, generationDpIds, usageDpIds, effectiveIsLive, effectiveUseDemoData, historicalTimeOffsetMs, processDataPoint, sumValuesForDpIds, nodeValues]);

    const currentValues = useMemo(() => {
        let liveGen = 0, liveUse = 0, liveGridFeedVal = 0;
        let currentTimestamp = Date.now();
        let isSufficient = false;
        const dpsConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;

        if (historicalTimeOffsetMs > 0 && chartData.length > 0) {
            const lastPointInView = chartData[chartData.length -1];
            if (lastPointInView) {
                liveGen = lastPointInView.generation;
                liveUse = lastPointInView.usage;
                liveGridFeedVal = lastPointInView.gridFeed;
                currentTimestamp = lastPointInView.timestamp;
                isSufficient = lastPointInView.isSelfSufficient ?? liveGridFeedVal >= 0;
            }
        } else if (effectiveUseDemoData && dpsConfigured) {
            const lastDemoPoint = dataBufferRef.current.length > 0 ? dataBufferRef.current[dataBufferRef.current.length - 1] : null;
            if (lastDemoPoint && lastDemoPoint.timestamp > Date.now() - 5000) {
                liveGen = lastDemoPoint.generation; liveUse = lastDemoPoint.usage; liveGridFeedVal = lastDemoPoint.gridFeed;
            } else {
                const demo = generateDemoValues();
                liveGen = demo.generation; liveUse = demo.usage; liveGridFeedVal = demo.gridFeed;
            }
            isSufficient = liveGridFeedVal >= 0;
        } else if (effectiveIsLive && dpsConfigured && nodeValues && Object.keys(nodeValues).length > 0 && allPossibleDataPoints && allPossibleDataPoints.length > 0) {
            liveGen = sumValuesForDpIds(generationDpIds) + sumValuesForDpIds(windDpIds);
            liveUse = sumValuesForDpIds(usageDpIds);
            if (exportMode === 'manual' && exportDpIds.length > 0) {
                liveGridFeedVal = sumValuesForDpIds(exportDpIds);
            } else {
                liveGridFeedVal = liveGen - liveUse;
            }
            isSufficient = liveGridFeedVal >= 0;
        } else if (chartData.length > 0) {
            const pointSource = chartData[chartData.length - 1];
            liveGen = pointSource.generation; liveUse = pointSource.usage; liveGridFeedVal = pointSource.gridFeed;
            currentTimestamp = pointSource.timestamp; isSufficient = pointSource.isSelfSufficient ?? liveGridFeedVal >= 0;
        } else if (dataBufferRef.current.length > 0 && !dpsConfigured) {
             const pointSource = dataBufferRef.current[dataBufferRef.current.length - 1];
             liveGen = pointSource.generation; liveUse = pointSource.usage; liveGridFeedVal = pointSource.gridFeed;
             currentTimestamp = pointSource.timestamp; isSufficient = pointSource.isSelfSufficient ?? liveGridFeedVal >= 0;
        }

        return {
            generation: parseFloat(liveGen.toFixed(valuePrecision)),
            usage: parseFloat(liveUse.toFixed(valuePrecision)),
            gridFeed: parseFloat(liveGridFeedVal.toFixed(valuePrecision)),
            timestamp: currentTimestamp, isSelfSufficient: isSufficient,
        };
    }, [
        nodeValues, allPossibleDataPoints, chartData, generationDpIds, usageDpIds, exportDpIds, exportMode,
        valuePrecision, sumValuesForDpIds, generateDemoValues, effectiveIsLive, effectiveUseDemoData,
        historicalTimeOffsetMs, dataBufferRef.current.length
    ]);

    const chartBackgroundFill = useMemo(() => {
        const baseColorKey = currentValues.isSelfSufficient ? 'backgroundSuccess' : 'backgroundDestructive';
        return getResolvedColor(baseColorKey, resolvedTheme);
    }, [currentValues.isSelfSufficient, resolvedTheme]);

    // --- UPDATED formatXAxisTick to consistently use 12-hour format with AM/PM ---
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

    const xAxisDomain = useMemo(():[number,number|'dataMax'] => {
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
        const activeDataForDomain = chartData.length > 0 ? chartData :
                                    (dataBufferRef.current.length > 0 ?
                                     [dataBufferRef.current[dataBufferRef.current.length -1]] : []);
        let vals: number[] = [];
        activeDataForDomain.forEach(d => {
            if (visibleLines.generation) vals.push(d.generation);
            if (visibleLines.usage) vals.push(d.usage);
            if (visibleLines.gridFeed) vals.push(d.gridFeed);
        });
        if (vals.length === 0 && (effectiveIsLive || effectiveUseDemoData)) {
             if (visibleLines.generation) vals.push(currentValues.generation);
             if (visibleLines.usage) vals.push(currentValues.usage);
             if (visibleLines.gridFeed) vals.push(currentValues.gridFeed);
        }
        const finiteVals = vals.filter(v => typeof v === 'number' && isFinite(v));
        const defMinY = CHART_TARGET_UNIT === 'kW' ? -5 : -5000;
        const defMaxY = CHART_TARGET_UNIT === 'kW' ? 20 : 20000;
        if(finiteVals.length === 0) return [defMinY, defMaxY];
        let minV = Math.min(...finiteVals);
        let maxV = Math.max(...finiteVals);
        if (minV === maxV) {
            const singleValuePad = CHART_TARGET_UNIT === 'kW' ? 1 : (CHART_TARGET_UNIT === 'W' ? 100 : 0.1);
            minV = minV - singleValuePad;
            maxV = maxV + singleValuePad;
        } else {
            const range = maxV - minV;
            const padding = Math.max(range * 0.1, CHART_TARGET_UNIT === 'kW' ? 0.5 : 50);
            minV = minV - padding;
            maxV = maxV + padding;
        }
        if (minV > 0 && minV < (CHART_TARGET_UNIT === 'kW' ? 2 : 200)) minV = Math.min(0, minV);
        if (maxV < 0 && maxV > (CHART_TARGET_UNIT === 'kW' ? -2 : -200)) maxV = Math.max(0, maxV);
        return [Math.floor(minV), Math.ceil(maxV)];
    },[chartData, currentValues, CHART_TARGET_UNIT, visibleLines, effectiveIsLive, effectiveUseDemoData, dataBufferRef.current.length]);

    const isCurrentlyDrawingLiveOrDemo = (effectiveIsLive || effectiveUseDemoData) && historicalTimeOffsetMs === 0;

    const handleLineToggle = (lineKey: ActualLineKey) => {
      const currentlyVisibleCount = Object.values(visibleLines).filter(v => v).length;
      const isThisLineOnlyVisible = visibleLines[lineKey] && currentlyVisibleCount === 1;
       if (isThisLineOnlyVisible) {
           setVisibleLines({ generation: true, usage: true, gridFeed: true });
       } else {
           setVisibleLines({ generation: false, usage: false, gridFeed: false, [lineKey]: true });
       }
    };

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
        // const shiftAmount = durationMs / 2; // Not needed for the disable check directly
        const currentWindowStartTime = (Date.now() - historicalTimeOffsetMs) - durationMs;
        // Disable if the current window's start is already at or before the oldest data point
        return currentWindowStartTime <= oldestDataPointTimestamp;
    }, [isCurrentlyDrawingLiveOrDemo, historicalTimeOffsetMs, timeScale, dataBufferRef.current.length > 0 ? dataBufferRef.current[0]?.timestamp : null]);


    const headerDisplayItems: {key: ActualLineKey; label: string; icon: React.ElementType, value: number, isEffectivelyVisible: boolean }[] = [
        { key: 'generation', label: baseChartConfig.generation.label, icon: baseChartConfig.generation.icon, value: currentValues.generation, isEffectivelyVisible: visibleLines.generation },
        { key: 'usage', label: baseChartConfig.usage.label, icon: baseChartConfig.usage.icon, value: currentValues.usage, isEffectivelyVisible: visibleLines.usage },
        { key: 'gridFeed', label: baseChartConfig.gridFeed.label, icon: Send, value: currentValues.gridFeed, isEffectivelyVisible: visibleLines.gridFeed },
    ];

    const gridFeedSegments = useMemo((): GridFeedSegment[] => {
      if (!chartData || chartData.length < 1) return [];
      const segments: GridFeedSegment[] = [];
      let currentSegment: ChartDataPoint[] | null = null;
      let currentSegmentType: 'export' | 'import' | null = null;
      for (let i = 0; i < chartData.length; i++) {
        const point = chartData[i];
        const pointType = point.gridFeed >= 0 ? 'export' : 'import';
        if (currentSegmentType !== pointType) {
          if (currentSegment && currentSegment.length > 0) {
            segments.push({ type: currentSegmentType!, data: currentSegment });
          }
          currentSegment = [];
          currentSegmentType = pointType;
          if (i > 0) {
            const prevPoint = chartData[i-1];
            if ((prevPoint.gridFeed >=0 && point.gridFeed < 0) || (prevPoint.gridFeed < 0 && point.gridFeed >=0)) {
              const t0 = prevPoint.timestamp, t1 = point.timestamp;
              const v0 = prevPoint.gridFeed, v1 = point.gridFeed;
              if (t1 === t0 || v1 === v0) {
                 const lastPushedSegment = segments[segments.length-1];
                 if(lastPushedSegment && lastPushedSegment.data.length > 0 && lastPushedSegment.data[lastPushedSegment.data.length-1].timestamp !== prevPoint.timestamp) {
                    lastPushedSegment.data.push({...prevPoint, gridFeed: 0});
                 }
                 if(currentSegment && currentSegment.length === 0){
                    currentSegment.push({...prevPoint, gridFeed:0});
                 }
              } else {
                const tZero = t0 + (t1 - t0) * (-v0 / (v1 - v0));
                const factor = (t1 - t0 === 0) ? 0 : (tZero - t0) / (t1 - t0);
                const interpolatedPoint: ChartDataPoint = {
                  timestamp: tZero,
                  generation: prevPoint.generation + (point.generation - prevPoint.generation) * factor,
                  usage: prevPoint.usage + (point.usage - prevPoint.usage) * factor,
                  gridFeed: 0,
                  isSelfSufficient: true,
                };
                const lastPushedSegment = segments[segments.length-1];
                if(lastPushedSegment) lastPushedSegment.data.push(interpolatedPoint);
                currentSegment.push(interpolatedPoint);
              }
            }
          }
        }
        if(currentSegment) currentSegment.push(point);
      }
      if (currentSegment && currentSegment.length > 0 && currentSegmentType) {
        segments.push({ type: currentSegmentType, data: currentSegment });
      }
      return segments;
    }, [chartData]);

    type CustomLegendPayload = {
        value: React.ReactNode;
        id?: string;
        type?: LegendType;
        color?: string;
        payload?: any; // Recharts uses this internally, can store related data for legend items
        dataKey?: string | number; // Essential for ChartLegendContent to map to chartConfig
        inactive?: boolean;
    };

    const legendPayloadForChartLegend = useMemo((): CustomLegendPayload[] => {
        const itemsToShow: CustomLegendPayload[] = [];

        if (visibleLines.generation) {
            itemsToShow.push({
                dataKey: 'generation',
                value: baseChartConfig.generation.label,
                color: getResolvedColor('generation', resolvedTheme),
                type: 'line',
                inactive: !visibleLines.generation,
                payload: { icon: baseChartConfig.generation.icon, label: baseChartConfig.generation.label }
            });
        }
        if (visibleLines.usage) {
            itemsToShow.push({
                dataKey: 'usage',
                value: baseChartConfig.usage.label,
                color: getResolvedColor('usage', resolvedTheme),
                type: 'line',
                inactive: !visibleLines.usage,
                payload: { icon: baseChartConfig.usage.icon, label: baseChartConfig.usage.label }
            });
        }
        if (visibleLines.gridFeed) {
            itemsToShow.push({
                dataKey: 'gridFeed',
                value: baseChartConfig.gridFeed.label,
                color: getResolvedColor('gridFeed', resolvedTheme), // Base color for legend
                type: 'line',
                inactive: !visibleLines.gridFeed,
                payload: { icon: baseChartConfig.gridFeed.icon, label: baseChartConfig.gridFeed.label }
            });
        }
        return itemsToShow;
    }, [visibleLines, resolvedTheme]);


    const dpsAreConfigured = generationDpIds.length > 0 && usageDpIds.length > 0;

    if (!effectiveUseDemoData && !dpsAreConfigured) {
        return <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">Please configure Generation and Usage data points.</div>;
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
                currentValues.isSelfSufficient ? "border-green-400/60 dark:border-green-500/70" : "border-red-400/60 dark:border-red-500/70"
            )}
            style={{ backgroundColor: chartBackgroundFill }}
            animate={{ backgroundColor: chartBackgroundFill }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs sm:text-sm mb-2 px-1">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 items-stretch">
                {headerDisplayItems.map(item => {
                    let itemColor: string;
                    let IconToUse = item.icon;
                    let labelText = item.label;
                    if (item.key === 'gridFeed') {
                        const gridValueNum = item.value;
                        itemColor = gridValueNum === 0 ? getResolvedColor('net', resolvedTheme) : (gridValueNum > 0 ? getResolvedColor('success', resolvedTheme) : getResolvedColor('destructive', resolvedTheme));
                        IconToUse = gridValueNum === 0 ? PlugZap : (gridValueNum > 0 ? ArrowRightToLine : ArrowLeftFromLine);
                        labelText = gridValueNum === 0 ? "Grid Balanced" : (gridValueNum > 0 ? "Grid Exporting" : "Grid Importing");
                    } else {
                        itemColor = getResolvedColor(item.key, resolvedTheme);
                    }
                    return (
                    <motion.button
                        key={item.key}
                        onClick={() => handleLineToggle(item.key)}
                        className={cn(
                            "flex items-center text-left gap-1.5 sm:gap-2 p-2 rounded-lg bg-background/70 dark:bg-black/30 shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                            !item.isEffectivelyVisible && "opacity-40 hover:opacity-60",
                            item.isEffectivelyVisible && "ring-1 ring-foreground/10"
                        )}
                        whileHover={{ scale: 1.02 }} whileTap={{scale:0.98}}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                        <IconToUse className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{color: itemColor}} />
                        <div className="flex flex-col">
                            <span className="text-xs sm:text-[0.8rem] text-muted-foreground leading-tight">{labelText}</span>
                            <span className="font-bold text-sm sm:text-[0.9rem] leading-tight" style={{color: itemColor}}>
                                <AnimatedNumber value={typeof item.value === 'number' ? Math.abs(item.value) : 0} precision={valuePrecision} /> {displayUnitLabel}
                            </span>
                        </div>
                    </motion.button>
                )})}
                <motion.div
                    key={currentValues.isSelfSufficient ? 'green-status' : 'red-status'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay:0.1, ease: "easeOut" }}
                    className={cn(
                        "flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs sm:text-sm col-span-2 sm:col-span-1 md:col-auto shadow-md",
                        currentValues.isSelfSufficient ? 'bg-green-500/20 text-green-700 dark:bg-green-500/25 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-300'
                    )}
                >
                    {currentValues.isSelfSufficient ? <Leaf className="h-4 w-4 sm:h-5 sm:w-5"/> : <AlertTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5"/>}
                    <span className="leading-tight">{currentValues.isSelfSufficient ? "Self-Sufficient" : "Grid Dependent"}</span>
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
                    key={animationKey + "-" + Object.values(visibleLines).join('') + "-" + historicalTimeOffsetMs}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full h-[280px] sm:h-[300px]"
                >
                   {isGraphReady && dpsAreConfigured && (chartData.length > 0 || !isCurrentlyDrawingLiveOrDemo) ? (
                    <ChartContainer config={baseChartConfig} className="w-full h-full">
                        <ComposedChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                             <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={resolvedTheme === 'dark' ? 0.3 : 0.5} />
                            <XAxis dataKey="timestamp" type="number" domain={xAxisDomain as [number, number]} scale="time" tickFormatter={formatXAxisTick} tickLine={false} axisLine={false} tickMargin={8} minTickGap={timeScale === '1mo' || timeScale === '7d' ? 15 : 30} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))"/>
                            <YAxis yAxisId="left" domain={yAxisDomain} orientation="left" width={60} tickFormatter={(v) => v.toFixed(valuePrecision > 0 ? 1 : 0)} tickLine={false} axisLine={false} tickMargin={5} stroke="hsl(var(--muted-foreground))"/>

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
                                            const dataKeyFromItem = item.dataKey as string;
                                            const currentPoint = item.payload as ChartDataPoint;
                                            let displayLabel: string; let displayValue: number = value as number;
                                            let itemColor: string = item.color as string;
                                            let Icon: React.ElementType | undefined;

                                            if (dataKeyFromItem === 'gridFeed') {
                                                displayValue = currentPoint.gridFeed;
                                                if (currentPoint.gridFeed >= 0) {
                                                    displayLabel = baseChartConfig.gridFeed.label + " (Export)";
                                                    itemColor = getResolvedColor('success', resolvedTheme); Icon = TrendingUpIcon;
                                                } else {
                                                    displayLabel = baseChartConfig.gridFeed.label + " (Import)";
                                                    itemColor = getResolvedColor('destructive', resolvedTheme); Icon = TrendingDown;
                                                }
                                                if (Array.isArray(payloadProp) && payloadProp.findIndex(p => p.dataKey === 'gridFeed') !== index) {
                                                    return null;
                                                }
                                            } else {
                                                const configKey = dataKeyFromItem as ActualLineKey;
                                                const config = baseChartConfig[configKey];
                                                displayLabel = config?.label || (name as string);
                                                Icon = config?.icon;
                                            }
                                            
                                            const mainContent = ( 
                                                <div className="flex items-center gap-2.5" key={`${name as string}-${index}`}> 
                                                    {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: itemColor }} />} 
                                                    <div className="flex flex-1 justify-between leading-none"> 
                                                        <span className="text-muted-foreground">{displayLabel}</span> 
                                                        <span className="font-bold" style={{ color: itemColor }}> 
                                                            {displayValue.toFixed(valuePrecision)} <span className="ml-1 font-normal text-muted-foreground">{displayUnitLabel}</span> 
                                                        </span> 
                                                    </div> 
                                                </div> 
                                            );

                                            // Add net power calculation after the last item
                                            if (Array.isArray(payloadProp) && index === payloadProp.length - 1) {
                                                const { generation, usage } = currentPoint;
                                                const netPower = generation - usage;
                                                const NetIcon = baseChartConfig.netPower.icon;
                                                const netColor = netPower >= 0 ? getResolvedColor("success", resolvedTheme) : getResolvedColor("destructive", resolvedTheme);
                                                
                                                return (
                                                    <div key={`${name as string}-${index}-with-net`}>
                                                        {mainContent}
                                                        <div className="flex items-center gap-2.5 border-t border-border/50 pt-1.5 mt-1.5 text-xs" key="net-power-footer">
                                                            {NetIcon && <NetIcon className="h-4 w-4 shrink-0" style={{ color: netColor }} />}
                                                            <div className="flex flex-1 justify-between leading-none">
                                                                <span className="text-muted-foreground">{baseChartConfig.netPower.label}</span>
                                                                <span className="font-bold" style={{color: netColor}}>
                                                                    {netPower.toFixed(valuePrecision)} <span className="ml-1 font-normal text-muted-foreground">{displayUnitLabel}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return mainContent;
                                        }}
                                        itemSorter={(item) => {
                                            const order: Record<string, number> = { generation:1, usage:2, gridFeed:3 };
                                            const key = (item.dataKey || '') as string;
                                            return order[key] || 4;
                                        }}
                                    />
                                }
                            />
                            { chartData.length > 3 &&
                              <ChartLegend
                                payload={legendPayloadForChartLegend}
                                content={<ChartLegendContent className="mt-1 -mb-1 text-xs" />}
                              />
                            }
                            <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--foreground)/0.3)" strokeDasharray="3 3" strokeWidth={1}/>

                            {visibleLines.generation && <Line yAxisId="left" dataKey="generation" name={baseChartConfig.generation.label} type="monotone" stroke={getResolvedColor("generation", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:4, fillOpacity:0.7}} isAnimationActive={isGraphReady&&(isCurrentlyDrawingLiveOrDemo)} animationDuration={effectiveUseDemoData?200:120} connectNulls={false} />}
                            {visibleLines.usage && <Line yAxisId="left" dataKey="usage" name={baseChartConfig.usage.label} type="monotone" stroke={getResolvedColor("usage", resolvedTheme)} strokeWidth={2.2} dot={false} activeDot={{r:4, fillOpacity:0.7}} isAnimationActive={isGraphReady&&(isCurrentlyDrawingLiveOrDemo)} animationDuration={effectiveUseDemoData?200:120} connectNulls={false} />}

                            {visibleLines.gridFeed && gridFeedSegments.map((segment, index) => (
                                <Line
                                    key={`gridFeed-segment-${segment.type}-${index}`}
                                    yAxisId="left" dataKey="gridFeed" data={segment.data}
                                    name={baseChartConfig.gridFeed.label}
                                    type="monotone" stroke={segment.type === 'export' ? getResolvedColor("success", resolvedTheme) : getResolvedColor("destructive", resolvedTheme)}
                                    strokeWidth={2.2} dot={false} activeDot={{ r: 4, fillOpacity: 0.7, stroke: segment.type === 'export' ? getResolvedColor("success", resolvedTheme) : getResolvedColor("destructive", resolvedTheme) }}
                                    isAnimationActive={isGraphReady && isCurrentlyDrawingLiveOrDemo} animationDuration={effectiveUseDemoData ? 200 : 120} connectNulls={false}
                                    legendType="none" // explicitly hide from auto-legend generation
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

function getSimulatedHistoricalWindData(timeScale: TimeScale, currentDate: Date, maxWindOutputW: number) {
    const now = currentDate.getTime();
    const { durationMs } = timeScaleConfig[timeScale];
    
    // Generate wind data for the time window
    const dataPoints: { timestamp: number; value: number }[] = [];
    const pointCount = Math.min(100, Math.max(10, Math.floor(durationMs / (5 * 60 * 1000)))); // One point every 5 minutes, capped
    
    for (let i = 0; i < pointCount; i++) {
        const timestamp = now - durationMs + (i * durationMs / pointCount);
        const timeOfDayMinutes = new Date(timestamp).getHours() * 60 + new Date(timestamp).getMinutes();
        
        // Wind is more active during certain times (early morning and evening)
        const windTimePattern = Math.sin((timeOfDayMinutes / (24 * 60)) * 2 * Math.PI + Math.PI) * 0.3 + 0.7;
        
        // Add some randomness and variability
        const windVariability = Math.sin((timestamp / (30 * 60 * 1000)) * 2 * Math.PI) * 0.4 + 0.6; // 30min cycle
        const windNoise = (Math.random() - 0.5) * 0.3; // Random noise
        
        // Combine factors
        let windFactor = windTimePattern * windVariability + windNoise;
        windFactor = Math.max(0, Math.min(1, windFactor)); // Clamp between 0 and 1
        
        const windOutputW = windFactor * maxWindOutputW;
        const windOutputInTargetUnit = convertFromWatts(windOutputW, CHART_TARGET_UNIT);
        
        dataPoints.push({
            timestamp,
            value: windOutputInTargetUnit
        });
    }
    
    return {
        generation: dataPoints
    };
}

function generateUsageData(timestamp: number, baseUsageW: number, variationW: number): number {
    const timeOfDayMinutes = new Date(timestamp).getHours() * 60 + new Date(timestamp).getMinutes();
    
    // Basic usage pattern with morning and evening peaks
    const morningPeak = Math.exp(-Math.pow(timeOfDayMinutes - 7.5 * 60, 2) / (2 * Math.pow(60, 2)));
    const eveningPeak = Math.exp(-Math.pow(timeOfDayMinutes - 18.5 * 60, 2) / (2 * Math.pow(60, 2)));
    
    const peakUsage = (morningPeak + eveningPeak * 1.2) * variationW;
    const randomVariation = (Math.random() - 0.5) * variationW * 0.3;
    
    const totalUsageW = baseUsageW + peakUsage + randomVariation;
    return convertFromWatts(Math.max(100, totalUsageW), CHART_TARGET_UNIT);
}

export default PowerTimelineGraph;
