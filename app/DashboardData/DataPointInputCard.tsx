// src/components/dashboard/DataPointInputCard.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { HelpCircle, Save, Edit3 } from 'lucide-react'; // Added Edit3 icon
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DataPointInputCardProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean; // General disable, e.g., OPC connection lost
    sendData: (nodeId: string, value: boolean | number | string) => void;
    isEditMode: boolean; // From dashboard - is overall editing enabled?
}

const DataPointInputCard: React.FC<DataPointInputCardProps> = React.memo(
    ({ point, nodeValue, isDisabled, sendData, isEditMode }) => {
        const PointIcon = point.icon ? point.icon : HelpCircle;
        const [currentValue, setCurrentValue] = useState<string>(
            nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : ''
        );
        const [isCardFocused, setIsCardFocused] = useState(false); // User is interacting with this specific card's input
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            if (!isCardFocused) {
                setCurrentValue(nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '');
            }
        }, [nodeValue, isCardFocused]);

        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            setCurrentValue(event.target.value);
        };

        const validateAndSendData = useCallback(() => {
            if (isDisabled || !point.isWritable) {
                toast.warning('Cannot send data', { description: 'Input is disabled or data point is not writable.' });
                return;
            }
            // ... (rest of validation logic remains the same)
            const trimmedValue = currentValue.trim();

            if (trimmedValue === '' && (point.dataType !== 'String' && point.dataType !== 'DateTime' && point.dataType !== 'LocalizedText')) {
                toast.error('Invalid input', { description: 'Input value cannot be empty for non-string types.' });
                return;
            }
            
            let finalValueToSend: string | number | boolean;

            switch (point.dataType) {
                case 'Int16': case 'Int32': case 'UInt16': case 'UInt32':
                case 'Byte': case 'SByte': case 'Int64': case 'UInt64':
                    const parsedInt = parseInt(trimmedValue, 10);
                    if (isNaN(parsedInt) || !Number.isInteger(Number(trimmedValue))) {
                        toast.error('Invalid input', { description: `Value must be a whole integer for ${point.dataType}.` });
                        return;
                    }
                    finalValueToSend = parsedInt;
                    break;
                case 'Float': case 'Double':
                    const parsedFloat = parseFloat(trimmedValue);
                    if (isNaN(parsedFloat)) {
                        toast.error('Invalid input', { description: `Value must be a number for ${point.dataType}.` });
                        return;
                    }
                    finalValueToSend = parsedFloat;
                    break;
                case 'Boolean':
                    if (trimmedValue.toLowerCase() === 'true' || trimmedValue === '1') finalValueToSend = true;
                    else if (trimmedValue.toLowerCase() === 'false' || trimmedValue === '0') finalValueToSend = false;
                    else {
                        toast.error('Invalid input', { description: `Value for Boolean must be 'true', 'false', '1', or '0'.` });
                        return;
                    }
                    break;
                case 'String': case 'LocalizedText': case 'DateTime':
                     finalValueToSend = trimmedValue;
                     break;
                default:
                    if (point.isWritable) {
                         console.warn(`Attempting to send value for dataType ${point.dataType} as string.`);
                         finalValueToSend = trimmedValue;
                    } else {
                        toast.error('Unsupported type', { description: `Data point ${point.name} has an unsupported type for input: ${point.dataType}.` });
                        return;
                    }
                    break;
            }
            
            if (typeof finalValueToSend === 'number') {
                 if (point.min !== undefined && finalValueToSend < point.min) {
                    toast.error('Validation Error', { description: `Value for ${point.label || point.name} must be >= ${point.min}.` });
                    return;
                }
                if (point.max !== undefined && finalValueToSend > point.max) {
                    toast.error('Validation Error', { description: `Value for ${point.label || point.name} must be <= ${point.max}.` });
                    return;
                }
            }

            sendData(point.nodeId, finalValueToSend);
            toast.success('Data sent', { description: `${point.label || point.name} updated to ${String(finalValueToSend)}.` });
            setIsCardFocused(false); // Exit editing mode for this card
        }, [currentValue, point, isDisabled, sendData]);

        const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                validateAndSendData();
                (event.target as HTMLInputElement).blur(); // also calls handleBlur, setting isCardFocused to false
            }
            if (event.key === 'Escape') {
                // Revert to original nodeValue and exit focus
                setCurrentValue(nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '');
                setIsCardFocused(false);
                (event.target as HTMLInputElement).blur();
            }
        };

        const handleInputFocus = () => {
            setIsCardFocused(true);
        };

        const handleInputBlur = () => {
            // Delay blur slightly to allow save button click
            setTimeout(() => {
              // Check if focus is still within the card (e.g., moved to Save button)
              // This is a bit tricky, often handled by keeping a ref to the card and checking relatedTarget
              // For simplicity now, just setting to false. If save button click is missed, a dedicated "edit" button helps.
                setIsCardFocused(false);
                // Optionally: if value changed, ask to save or revert. Current logic reverts if not explicitly saved.
                 if (currentValue !== (nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '')) {
                     // If value changed but not saved, revert it.
                     // setCurrentValue(nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '');
                     // toast.info("Changes not saved", {description: "Input reverted to original value."})
                     // For now, let's keep the changed value to allow saving via button even after blur
                 }
            }, 100);
        };

        const handleEditClick = () => {
            if (!isDisabled && point.isWritable && isEditMode) {
                setIsCardFocused(true);
                setTimeout(() => inputRef.current?.focus(), 0); // Focus the input after state update
            }
        };
        
        // This is true if dashboard allows edit AND point is writable AND not generally disabled
        const canEverEdit = isEditMode && point.isWritable && !isDisabled;
        // This is true if the card is actively being edited (input field is focused)
        const isActivelyEditing = isCardFocused && canEverEdit;

        const valueHasChanged = currentValue !== (nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : '');

        const displayValue = currentValue || (point.dataType === 'String' || point.dataType === 'DateTime' || point.dataType === 'LocalizedText' ? '' : 'N/A');
        const displayUnit = point.unit || '';

        return (
            <motion.div className="col-span-1">
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <Card 
                            className={`
                                h-full p-3 flex items-center justify-between
                                transition-all duration-150 ease-in-out 
                                shadow-sm hover:shadow-md 
                                border border-border dark:border-border/60 
                                bg-card text-card-foreground 
                                min-h-[60px] sm:min-h-[64px]
                                ${isDisabled ? 'opacity-60 pointer-events-none' : ''}
                                ${!point.isWritable && !isDisabled ? 'opacity-80' : ''}
                            `}
                        >
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2.5 overflow-hidden mr-2 flex-1 cursor-help">
                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-xs font-medium truncate text-card-foreground/90 dark:text-card-foreground/80" title={point.name}>
                                        {point.label || point.name} 
                                    </span>
                                </div>
                            </TooltipTrigger>
                            
                            {/* Value display / Input field area */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isActivelyEditing ? (
                                    <>
                                        <Input
                                            ref={inputRef}
                                            type="text"
                                            value={currentValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyPress} // Changed from onKeyPress to onKeyDown for Escape
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            disabled={isDisabled || !point.isWritable} // Redundant as isActivelyEditing checks this
                                            aria-label={`${point.label || point.name} input`}
                                            className="
                                                w-auto max-w-[100px] sm:max-w-[120px] md:max-w-[150px] 
                                                h-8 sm:h-9 text-sm text-right 
                                                bg-transparent hover:bg-muted/50 focus:bg-background
                                                border border-input 
                                                focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 
                                            "
                                            placeholder={point.unit || "value"}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={validateAndSendData}
                                            disabled={isDisabled || !point.isWritable || !valueHasChanged} 
                                            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-primary disabled:text-muted-foreground/50"
                                            title={`Save value for ${point.label || point.name}`}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                    <span 
                                        className={`
                                            text-sm font-medium text-right
                                            text-card-foreground/90 dark:text-card-foreground/80
                                            min-w-[60px] max-w-[150px] truncate py-1.5 px-2 rounded-md
                                            ${canEverEdit ? 'cursor-text hover:bg-muted/30 dark:hover:bg-muted/20' : ''}
                                        `}
                                        onClick={handleEditClick}
                                        title={canEverEdit ? "Click to edit" : (point.description || "Current value")}
                                    >
                                        {displayValue}
                                        {displayUnit && ` ${displayUnit}`}
                                    </span>
                                    {/* Show a subtle edit icon if it can be edited */}
                                    {canEverEdit && (
                                         <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleEditClick}
                                            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground/70 hover:text-primary"
                                            title={`Edit ${point.label || point.name}`}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {!canEverEdit && point.isWritable && ( // Is writable but not in edit mode
                                        <div className="h-8 w-8 sm:h-9 sm:w-9"></div> // Placeholder for alignment
                                    )}
                                    </>
                                )}
                            </div>
                            <TooltipContent side="bottom" className="max-w-xs text-sm">
                                <p className="font-semibold text-foreground">{point.label || point.name}</p>
                                {point.description && <p className="text-xs text-muted-foreground mt-1">{point.description}</p> }
                                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-0.5">
                                    <p>ID: <span className="font-mono bg-muted/80 dark:bg-muted/30 px-1 py-0.5 rounded">{point.nodeId}</span></p>
                                    <p>Type: <span className="font-mono bg-muted/80 dark:bg-muted/30 px-1 py-0.5 rounded">{point.dataType}</span></p>
                                    {point.unit && <p>Unit: {point.unit}</p>}
                                    {point.min !== undefined && <p>Min: {point.min}</p>}
                                    {point.max !== undefined && <p>Max: {point.max}</p>}
                                    {!point.isWritable && <p className="text-orange-500 dark:text-orange-400">Read-only</p>}
                                    {isEditMode && point.isWritable && <p className="text-sky-500 dark:text-sky-400">Editing Enabled</p>}

                                </div>
                            </TooltipContent>
                        </Card>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointInputCard.displayName = 'DataPointInputCard';

export default DataPointInputCard;