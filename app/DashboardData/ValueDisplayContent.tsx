// app/DashboardData/ValueDisplayContent.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { DataPoint } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import { formatValue } from './formatValue';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ValueDisplayContentProps {
    item: DataPoint;
    nodeValues: NodeData;
    isDisabled: boolean; // This is the effectiveIsDisabled from DataPointDisplayCard
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    isEditMode: boolean;
}

const ValueDisplayContent: React.FC<ValueDisplayContentProps> = ({
    item,
    nodeValues,
    isDisabled, // Represents effectiveIsDisabled
    sendDataToWebSocket,
    playNotificationSound,
    lastToastTimestamps,
    isEditMode,
}) => {
    const rawValue = nodeValues[item.nodeId];
    const numericValue = typeof rawValue === 'number' ? rawValue : 
                        (typeof rawValue === 'string' ? parseFloat(rawValue) : null);
    const displayValue = formatValue(
        numericValue === null || numericValue === undefined || isNaN(numericValue) 
            ? null 
            : numericValue, 
        item
    );

    const [inputValue, setInputValue] = useState<string>(
        rawValue !== undefined && rawValue !== null ? String(rawValue) : ''
    );
    const [isInputFocused, setIsInputFocused] = useState(false);

    useEffect(() => {
        if (!isInputFocused) {
            setInputValue(rawValue !== undefined && rawValue !== null ? String(rawValue) : '');
        }
    }, [rawValue, isInputFocused]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const validateAndSendData = useCallback(() => {
        // Component is disabled (e.g. disconnected) or item itself is not writable.
        if (isDisabled || !item.isWritable) {
            toast.warning('Cannot send data', { description: 'Input is disabled or data point is not writable.' });
            setInputValue(String(rawValue)); // Revert to original value
            return;
        }

        let processedValue: number | boolean | string;
        const trimmedValue = inputValue.trim();

        if (trimmedValue === String(rawValue)) { // No change
            setIsInputFocused(false);
            return;
        }

        if (trimmedValue === '') {
            toast.error('Invalid input', { description: 'Input value cannot be empty.' });
            setInputValue(String(rawValue)); // Revert
            return;
        }

        // Attempt to parse based on dataType
        switch (item.dataType) {
            case 'Int16':
            case 'Int32':
            case 'UInt16':
            case 'UInt32':
            case 'Byte':
            case 'SByte':
            case 'Int64':
            case 'UInt64':
                processedValue = parseInt(trimmedValue, 10);
                if (isNaN(processedValue) || !Number.isInteger(processedValue)) {
                    toast.error('Invalid input', { description: `Value must be an integer for ${item.dataType}.` });
                    setInputValue(String(rawValue)); // Revert
                    return;
                }
                break;
            case 'Float':
            case 'Double':
                processedValue = parseFloat(trimmedValue);
                if (isNaN(processedValue)) {
                    toast.error('Invalid input', { description: `Value must be a number for ${item.dataType}.` });
                    setInputValue(String(rawValue)); // Revert
                    return;
                }
                break;
            case 'Boolean':
                if (trimmedValue.toLowerCase() === 'true' || trimmedValue === '1') {
                    processedValue = true;
                } else if (trimmedValue.toLowerCase() === 'false' || trimmedValue === '0') {
                    processedValue = false;
                } else {
                    toast.error('Invalid input', { description: 'Value must be true/false or 1/0 for Boolean.' });
                    setInputValue(String(rawValue)); // Revert
                    return;
                }
                break;
            case 'String':
            default: // Includes types like DateTime, Guid etc. Send as string if writable.
                processedValue = trimmedValue;
                break;
        }

        // Check min/max if defined and value is numeric
        if (typeof processedValue === 'number') {
            if (item.min !== undefined && processedValue < item.min) {
                toast.error('Validation Error', { description: `Value for ${item.name} must be >= ${item.min}.` });
                setInputValue(String(rawValue)); // Revert
                return;
            }
            if (item.max !== undefined && processedValue > item.max) {
                toast.error('Validation Error', { description: `Value for ${item.name} must be <= ${item.max}.` });
                setInputValue(String(rawValue)); // Revert
                return;
            }
        }

        sendDataToWebSocket(item.nodeId, processedValue);
        toast.success('Data sent', { description: `${item.name} will be updated to ${processedValue}.` });
        // playNotificationSound?.('info'); // Or success, depending on desired feedback
        setIsInputFocused(false); // Remove focus after successful send
    }, [inputValue, item, isDisabled, sendDataToWebSocket, rawValue, playNotificationSound]);

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            validateAndSendData();
            (event.target as HTMLInputElement).blur();
        } else if (event.key === 'Escape') {
            setInputValue(String(rawValue)); // Revert to original value
            setIsInputFocused(false);
            (event.target as HTMLInputElement).blur();
        }
    };

    const handleFocus = () => {
        if (isEditMode && item.isWritable && item.uiType === 'display' && !isDisabled) {
            setIsInputFocused(true);
        }
    };

    const handleBlur = () => {
        // Send data on blur only if focused and value has changed
        if (isInputFocused && inputValue !== String(rawValue)) {
             validateAndSendData();
        }
        setIsInputFocused(false);
    };

    if (isEditMode && item.isWritable && item.uiType === 'display' && !isDisabled) {
        return (
            <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress} // Changed from onKeyPress to onKeyDown for Escape
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={isDisabled} // This is the effectiveIsDisabled for the card
                aria-label={`${item.name} inline input`}
                className={`h-7 text-sm text-right w-full min-w-[60px] max-w-[120px] px-1 py-0 border-dashed ${isInputFocused ? 'border-primary ring-1 ring-primary': 'border-transparent hover:border-muted-foreground/50'}`}
                placeholder="Edit..."
            />
        );
    }

    return (
        <span className={rawValue === 'Error' || rawValue === undefined ? 'text-red-500' : ''} title={`Node ID: ${item.nodeId}`}>
            {displayValue}
        </span>
    );
};

export default ValueDisplayContent;