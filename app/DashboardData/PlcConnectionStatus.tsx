'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server, HardDrive, PlugZap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlcConnectionStatusProps {
    status: 'online' | 'offline' | 'disconnected';
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status }) => {

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

    const getStatusInfo = () => {
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
                return {
                    text: 'PLC: Off',
                    Icon: PlugZap,
                    className: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700',
                    title: 'PLC Disconnected. Click to attempt reconnection.',
                    pulsate: false,
                };
        }
    };

    const { text, Icon, className, title, pulsate } = getStatusInfo();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            onClick={handleReconnect}
                            className={cn(
                                'flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors',
                                className
                            )}
                        >
                            <motion.div
                                animate={pulsate ? { scale: [1, 1.1, 1], transition: { duration: 2, repeat: Infinity } } : {}}
                            >
                                <Icon className="h-4 w-4" />
                            </motion.div>
                            <span>{text}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </motion.div>
    );
});

PlcConnectionStatus.displayName = 'PlcConnectionStatus';

export default PlcConnectionStatus;
