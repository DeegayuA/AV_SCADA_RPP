'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server, HardDrive, PlugZap, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlcConnectionStatusProps {
    status: 'online' | 'offline' | 'disconnected';
    esp32Status: 'connected' | 'disconnected';
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status, esp32Status }) => {

    const handleReconnect = async () => {
        if (status !== 'disconnected') return;

        toast.info('Attempting to reconnect to PLC...', { id: 'plc-reconnect' });
        try {
            const response = await fetch('/api/opcua/reconnect', { method: 'POST' });
            if (response.ok) {
                toast.success('Reconnection process initiated.', { id: 'plc-reconnect' });
            } else {
                const data = await response.json();
                toast.error('Failed to initiate reconnection.', { id: 'plc-reconnect', description: data.message });
            }
        } catch (error) {
            toast.error('Failed to initiate reconnection.', { id: 'plc-reconnect', description: 'Check the server connection.' });
        }
    };

    const getPlcStatusInfo = () => {
        switch (status) {
            case 'online':
                return {
                    text: 'PLC: Remote',
                    Icon: Server,
                    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                    title: 'PLC connected remotely via API',
                    pulsate: true,
                };
            case 'offline':
                return {
                    text: 'PLC: Local',
                    Icon: HardDrive,
                    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
                    title: 'PLC connected locally',
                    pulsate: true,
                };
            case 'disconnected':
            default:
                return null; // Don't render anything if disconnected
        }
    };

    const getEsp32StatusInfo = () => {
        if (esp32Status === 'connected') {
            return {
                text: 'ESP32',
                Icon: Cpu,
                className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
                title: 'ESP32 Connected',
                pulsate: true,
            };
        }
        return null;
    };

    const plcStatusInfo = getPlcStatusInfo();
    const esp32StatusInfo = getEsp32StatusInfo();

    return (
        <div className="flex items-center gap-2">
            {plcStatusInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    onClick={handleReconnect}
                                    className={cn(
                                        'flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors',
                                        plcStatusInfo.className
                                    )}
                                >
                                    <motion.div
                                        animate={plcStatusInfo.pulsate ? { scale: [1, 1.1, 1], transition: { duration: 2, repeat: Infinity } } : {}}
                                    >
                                        <plcStatusInfo.Icon className="h-4 w-4" />
                                    </motion.div>
                                    <span>{plcStatusInfo.text}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>{plcStatusInfo.title}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </motion.div>
            )}
            {esp32StatusInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        'flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors',
                                        esp32StatusInfo.className
                                    )}
                                >
                                    <motion.div
                                        animate={esp32StatusInfo.pulsate ? { scale: [1, 1.1, 1], transition: { duration: 2, repeat: Infinity } } : {}}
                                    >
                                        <esp32StatusInfo.Icon className="h-4 w-4" />
                                    </motion.div>
                                    <span>{esp32StatusInfo.text}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>{esp32StatusInfo.title}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </motion.div>
            )}
        </div>
    );
});

PlcConnectionStatus.displayName = 'PlcConnectionStatus';

export default PlcConnectionStatus;
