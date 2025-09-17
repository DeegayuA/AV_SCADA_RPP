'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAiSettings } from '@/lib/ai-settings-store';

const GREETING_SESSION_KEY = 'aiGreetingShown';

export const OnloadGreetingPopup: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [useRainbowBorder, setUseRainbowBorder] = useState(true);

    useEffect(() => {
        const greetingShown = sessionStorage.getItem(GREETING_SESSION_KEY);
        if (!greetingShown) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                sessionStorage.setItem(GREETING_SESSION_KEY, 'true');
            }, 1500); // Delay before showing

            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (isVisible) {
            const loadSettings = async () => {
                const settings = await getAiSettings();
                if (settings) {
                    setUseRainbowBorder(settings.useRainbowBorder);
                }
            };
            loadSettings();

            const autoDismissTimer = setTimeout(() => {
                setIsVisible(false);
            }, 8000); // Auto-dismiss after 8 seconds

            return () => clearTimeout(autoDismissTimer);
        }
    }, [isVisible]);

    const rainbowBorderClass = "p-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 animate-gradient-xy";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.8 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={cn(
                        "fixed top-5 right-5 w-auto max-w-sm flex items-start gap-3 rounded-2xl shadow-2xl overflow-hidden border z-50",
                        useRainbowBorder ? rainbowBorderClass : "p-0 border-transparent"
                    )}
                >
                    <div className="flex items-start gap-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-300 dark:border-slate-600">
                           <Bot className="h-6 w-6 text-slate-500" />
                        </div>
                        <div className="flex-grow">
                             <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Intelligent Energy Assistant</h3>
                             <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                Ready to assist! I'm now active in your dashboard.
                             </p>
                             <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                        </div>
                        <Button variant="ghost" size="icon" className="flex-shrink-0 -mr-2 -mt-2 h-8 w-8" onClick={() => setIsVisible(false)}>
                            <X className="h-5 w-5" />
                            <span className="sr-only">Dismiss</span>
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
