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

interface SoundToggleProps {
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
}

const SoundToggle: React.FC<SoundToggleProps> = React.memo(({ soundEnabled, setSoundEnabled }) => {
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
                            className={`transition-colors rounded-full ${
                                soundEnabled
                                    ? 'text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200'
                                    : 'text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200'
                            }`}
                            whileHover={{ scale: 1.1, rotate: 10 }}
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