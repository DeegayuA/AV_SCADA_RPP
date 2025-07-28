// app/DashboardData/page.tsx
'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion'; // Import Variants
import { HardHat, Wrench, Cog, BarChart3 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PLANT_NAME, VERSION } from '@/config/constants';
import ThemeToggle from './ThemeToggle';

const PlaceholderHeader: React.FC = () => {
    const headerTitle = `${PLANT_NAME || 'Project'} - Page Under Construction`;

    return (
        <motion.header
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative top-0 left-0 right-0 z-50 flex justify-between items-center py-3 px-4 sm:py-4 sm:px-6 bg-background/80 backdrop-blur-md shadow-sm w-full"
        >
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {headerTitle}
            </h1>
            <div className="flex items-center space-x-2 sm:space-x-3">
                <ThemeToggle />
                <span className='text-xs sm:text-sm text-muted-foreground font-mono whitespace-nowrap'>
                    {VERSION || '?.?.?'}
                </span>
            </div>
        </motion.header>
    );
};

const ConstructionAnimation: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const iconContainerVariants: Variants = { // Corrected: Added Variants type
        initial: {},
        animate: {
            transition: {
                staggerChildren: 0.3,
            },
        },
    };
    
    const floatingIconVariants: Variants = { // Corrected: Added Variants type
        initial: { opacity: 0, y: 20, scale: 0.8 },
        animate: (i: number) => ({
            opacity: [0, 0.7, 0.7, 0],
            y: [20, -20, -20, 20],
            scale: [0.8, 1.1, 1.1, 0.8],
            rotate: Math.random() * 720 - 360,
            transition: {
                duration: 5 + Math.random() * 3,
                repeat: Infinity,
                repeatDelay: 2 + Math.random() * 2,
                delay: i * 0.5 + Math.random() * 1,
                ease: "easeInOut",
            },
        }),
    };

    const mainCogVariants: Variants = { // Corrected: Added Variants type
        animate: {
            rotate: 360,
            transition: {
                duration: 20,
                ease: 'linear',
                repeat: Infinity,
            },
        },
    };

    const textBlockVariants: Variants = { // Corrected: Added Variants type
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.1,
            }
        }
    };
    
    const textLineVariants: Variants = { // Corrected: Added Variants type
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    const titleMessage = "Coming Soon!";
    const subMessage1 = "Our digital construction crew is hard at work.";
    const subMessage2 = "This section is being crafted with care and will be unveiled shortly.";


    return (
        <motion.div
            className="relative flex flex-col items-center justify-center text-center p-4 sm:p-8 overflow-hidden w-full"
            initial="hidden"
            animate="visible"
            variants={textBlockVariants}
        >
            <motion.div 
                className="absolute inset-0 opacity-50"
                variants={iconContainerVariants}
            >
                {[...Array(5)].map((_, i) => {
                    const Icon = [HardHat, Wrench, BarChart3, Cog][i % 4];
                    const size = 20 + Math.random() * 30;
                    return (
                        <motion.div
                            key={`float-${i}`}
                            custom={i}
                            variants={floatingIconVariants}
                            className="absolute text-primary/30 dark:text-primary/20"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                        >
                            <Icon size={size} />
                        </motion.div>
                    );
                })}
            </motion.div>

            <div className="relative z-10 flex flex-col items-center">
                 <motion.div
                    className="mb-8 text-primary"
                    variants={mainCogVariants}
                    animate="animate"
                >
                    <Cog size={100} strokeWidth={1.5} />
                </motion.div>

                <motion.h2
                    variants={textLineVariants}
                    className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-amber-500 dark:from-primary dark:via-orange-400 dark:to-amber-400"
                >
                    {titleMessage}
                </motion.h2>

                <motion.p
                    variants={textLineVariants}
                    className="text-lg sm:text-xl text-muted-foreground max-w-md mb-2"
                >
                    {subMessage1}
                </motion.p>
                <motion.p
                    variants={textLineVariants}
                    className="text-md sm:text-lg text-muted-foreground max-w-lg mb-10"
                >
                    {subMessage2}
                </motion.p>
                
                <motion.div variants={textLineVariants}>
                    <Wrench className={`inline-block mr-2 h-6 w-6 animate-spin-slow ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <HardHat className={`inline-block h-6 w-6 animate-bounce ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                </motion.div>
            </div>

            <motion.div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, transition: { duration: 1, delay: 0.5, ease: "easeInOut" } }}
            />

        </motion.div>
    );
};

const Dashboard: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground pt-20 sm:pt-24 pb-8 px-2 sm:px-4">
            <PlaceholderHeader />
            <main className="flex-grow flex items-center justify-center w-full">
                <ConstructionAnimation />
            </main>
        </div>
    );
};
Dashboard.displayName = 'DashboardPlaceholder';

export default Dashboard;