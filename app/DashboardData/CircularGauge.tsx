'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
    AnimatePresence,
    motion,
    Transition,
} from 'framer-motion';
import { useTheme } from 'next-themes'; // Keep for potential future use with colors if needed
import clsx from 'clsx';
import { DataPoint } from '@/config/dataPoints'; // Adjust path if needed
import { formatValue } from './formatValue'; // Adjust path if needed

// Define the threshold interface
interface Threshold {
  value: number;
  compare: 'gt' | 'lt';
  color: 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
  critical?: boolean;
}

// Extend the DataPoint type
interface ExtendedDataPointConfig extends DataPoint {
  thresholds?: Threshold[];
}

interface ValueStatusDisplayProps {
    value: number | null | undefined;
    label?: string; // Kept for consistency, though card usually handles it
    size?: { width?: number, height?: number }; // For custom dimensions
    config: ExtendedDataPointConfig;
}
interface ValueStatusState {
    colorName: 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
    isCritical: boolean;
    // No gradient/glow IDs needed as we are not using SVG specific effects here
}

// --- Component ---
// Using the already defined interface above

const ValueStatusDisplay: React.FC<ValueStatusDisplayProps> = React.memo(
    ({
        value: rawValue,
        label,
        size, // Removed default size from destructuring
        config,
    }) => {
        const { resolvedTheme } = useTheme(); // Still useful for skeleton colors
        const { factor = 1, min = 0, unit, name } = config;

        const DEFAULT_WIDTH = 120;
        const DEFAULT_HEIGHT = 120;
        const displayWidth = size?.width ?? DEFAULT_WIDTH;
        const displayHeight = size?.height ?? DEFAULT_HEIGHT;

        const value = typeof rawValue === 'number' ? rawValue * factor : rawValue;

        const [displayValue, setDisplayValue] = useState<string | number>('...');

        const valueState = useMemo<ValueStatusState>(() => {
            if (value === null || value === undefined) {
                return { colorName: 'unknown', isCritical: false };
            }

            // Define thresholds and colors based on value ranges
            const thresholds = config.thresholds || [];
            
            if (typeof value === 'number') {
                // Critical threshold
                const criticalThreshold = thresholds.find(t => t.critical);
                const isCritical = criticalThreshold ? 
                    (criticalThreshold.compare === 'gt' ? value > criticalThreshold.value : value < criticalThreshold.value) : 
                    false;
                
                // Color determination
                for (const threshold of thresholds) {
                    const compareValue = threshold.value;
                    const isMatch = threshold.compare === "gt" ? 
                        value > compareValue : value < compareValue;
                    
                    if (isMatch) {
                        return { 
                            colorName: threshold.color || 'unknown', 
                            isCritical: isCritical 
                        } as ValueStatusState;
                    }
                }

                // Default color if no threshold matches
                return { colorName: 'green', isCritical };
            }
            
            // Boolean values (ON/OFF)
            if (typeof value === 'boolean') {
                return { 
                    colorName: value ? 'green' : 'red', 
                    isCritical: false 
                };
            }
            
            return { colorName: 'unknown', isCritical: false };
        }, [value, config]);

        const effectiveMax = useMemo(() => {
            const configuredMax = config.max;
            let baseMax = 100;
            if (typeof configuredMax === 'number') baseMax = configuredMax;
            else if (value !== null && typeof value === 'number' && value > 10) baseMax = Math.ceil(value / 10) * 10 * 1.1;
            else if (min >= 10) baseMax = min * 1.5;
            return baseMax <= min ? min + 100 : baseMax;
        }, [config.max, value, min]);

        useEffect(() => {
            if (rawValue === undefined) {
                setDisplayValue('...');
            } else {
                const formatted = formatValue(value ?? null, config);
                setDisplayValue(formatted);
            }
        }, [rawValue, value, config]);


        const colorStyles: Record<string, { background: string, text: string, border: string, shadow: string, glowColor: string }> = {
            // Using Tailwind color names. You'll need to ensure these are available.
            // Dark mode variants are applied using Tailwind's `dark:` prefix.
            green:  { background: 'bg-emerald-500/20 dark:bg-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500', shadow: 'shadow-emerald-400/30 dark:shadow-emerald-500/35', glowColor: 'var(--color-emerald-500)' },
            yellow: { background: 'bg-yellow-500/20 dark:bg-yellow-500/30',   text: 'text-yellow-700 dark:text-yellow-300',   border: 'border-yellow-500',   shadow: 'shadow-yellow-400/35 dark:shadow-yellow-500/40', glowColor: 'var(--color-yellow-500)' },
            orange: { background: 'bg-orange-500/20 dark:bg-orange-500/30',   text: 'text-orange-700 dark:text-orange-300',   border: 'border-orange-500',   shadow: 'shadow-orange-500/40 dark:shadow-orange-500/45', glowColor: 'var(--color-orange-500)' },
            red:    { background: 'bg-red-500/20 dark:bg-red-500/30',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-500',       shadow: 'shadow-red-500/45 dark:shadow-red-600/50', glowColor: 'var(--color-red-500)'    },
            unknown:{ background: 'bg-gray-500/20 dark:bg-gray-400/30',       text: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-500',       shadow: 'shadow-gray-400/20 dark:shadow-gray-600/25', glowColor: 'var(--color-gray-500)'    },
        };
        const currentStyle = colorStyles[valueState.colorName];
        const showPulse = valueState.isCritical && !(displayValue === 'ON' || displayValue === 'OFF');
        const textTransition: Transition = { duration: 0.3, ease: 'easeInOut' };
        const isLoading = rawValue === undefined;

        // Skeleton animation styling
        const skeletonBaseClass = "rounded animate-pulse";
        const skeletonDarkColor = "bg-neutral-700/50";
        const skeletonLightColor = "bg-neutral-300/50";


        if (isLoading) {
            return (
                 <div
                    style={{ width: displayWidth, height: displayHeight }}
                    className={clsx(
                        "flex flex-col items-center justify-center p-2 rounded-lg", // Basic box structure
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
                    'relative group flex flex-col items-center justify-center p-2 rounded-lg', // Main container for the "status box"
                    'transition-all duration-300 ease-in-out',
                    currentStyle.background,
                    currentStyle.shadow, // Apply shadow
                    `border-2 ${currentStyle.border}`, // Use the border color
                    showPulse && 'animate-pulse-border-glow', // Apply custom pulse animation
                    'hover:scale-[1.03]'
                )}
                style={{
                    width: displayWidth,
                    height: displayHeight,
                    '--glow-color': currentStyle.glowColor, // Used by animate-pulse-border-glow
                } as React.CSSProperties}
                role="status"
                aria-label={`${label || name}: ${displayValue}${config.unit ? ` ${config.unit}` : ''}`}
            >
                {/* Optional Label - not typically used if parent card shows title */}
                {label && (
                    <span className={clsx("text-xs font-medium text-center truncate px-1 mb-1", currentStyle.text)} title={label}>
                        {label}
                    </span>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${config.id}-${displayValue}`} // Key ensures animation on change
                        className="flex flex-col items-center justify-center text-center leading-none w-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={textTransition}
                    >
                        <span className={clsx(
                            'text-2xl sm:text-3xl font-bold tabular-nums truncate max-w-full px-1', // Main value text
                            currentStyle.text // Dynamic text color
                        )}>
                            {displayValue}
                        </span>
                        {!(displayValue === 'ON' || displayValue === 'OFF') && unit && (
                            <span className={clsx(
                                "text-[20px] sm:text-sm -mt-0.5", // Unit text
                                currentStyle.text, // Also uses dynamic color, but could be muted
                                'opacity-80' // Slightly muted unit
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