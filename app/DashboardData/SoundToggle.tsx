'use client';

// src/components/dashboard/SoundToggle.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BellOff, Bell } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
// playSound utility is likely used in the main Dashboard component
// import { playSound } from '@/lib/utils'; // Assume this exists
import { useAppStore } from '@/stores/appStore'; // Import useAppStore

// interface SoundToggleProps { // No longer needed as props
//     soundEnabled: boolean;
//     setSoundEnabled: (enabled: boolean) => void;
// }

const SoundToggle: React.FC = React.memo(() => { // Removed props
    const soundEnabled = useAppStore((state) => state.soundEnabled);
    const setSoundEnabled = useAppStore((state) => state.setSoundEnabled);
    const title = soundEnabled ? 'Mute Notifications' : 'Unmute Notifications';

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        aria-label={title}
                        asChild
                    >
                        <motion.button
                            className={`transition-colors rounded-full p-1.5 ${ // Added explicit padding
                                !soundEnabled
                                    ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-700/20'
                                    : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-700/20'
                            }`}
                            whileHover={{ scale: 1.1, rotate: soundEnabled ? 10 : -10 }} // Rotate different directions
                            whileTap={{ scale: 0.9 }}
                        >
                            {!soundEnabled ? (
                                <BellOff className="w-5 h-5" />
                            ) : (
                                <Bell className="w-5 h-5" />
                            )}
                        </motion.button>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{title}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

SoundToggle.displayName = 'SoundToggle';

export default SoundToggle;
