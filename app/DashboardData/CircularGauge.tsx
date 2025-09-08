'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
    AnimatePresence,
    motion,
    Transition,
} from 'framer-motion';
import { useTheme } from 'next-themes';
import clsx from 'clsx';
import { DataPoint } from '@/config/dataPoints'; // Adjust path if needed
import { formatValue } from './formatValue'; // Adjust path if needed

// We won't use a separate Threshold interface as we're doing it mathematically
// and not modifying DataPoint interface

interface ValueStatusDisplayProps {
    value: number | string | boolean | null | undefined; // Allow string/boolean for ON/OFF states
    label?: string;
    size?: { width?: number, height?: number };
    config: DataPoint; // Using the original DataPoint interface
}

interface ValueStatusState {
    colorName: 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
    isCritical: boolean; // We can still infer critical for extreme deviations or based on a flag if DataPoint gets it later
}

// Color range percentages (deviation from target)
const YELLOW_THRESHOLD_PERCENT = 1;   // +/- 1% from target
const ORANGE_THRESHOLD_PERCENT = 2.5; // +/- 2.5% from target
const RED_THRESHOLD_PERCENT = 5;      // +/- 5% from target

const ValueStatusDisplay: React.FC<ValueStatusDisplayProps> = React.memo(
    ({
        value: rawValue,
        label,
        size,
        config,
    }) => {
        const { resolvedTheme } = useTheme();
        const { factor = 1, unit, name, min, max } = config; // Added min, max

        const DEFAULT_WIDTH = 120;
        const DEFAULT_HEIGHT = 120;
        const displayWidth = size?.width ?? DEFAULT_WIDTH;
        const displayHeight = size?.height ?? DEFAULT_HEIGHT;

        const [displayValue, setDisplayValue] = useState<string | number>('...');

        // Determine a target value for percentage deviation calculation
        // Prioritize 'max' as the nominal/target if it looks like a specific target (e.g., not a huge range)
        // Or if 'min' and 'max' define a tight operational band, the midpoint could be a target.
        // For simplicity here, if 'max' is present, we use it. Otherwise, more complex heuristics might be needed.
        const targetValueForColoring = useMemo(() => {
            if (typeof config.max === 'number' && config.max > 0) {
                // If min is also defined, and they form a very tight band, could use midpoint
                if (typeof config.min === 'number' && (config.max - config.min) < (0.1 * config.max) ) { // e.g., band is < 10% of max
                    return (config.min + config.max) / 2;
                }
                return config.max; // Use max as the primary target/nominal value
            }
            // If no explicit target, percentage deviation might not be the best metric.
            // For now, this function will default to 'unknown' or 'green' if no target.
            return undefined;
        }, [config.max, config.min]);


        const valueState = useMemo<ValueStatusState>(() => {
            if (rawValue === null || rawValue === undefined) {
                return { colorName: 'unknown', isCritical: false };
            }

            // Handle string "ON"/"OFF" or boolean states first
            if (typeof rawValue === 'boolean') {
                return { colorName: rawValue ? 'green' : 'red', isCritical: false };
            }
            if (typeof rawValue === 'string') {
                const upperVal = rawValue.toUpperCase();
                if (upperVal === 'ON' || upperVal === 'TRUE' || upperVal === "NOMINAL") {
                    return { colorName: 'green', isCritical: false };
                }
                if (upperVal === 'OFF' || upperVal === 'FALSE' || upperVal === "TRIPPED") {
                    return { colorName: 'red', isCritical: false };
                }
                 if (upperVal === 'FAULT' || upperVal === "ALARM") {
                    return { colorName: 'red', isCritical: true };
                }
                if (upperVal === 'WARNING') {
                    return { colorName: 'orange', isCritical: false }; // Or yellow, depending on severity
                }
                // If it's a string but not recognized, treat as unknown unless it can be parsed as number
                const numericValueFromString = parseFloat(rawValue);
                if (isNaN(numericValueFromString)) {
                     return { colorName: 'unknown', isCritical: false };
                }
                 // Continue with numericValueFromString for color logic
                 rawValue = numericValueFromString;
            }


            // Numeric value processing
            const numericValue = typeof rawValue === 'number' ? rawValue * factor : NaN;

            if (isNaN(numericValue)) {
                return { colorName: 'unknown', isCritical: false };
            }

            // If we have a targetValueForColoring, calculate deviation
            if (typeof targetValueForColoring === 'number' && targetValueForColoring !== 0) {
                const deviation = Math.abs(numericValue - targetValueForColoring);
                const deviationPercent = (deviation / Math.abs(targetValueForColoring)) * 100;

                if (deviationPercent > RED_THRESHOLD_PERCENT) {
                    return { colorName: 'red', isCritical: true }; // Assume >5% is critical
                } else if (deviationPercent > ORANGE_THRESHOLD_PERCENT) {
                    return { colorName: 'orange', isCritical: false };
                } else if (deviationPercent > YELLOW_THRESHOLD_PERCENT) {
                    return { colorName: 'yellow', isCritical: false };
                }
                return { colorName: 'green', isCritical: false }; // Within +/- 1% is green
            }

            // Fallback for numeric values if no clear target (e.g., general readings like temperature, kWh)
            // This part can be simple (always green unless explicitly out of min/max) or more nuanced.
            // For simplicity, if min/max are defined and value is outside, make it notable.
            if (typeof min === 'number' && numericValue < min) {
                return { colorName: 'orange', isCritical: (numericValue < min * 0.9) }; // Example: 10% below min is critical
            }
            if (typeof max === 'number' && numericValue > max) {
                return { colorName: 'orange', isCritical: (numericValue > max * 1.1) }; // Example: 10% above max is critical
            }

            // If no target and within any defined min/max, or no min/max defined, default to green
            return { colorName: 'green', isCritical: false };

        }, [rawValue, factor, targetValueForColoring, min, max]);


        useEffect(() => {
            if (rawValue === undefined) {
                setDisplayValue('...');
            } else {
                const valToFormat = (typeof rawValue === 'number' && !isNaN(rawValue)) ? rawValue * factor : rawValue;
                // Convert to number or null for formatValue
                const numericValue = typeof valToFormat === 'number' ? valToFormat : 
                                    (typeof valToFormat === 'string' ? parseFloat(valToFormat) : null);
                const formatted = numericValue === null || numericValue === undefined || isNaN(numericValue) 
                                ? String(valToFormat) // Return the original value as string for non-numeric values
                                : formatValue(numericValue, config);
                setDisplayValue(formatted);
            }
        }, [rawValue, factor, config]);


        const colorStyles: Record<string, { background: string, text: string, border: string, shadow: string, glowColor: string }> = {
            green:  { background: 'bg-emerald-500/20 dark:bg-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500', shadow: 'shadow-emerald-400/30 dark:shadow-emerald-500/35', glowColor: 'var(--color-emerald-500)' },
            yellow: { background: 'bg-yellow-500/20 dark:bg-yellow-500/30',   text: 'text-yellow-700 dark:text-yellow-300',   border: 'border-yellow-500',   shadow: 'shadow-yellow-400/35 dark:shadow-yellow-500/40', glowColor: 'var(--color-yellow-500)' },
            orange: { background: 'bg-orange-500/20 dark:bg-orange-500/30',   text: 'text-orange-700 dark:text-orange-300',   border: 'border-orange-500',   shadow: 'shadow-orange-500/40 dark:shadow-orange-500/45', glowColor: 'var(--color-orange-500)' },
            red:    { background: 'bg-red-500/20 dark:bg-red-500/30',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-500',       shadow: 'shadow-red-500/45 dark:shadow-red-600/50', glowColor: 'var(--color-red-500)'    },
            unknown:{ background: 'bg-gray-500/20 dark:bg-gray-400/30',       text: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-500',       shadow: 'shadow-gray-400/20 dark:shadow-gray-600/25', glowColor: 'var(--color-gray-500)'    },
        };
        const currentStyle = colorStyles[valueState.colorName];
        const isOnOffDisplay = typeof displayValue === 'string' && (displayValue.toUpperCase() === 'ON' || displayValue.toUpperCase() === 'OFF');
        const showPulse = valueState.isCritical && !isOnOffDisplay;

        const textTransition: Transition = { duration: 0.3, ease: 'easeInOut' };
        const isLoading = rawValue === undefined && displayValue === "..."; // Refined loading condition

        const skeletonBaseClass = "rounded animate-pulse";
        const skeletonDarkColor = "bg-neutral-700/50";
        const skeletonLightColor = "bg-neutral-300/50";


        if (isLoading) {
            return (
                 <div
                    style={{ width: displayWidth, height: displayHeight }}
                    className={clsx(
                        "flex flex-col items-center justify-center p-2 rounded-lg",
                        skeletonBaseClass,
                        resolvedTheme === 'dark' ? skeletonDarkColor : skeletonLightColor
                    )}
                    role="status"
                    aria-busy="true"
                    aria-label={`Loading data for ${name}`}
                >
                    <div className={clsx("h-6 w-3/4 mb-1", skeletonBaseClass, resolvedTheme === 'dark' ? skeletonDarkColor : skeletonLightColor)} />
                    <div className={clsx("h-3 w-1/2", skeletonBaseClass, resolvedTheme === 'dark' ? skeletonDarkColor : skeletonLightColor)} />
                </div>
            );
        }


        return (
            <div
                className={clsx(
                    'relative group flex flex-col items-center justify-center p-2 rounded-lg',
                    'transition-all duration-300 ease-in-out',
                    currentStyle.background,
                    currentStyle.shadow,
                    `border-2 ${currentStyle.border}`,
                    showPulse && 'animate-pulse-border-glow',
                    'hover:scale-[1.03]'
                )}
                style={{
                    width: displayWidth,
                    height: displayHeight,
                    '--glow-color': currentStyle.glowColor,
                } as React.CSSProperties}
                role="status"
                aria-label={`${label || name}: ${displayValue}${!isOnOffDisplay && config.unit ? ` ${config.unit}` : ''}`}
            >
                {label && (
                    <span className={clsx("text-xs font-medium text-center truncate px-1 mb-1", currentStyle.text)} title={label}>
                        {label}
                    </span>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${config.id}-${String(displayValue)}`} // Ensure key changes properly for string/number
                        className="flex flex-col items-center justify-center text-center leading-none w-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={textTransition}
                    >
                        <span className={clsx(
                            'text-2xl sm:text-3xl font-bold tabular-nums truncate max-w-full px-1',
                            currentStyle.text
                        )}>
                            {String(displayValue)} {/* Ensure displayValue is always a string for rendering */}
                        </span>
                        {!isOnOffDisplay && unit && (
                            <span className={clsx(
                                "text-[10px] sm:text-sm -mt-0.5", // Adjusted size for unit
                                currentStyle.text,
                                'opacity-80'
                                )}>
                                {unit}
                            </span>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }
);

ValueStatusDisplay.displayName = 'ValueStatusDisplay';
export { ValueStatusDisplay };