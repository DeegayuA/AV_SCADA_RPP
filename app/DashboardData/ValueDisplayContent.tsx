'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Info } from 'lucide-react'; // Import necessary icons
import { toast } from 'sonner'; // Assuming sonner is used for toasts
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { useTheme } from 'next-themes'; // Assuming theme might affect text color slightly
import { formatValue } from './formatValue';

interface ValueDisplayContentProps {
    value: any; // Can be string | number | boolean | null | 'Error' | undefined
    config: DataPointConfig;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

const ValueDisplayContent: React.FC<ValueDisplayContentProps> = React.memo(
    ({ value, config, playNotificationSound, lastToastTimestamps }) => {
        const { resolvedTheme } = useTheme(); // Use theme if needed for subtle variations
        const key = `${config.nodeId}-${String(value)}-${resolvedTheme}`; // Key for AnimatePresence
        let content: React.ReactNode;
        let valueClass = "text-foreground font-medium";
        let iconPrefix: React.ReactNode = null;
        const unit = config.unit;

        if (value === undefined || value === null) {
            content = <span className="text-gray-400 dark:text-gray-500 italic">--</span>;
        } else if (value === 'Error') {
            content = <span className="font-semibold">Error</span>;
            valueClass = "text-red-600 dark:text-red-400";
            iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />;
        } else if (typeof value === 'boolean') {
            content = value ? 'ON' : 'OFF';
            valueClass = `font-semibold ${value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
        } else if (typeof value === 'number') {
            const factor = config.factor ?? 1;
            const min = config.min;
            const max = config.max;
            let adjustedValue = value * factor;
            let displayValue = formatValue(adjustedValue, config);

            const isOnOff = displayValue === 'ON' || displayValue === 'OFF';
             // Determine if value is outside defined range, but only for non ON/OFF numbers
            const isOutOfRange = !isOnOff && (
                 (min !== undefined && adjustedValue < min) ||
                 (max !== undefined && adjustedValue > max)
            );

            if (isOnOff) {
                valueClass = `font-semibold ${displayValue === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
            } else if (isOutOfRange) {
                 // Trigger toast and apply warning class
                 valueClass = "text-yellow-600 dark:text-yellow-400 font-semibold";
                 iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />; // Use AlertCircle for warnings too

                 const now = Date.now();
                 const lastToastTime = lastToastTimestamps.current[config.nodeId];
                 const cooldown = 60 * 1000; // 60 seconds cooldown for toasts per node

                 if (!lastToastTime || now - lastToastTime > cooldown) {
                     const direction = (min !== undefined && adjustedValue < min) ? 'below minimum' : 'above maximum';
                     const rangeText = `(Range: ${formatValue(min ?? null, config)} to ${formatValue(max ?? null, config)})`; // Use formatValue for range display too
                     toast.warning('Value Alert', {
                         description: `${config.name}: ${displayValue}${unit || ''} is ${direction} ${rangeText}.`,
                         duration: 8000,
                         id: `value-alert-${config.nodeId}` // Give toast a unique ID to prevent duplicates
                     });
                     playNotificationSound('warning');
                     lastToastTimestamps.current[config.nodeId] = now;
                 }
             } else {
                 // If value was out of range but is now back, clear the cooldown
                 if (lastToastTimestamps.current[config.nodeId]) {
                     delete lastToastTimestamps.current[config.nodeId];
                     // Optional: Clear the toast if it's still visible
                      // toast.dismiss(`value-alert-${config.nodeId}`); // Sonner allows dismissal by ID
                 }
             }

            content = isOnOff ? displayValue : <>{displayValue}<span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>;

        } else if (typeof value === 'string') {
            // Handle string formatting based on dataType
            if (config.dataType === 'DateTime') {
                try {
                    // Use isValidDate check if available or more robust parsing
                    const date = new Date(value);
                    content = date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
                } catch {
                    content = value; // Fallback to raw string if parsing fails
                }
            } else if (config.dataType === 'Guid') {
                 content = value.length > 8 ? `${value.substring(0, 8)}...` : value; // Shorten GUIDs
            } else if (config.dataType === 'ByteString') {
                 content = `[${value.length} bytes]`; // Show size for ByteString
            }
            else {
                 content = value.length > 25 ? `${value.substring(0, 22)}...` : value; // Truncate long strings
            }
            valueClass = "text-sm text-muted-foreground font-normal"; // Default style for strings
        } else {
            // Fallback for unhandled types
            content = <span className="text-yellow-500">?</span>;
            valueClass = "text-yellow-500";
            iconPrefix = <Info size={14} className="mr-1 inline-block" />;
        }

        return (
            // AnimatePresence helps with exit animations when the key changes
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={key} // Animate when key changes (value or theme changes)
                    className={`inline-flex items-center ${valueClass}`}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.6 }} // Exit animation
                    transition={{ duration: 0.15, ease: "linear" }} // Quick linear transition
                >
                    {iconPrefix}
                    {content}
                </motion.span>
            </AnimatePresence>
        );
    }
);

ValueDisplayContent.displayName = 'ValueDisplayContent';

export default ValueDisplayContent;