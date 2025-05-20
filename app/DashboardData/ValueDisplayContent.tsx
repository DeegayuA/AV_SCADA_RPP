'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DataPoint } from '@/config/dataPoints'; // Updated import
import { useTheme } from 'next-themes';
import { formatValue } from './formatValue';
import { NodeData } from './dashboardInterfaces';

interface ValueDisplayContentProps {
    item: DataPoint; // FIX 1: Corrected item type
    nodeValues: NodeData;
    isDisabled: boolean;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    isEditMode: boolean;
}

const ValueDisplayContent: React.FC<ValueDisplayContentProps> = React.memo(
    ({ item: config, nodeValues, isDisabled, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, isEditMode }) => {
        // Safely derive nodeId. It defaults to '' if config.nodeId is not present or falsy.
        const nodeId = ('nodeId' in config && config.nodeId) ? config.nodeId : '';
        const value = nodeId ? nodeValues[nodeId] : undefined;
        const { resolvedTheme } = useTheme();
        const key = `${nodeId}-${String(value)}-${resolvedTheme}`; // Key for AnimatePresence
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
            const isOutOfRange = !isOnOff && (
                 (min !== undefined && adjustedValue < min) ||
                 (max !== undefined && adjustedValue > max)
            );

            if (isOnOff) {
                valueClass = `font-semibold ${displayValue === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
            } else if (isOutOfRange) {
                 valueClass = "text-yellow-600 dark:text-yellow-400 font-semibold";
                 iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />;

                 const now = Date.now();
                 // Only proceed with toast logic if nodeId is valid
                 if (nodeId) {
                    const lastToastTime = lastToastTimestamps.current[nodeId];
                    const cooldown = 60 * 1000; // 60 seconds

                    if (!lastToastTime || now - lastToastTime > cooldown) {
                        const direction = (min !== undefined && adjustedValue < min) ? 'below minimum' : 'above maximum';
                        const rangeText = `(Range: ${formatValue(min ?? null, config)} to ${formatValue(max ?? null, config)})`;
                        toast.warning('Value Alert', {
                            description: `${config.name}: ${displayValue}${unit || ''} is ${direction} ${rangeText}.`,
                            duration: 8000,
                            id: `value-alert-${nodeId}`
                        });
                        playNotificationSound('warning');
                        lastToastTimestamps.current[nodeId] = now; // FIX 2: Use derived nodeId
                    }
                 }
             } else {
                 // If value was out of range but is now back, clear the cooldown
                 // Only proceed if nodeId is valid
                 if (nodeId && lastToastTimestamps.current[nodeId]) {
                     delete lastToastTimestamps.current[nodeId];
                     // Optional: Clear the toast if it's still visible and if nodeId is valid
                     toast.dismiss(`value-alert-${nodeId}`); // FIX 3: Use derived nodeId
                 }
             }
            content = isOnOff ? displayValue : <>{displayValue}<span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>;

        } else if (typeof value === 'string') {
            if (config.dataType === 'DateTime') {
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) { // Check if date is valid
                        content = date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
                    } else {
                        content = value; // Fallback for invalid date string
                    }
                } catch {
                    content = value; // Fallback to raw string if parsing fails
                }
            } else if (config.dataType === 'Guid') {
                 content = value.length > 8 ? `${value.substring(0, 8)}...` : value;
            } else if (config.dataType === 'ByteString') {
                 content = `[${value.length} bytes]`;
            }
            else {
                 content = value.length > 25 ? `${value.substring(0, 22)}...` : value;
            }
            valueClass = "text-sm text-muted-foreground font-normal";
        } else {
            content = <span className="text-yellow-500">?</span>;
            valueClass = "text-yellow-500";
            iconPrefix = <Info size={14} className="mr-1 inline-block" />;
        }

        return (
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={key}
                    className={`inline-flex items-center ${valueClass}`}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.6 }}
                    transition={{ duration: 0.15, ease: "linear" }}
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