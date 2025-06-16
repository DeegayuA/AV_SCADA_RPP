// src/components/dashboard/DataPointInputCard.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import { HelpCircle, Check, Save } from 'lucide-react'; // Default icon and save icon
import { Button } from '@/components/ui/button'; // For save button
import { toast } from 'sonner'; // For user feedback

interface DataPointInputCardProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean; // Disable based on connection status or if point is not writable
    sendData: (nodeId: string, value: boolean | number | string) => void;
    // Consider adding playNotificationSound if needed for feedback
}

const DataPointInputCard: React.FC<DataPointInputCardProps> = React.memo(
    ({ point, nodeValue, isDisabled, sendData }) => {
        const PointIcon = point.icon || HelpCircle;
        const [currentValue, setCurrentValue] = useState<string>(
            nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : ''
        );
        const [isFocused, setIsFocused] = useState(false);

        // Update current value if nodeValue changes from upstream
        React.useEffect(() => {
            if (!isFocused) { // Only update if not currently being edited by the user
                setCurrentValue(nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '');
            }
        }, [nodeValue, isFocused]);

        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            setCurrentValue(event.target.value);
        };

        const validateAndSendData = useCallback(() => {
            if (isDisabled || !point.isWritable) {
                toast.warning('Cannot send data', { description: 'Input is disabled or data point is not writable.' });
                return;
            }

            let numericValue: number;
            const trimmedValue = currentValue.trim();

            if (trimmedValue === '') {
                toast.error('Invalid input', { description: 'Input value cannot be empty.' });
                return;
            }

            switch (point.dataType) {
                case 'Int16':
                case 'Int32':
                case 'UInt16':
                case 'UInt32':
                case 'Byte':
                case 'SByte':
                case 'Int64':
                case 'UInt64':
                    numericValue = parseInt(trimmedValue, 10);
                    if (isNaN(numericValue) || !Number.isInteger(numericValue)) {
                        toast.error('Invalid input', { description: `Value must be an integer for ${point.dataType}.` });
                        return;
                    }
                    break;
                case 'Float':
                case 'Double':
                    numericValue = parseFloat(trimmedValue);
                    if (isNaN(numericValue)) {
                        toast.error('Invalid input', { description: `Value must be a number for ${point.dataType}.` });
                        return;
                    }
                    break;
                default:
                    // For other data types, we might want to send as string or handle differently
                    // For now, we focus on numerical types. If it's not numeric and writable, send as string.
                    if (point.isWritable) {
                         sendData(point.nodeId, trimmedValue);
                         toast.success('Data sent', { description: `${point.name} updated to ${trimmedValue}.` });
                    } else {
                        toast.error('Unsupported type', { description: `Data point ${point.name} has an unsupported type for numerical input: ${point.dataType}.` });
                    }
                    return;
            }

            // Check min/max if defined
            if (point.min !== undefined && numericValue < point.min) {
                toast.error('Validation Error', { description: `Value for ${point.name} must be >= ${point.min}.` });
                return;
            }
            if (point.max !== undefined && numericValue > point.max) {
                toast.error('Validation Error', { description: `Value for ${point.name} must be <= ${point.max}.` });
                return;
            }

            sendData(point.nodeId, numericValue);
            // Optionally, provide user feedback e.g., toast notification
            // playNotificationSound?.('success');
            toast.success('Data sent', { description: `${point.name} updated to ${numericValue}.` });
            setIsFocused(false); // Remove focus after successful send
        }, [currentValue, point, isDisabled, sendData]);

        const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                validateAndSendData();
                (event.target as HTMLInputElement).blur(); // Remove focus from input
            }
        };

        const handleFocus = () => {
            setIsFocused(true);
        };

        const handleBlur = () => {
            setIsFocused(false);
            // Optionally, send data on blur if the value has changed from the original nodeValue
            // However, current implementation uses an explicit save button/Enter key press
        };

        const effectiveIsDisabled = isDisabled || !point.isWritable;

        return (
            <motion.div className="col-span-1">
                <TooltipProvider delayDuration={200}>
                    <Card className={`h-full p-3 flex items-center justify-between cursor-default transition-opacity shadow-sm hover:shadow-md border dark:border-border/50 bg-card min-h-[60px] sm:min-h-[64px] ${effectiveIsDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help">
                                <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-xs font-medium truncate text-card-foreground/80" title={point.name}>
                                    {point.name}
                                </span>
                            </div>
                        </TooltipTrigger>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Input
                                type="text" // Keep as text to allow intermediate non-numeric chars, validation handles final value
                                value={currentValue}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                disabled={effectiveIsDisabled}
                                aria-label={`${point.name} input`}
                                className="w-24 sm:w-28 h-8 text-sm text-right"
                                placeholder={point.unit || "Enter value"}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={validateAndSendData}
                                disabled={effectiveIsDisabled || currentValue === String(nodeValue)} // Disable if no change or disabled
                                className="h-8 w-8"
                                title={`Save value for ${point.name}`}
                            >
                                <Save className="h-4 w-4" />
                            </Button>
                        </div>
                        <TooltipContent side="bottom">
                            <p>{point.description ?? 'Enter a numeric value.'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                ID: {point.nodeId} ({point.dataType})
                                {point.unit && `, Unit: ${point.unit}`}
                                {point.min !== undefined && `, Min: ${point.min}`}
                                {point.max !== undefined && `, Max: ${point.max}`}
                            </p>
                        </TooltipContent>
                    </Card>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointInputCard.displayName = 'DataPointInputCard';

export default DataPointInputCard;
