'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
    Transition,
} from 'framer-motion';
import { useTheme } from 'next-themes';
import clsx from 'clsx';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { formatValue } from './formatValue';

// --- Constants ---
const DEFAULT_SIZE = 120;
const DEFAULT_STROKE_WIDTH = 12; // Slightly thicker
const INDICATOR_RADIUS = 5; // Size of the end dot
const START_ANGLE = -210; // ~7 o'clock
const END_ANGLE = 30; // ~5 o'clock
const ANGLE_RANGE = END_ANGLE - START_ANGLE;
const VALUE_CLAMP_OFFSET = 0.001;

// --- Types ---
interface GaugeState {
    colorName: 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
    isCritical: boolean;
    gradientId: string;
    glowFilterId: string;
}

// --- Helper Functions ---
const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
};

const describeArc = (cx: number, cy: number, r: number, stroke: number, startAngle: number, endAngle: number): string => {
    // Clamp end angle slightly to prevent full circle glitch and indicator overflow
    const effectiveAngleRange = ANGLE_RANGE * (1 - VALUE_CLAMP_OFFSET * 2);
    const clampedEndAngle = Math.min(Math.max(endAngle, startAngle + ANGLE_RANGE * VALUE_CLAMP_OFFSET), startAngle + effectiveAngleRange);

    const radius = r - stroke / 2;
    const start = polarToCartesian(cx, cy, radius, clampedEndAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);

    const largeArcFlag = clampedEndAngle - startAngle <= 180 ? '0' : '1';
    const sweepFlag = '1'; // Draw arc clockwise

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
};

// --- Component ---
interface WowCircularGaugeProps {
    value: number | null | undefined;
    label?: string; // Now handled by parent card, but kept for standalone use
    size?: number;
    strokeWidth?: number;
    config: DataPointConfig;
    unit?: string;
}

const WowCircularGauge: React.FC<WowCircularGaugeProps> = React.memo(
    ({
        value: rawValue,
        label, // Usually provided by parent card now
        size = DEFAULT_SIZE,
        strokeWidth = DEFAULT_STROKE_WIDTH,
        config,
    }) => {
        const { resolvedTheme } = useTheme();
        const { factor = 1, min = 0, unit, name } = config;
        const uniqueIdSuffix = config.id.replace(/[^a-zA-Z0-9]/g, '-');

        const value = typeof rawValue === 'number' ? rawValue * factor : rawValue;

        // --- State and Calculations ---
        const [displayValue, setDisplayValue] = useState<string | number>('...');
        const [prevValue, setPrevValue] = useState<number | null>(null);

        const effectiveMax = useMemo(() => {
            const configuredMax = config.max;
            let baseMax = 100;
            if (typeof configuredMax === 'number') baseMax = configuredMax;
            else if (value !== null && typeof value === 'number' && value > 10) baseMax = Math.ceil(value / 10) * 10 * 1.1;
            else if (min >= 10) baseMax = min * 1.5;
            return baseMax <= min ? min + 100 : baseMax;
        }, [config.max, value, min]);

        const normalizedValue = useMemo(() => {
            if (value === null || value === undefined || effectiveMax === min) return 0;
            const clampedValue = Math.max(min, Math.min(effectiveMax, value));
            return (clampedValue - min) / (effectiveMax - min);
        }, [value, min, effectiveMax]);

        // Smooth the normalized value for animation
        const motionValue = useMotionValue(0);
        const smoothNormalizedValue = useSpring(motionValue, {
            stiffness: 80,
            damping: 25,
            mass: 1,
        });

        useEffect(() => {
            motionValue.set(normalizedValue);
        }, [normalizedValue, motionValue]);

        // Update text display value (consider number rolling here)
        useEffect(() => {
            if (rawValue === undefined) {
                setDisplayValue('...');
                setPrevValue(null)
            } else {
                const formatted = formatValue(value ?? null, config);
                setDisplayValue(formatted);
                setPrevValue(typeof value === 'number' ? value : null);
            }
        }, [rawValue, value, config, formatValue]);


        // --- Color and State Logic ---
        const gaugeState = useMemo((): GaugeState => {
            const gradientId = `wow-gauge-gradient-${uniqueIdSuffix}`;
            const glowFilterId = `wow-gauge-glow-${uniqueIdSuffix}`;

            if (value === undefined || value === null) {
                return { colorName: 'unknown', isCritical: false, gradientId, glowFilterId };
            }

            let colorName: GaugeState['colorName'] = 'green';
            let isCritical = false;
            const isPercentage = unit === '%' || (min === 0 && effectiveMax === 100);

            // Simplified threshold logic (enhance with config.thresholds as before if needed)
            if (isPercentage) {
                if (value < 10) { colorName = 'red'; isCritical = true; }
                else if (value < 25) colorName = 'red';
                else if (value < 50) colorName = 'orange';
                else if (value < 75) colorName = 'yellow';
                else colorName = 'green';
            } else {
                const range = effectiveMax - min;
                const lowerCrit = min + range * 0.1;
                const upperCrit = effectiveMax - range * 0.1;
                const lowerWarn = min + range * 0.2;
                const upperWarn = effectiveMax - range * 0.2;

                if (value <= lowerCrit || value >= upperCrit) { colorName = 'red'; isCritical = true; }
                else if (value <= lowerWarn || value >= upperWarn) colorName = 'orange';
                else colorName = 'green';
            }

            return { colorName, isCritical, gradientId, glowFilterId };
        }, [value, min, effectiveMax, unit, uniqueIdSuffix]); // Add thresholds if using config


        // --- SVG Calculations ---
        const center = size / 2;
        const radius = size / 2 - INDICATOR_RADIUS; // Adjust radius for indicator space
        const valueArcEndAngle = START_ANGLE + normalizedValue * ANGLE_RANGE; // Use unsmoothed for precise indicator positioning

        // Paths using the non-smoothed value for correct geometry
        const backgroundArcPath = describeArc(center, center, radius, strokeWidth, START_ANGLE, END_ANGLE);
        const valueArcPath = describeArc(center, center, radius, strokeWidth, START_ANGLE, valueArcEndAngle);

        // Indicator position calculation requires the *current* animated angle
        // We need to manually calculate this based on the smoothed value
        const indicatorAngle = useMotionValue(START_ANGLE);
        useEffect(() => {
            // Update indicator angle based on smoothed value changes
            const unsubscribe = smoothNormalizedValue.onChange(latestSmoothVal => {
                const currentAngle = START_ANGLE + latestSmoothVal * ANGLE_RANGE;
                indicatorAngle.set(currentAngle);
            });
            return unsubscribe;
        }, [smoothNormalizedValue, indicatorAngle]);


        const indicatorPos = useMemo(() => {
            // This needs to react to the animated indicatorAngle
            // Note: This direct calculation within useMemo won't track the motion value's changes correctly for animation.
            // We'll handle positioning directly in the indicator's motion component props.
            return polarToCartesian(center, center, radius - strokeWidth / 2, START_ANGLE + normalizedValue * ANGLE_RANGE);
        }, [center, radius, strokeWidth, normalizedValue]);


        // --- Styling ---
        const colorStyles: Record<string, { gradient: string[], stopColor: string, text: string, shadow: string, glowColor: string }> = {
            green: { gradient: ['#6EE7B7', '#10B981'], stopColor: '#10B981', text: 'text-emerald-600 dark:text-emerald-400', shadow: 'shadow-emerald-400/30 dark:shadow-emerald-500/35', glowColor: '#10B981' },
            yellow: { gradient: ['#FDE047', '#FACC15'], stopColor: '#FACC15', text: 'text-yellow-500 dark:text-yellow-400', shadow: 'shadow-yellow-400/35 dark:shadow-yellow-500/40', glowColor: '#FACC15' },
            orange: { gradient: ['#FDBA74', '#FB923C'], stopColor: '#FB923C', text: 'text-orange-500 dark:text-orange-400', shadow: 'shadow-orange-500/40 dark:shadow-orange-500/45', glowColor: '#FB923C' },
            red: { gradient: ['#FCA5A5', '#F87171'], stopColor: '#EF4444', text: 'text-red-600 dark:text-red-400', shadow: 'shadow-red-500/45 dark:shadow-red-600/50', glowColor: '#EF4444' },
            unknown: { gradient: ['#9CA3AF', '#6B7280'], stopColor: '#6B7280', text: 'text-gray-500 dark:text-gray-400', shadow: 'shadow-gray-400/20 dark:shadow-gray-600/25', glowColor: '#6B7280' },
        };
        const currentStyle = colorStyles[gaugeState.colorName];
        const showPulse = gaugeState.isCritical && !(displayValue === 'ON' || displayValue === 'OFF');


        // --- Transitions ---
        const textTransition: Transition = { duration: 0.3, ease: 'easeInOut' };

        // --- Render ---
        const isLoading = rawValue === undefined;

        // At the top of your component
        const initialPos = polarToCartesian(0, 0, radius - strokeWidth / 2, START_ANGLE);
        const indicatorPosX = useMotionValue(initialPos.x);
        const indicatorPosY = useMotionValue(initialPos.y);
        const smoothX = useSpring(indicatorPosX, { stiffness: 50, damping: 15 });
        const smoothY = useSpring(indicatorPosY, { stiffness: 50, damping: 15 });

        // useEffect to update the dot position when angle changes
        useEffect(() => {
            const updatePosition = (angle: number) => {
                const { x, y } = polarToCartesian(center, center, radius - strokeWidth / 2, angle);
                indicatorPosX.set(x);
                indicatorPosY.set(y);
            };

            const unsubscribe = indicatorAngle.onChange(updatePosition);
            updatePosition(indicatorAngle.get()); // Initial position

            return unsubscribe;
        }, [indicatorAngle, indicatorPosX, indicatorPosY, center, radius, strokeWidth]);

        return (
            <div>
                <div
                    className={clsx(
                        'relative group flex flex-col items-center justify-start w-full h-full', // Adjusted alignment
                        'transition-all duration-300',
                        isLoading ? 'opacity-80' : currentStyle.shadow,
                        showPulse && !isLoading && 'animate-pulse-glow', // Use custom pulse
                        'hover:scale-[1.03]'
                    )}
                    role="meter"
                    aria-valuemin={min}
                    aria-valuemax={effectiveMax}
                    aria-valuenow={typeof value === 'number' ? value : undefined}
                    aria-label={`${label || name}: ${displayValue}${unit ? ` ${unit}` : ''}`}
                    style={{ '--glow-color': currentStyle.glowColor } as React.CSSProperties}
                >
                    {/* Optional Label (if used standalone) */}
                    {label && (
                        <span className="text-xs font-medium text-muted-foreground text-center max-w-[110px] truncate px-1 mb-1" title={label}>
                            {label}
                        </span>
                    )}

                    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                            <defs>
                                {/* Define gradients for each state */}
                                {Object.entries(colorStyles).map(([key, style]) => (
                                    <linearGradient key={key} id={`wow-gauge-gradient-<span class="math-inline">\{key\}\-</span>{uniqueIdSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={style.gradient[0]} />
                                        <stop offset="100%" stopColor={style.gradient[1]} />
                                    </linearGradient>
                                ))}

                                {/* Glow Filter */}
                                <filter id={gaugeState.glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>

                                {/* Skeleton Loading Gradient */}
                                <linearGradient id={`wow-gauge-skeleton-${uniqueIdSuffix}`} x1="-100%" y1="50%" x2="100%" y2="50%">
                                    <stop offset="0%" stopColor={resolvedTheme === 'dark' ? '#333' : '#e0e0e0'}>
                                        <animate attributeName="offset" values="-2; 1" dur="1.5s" repeatCount="indefinite" />
                                    </stop>
                                    <stop offset="50%" stopColor={resolvedTheme === 'dark' ? '#555' : '#f0f0f0'}>
                                        <animate attributeName="offset" values="-1.5; 1.5" dur="1.5s" repeatCount="indefinite" />
                                    </stop>
                                    <stop offset="100%" stopColor={resolvedTheme === 'dark' ? '#333' : '#e0e0e0'}>
                                        <animate attributeName="offset" values="-1; 2" dur="1.5s" repeatCount="indefinite" />
                                    </stop>
                                </linearGradient>
                            </defs>

                            {/* Background Arc */}
                            <path
                                d={backgroundArcPath}
                                strokeWidth={strokeWidth * 0.8} // Slightly thinner background
                                strokeLinecap="round"
                                stroke={resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}
                                fill="none"
                                className="transition-colors"
                            />

                            {/* Loading Skeleton Arc */}
                            {isLoading && (
                                <path
                                    d={backgroundArcPath} // Use full background path for skeleton
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    stroke={`url(#wow-gauge-skeleton-${uniqueIdSuffix})`}
                                    fill="none"
                                />
                            )}


                            {/* Value Arc - Glow Effect (behind main arc) */}
                            {!isLoading && value !== null && (
                                <motion.path
                                    d={valueArcPath} // Use static path based on final value
                                    fill="none"
                                    stroke={currentStyle.stopColor}
                                    strokeWidth={strokeWidth + 4} // Make glow slightly thicker
                                    strokeLinecap="round"
                                    style={{
                                        pathLength: smoothNormalizedValue, // Animate pathLength
                                        opacity: 0.5,
                                        filter: `blur(5px) brightness(1.2)`,
                                    }}
                                    initial={{ pathLength: 0 }}
                                />
                            )}

                            {/* Value Arc - Main */}
                            {!isLoading && value !== null && (
                                <motion.path
                                    d={valueArcPath} // Use static path based on final value
                                    fill="none"
                                    stroke={`url(#wow-gauge-gradient-${gaugeState.colorName}-${uniqueIdSuffix})`}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    style={{ pathLength: smoothNormalizedValue }} // Animate pathLength
                                    initial={{ pathLength: 0 }}
                                />
                            )}
                        </svg>

                        {/* Value text in the center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isLoading ? 'loading' : `${config.id}-${displayValue}`}
                                    className="flex flex-col items-center justify-center text-center leading-none"
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={textTransition}
                                >
                                    <span className={clsx(
                                        'text-xl sm:text-2xl lg:text-3xl font-semibold tabular-nums', // Larger text
                                        isLoading ? 'text-muted-foreground/50' : currentStyle.text
                                    )}>
                                        {/* Display '...' during loading, otherwise use state */}
                                        {displayValue}
                                    </span>
                                    {/* Unit Text */}
                                    {!isLoading && !(displayValue === 'ON' || displayValue === 'OFF') && unit && (
                                        <span className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5">
                                            {unit}
                                        </span>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

WowCircularGauge.displayName = 'WowCircularGauge';
export default WowCircularGauge;