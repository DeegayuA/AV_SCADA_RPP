'use client';

// src/components/dashboard/ThemeToggle.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const ThemeToggle: React.FC = React.memo(() => {
    const { resolvedTheme, setTheme } = useTheme();
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    const title = `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`;

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* Button with asChild forwards props including onClick, ref to motion.button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        aria-label={title}
                        asChild
                    >
                        <motion.button
                             className="text-muted-foreground hover:text-foreground transition-colors"
                             whileHover={{ scale: 1.1, rotate: 15 }}
                             whileTap={{ scale: 0.9 }}
                         >
                            <Icon className="w-5 h-5" />
                        </motion.button>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{title}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;