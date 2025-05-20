// components/dashboard/WelcomeExperience.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, BarChart3, Settings2, ChevronRight } from 'lucide-react'; // Example icons

interface WelcomeExperienceProps {
  userName?: string; // Optional user name for personalization
  onGetStarted?: () => void; // Optional action for a primary button
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.5 } 
  },
  hover: { 
    scale: 1.1,
    rotate: 5,
    transition: { type: "spring", stiffness: 300, damping: 10 }
  }
};

const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ userName, onGetStarted }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-lg " // Removed bg-card for more flexibility if used on custom bg
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        variants={iconVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="mb-6 p-4 bg-primary/10 dark:bg-primary/20 rounded-full " // A soft background for the main icon
      >
        <Zap className="h-16 w-16 md:h-20 md:w-20 text-primary" />
      </motion.div>
      <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
        Welcome{userName ? `, ${userName}` : ''}!
      </motion.h2>
      <motion.p variants={itemVariants} className="text-lg text-muted-foreground mb-8 max-w-2xl">
        You're now connected to the Solar Minigrid Command Center. Monitor, control, and optimize your energy system with precision.
      </motion.p>
      {/* Optional Feature Highlights Section */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 w-full max-w-3xl"
      >
        <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center p-4 border border-border/20 rounded-lg bg-card/50 dark:bg-card/80 hover:shadow-lg transition-shadow">
          <BarChart3 className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-md">Real-time Analytics</h3>
          <p className="text-xs text-muted-foreground">Visualize live data streams.</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center p-4 border border-border/20 rounded-lg bg-card/50 dark:bg-card/80 hover:shadow-lg transition-shadow">
          <Settings2 className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-md">Intelligent Control</h3>
          <p className="text-xs text-muted-foreground">Manage system parameters.</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center p-4 border border-border/20 rounded-lg bg-card/50 dark:bg-card/80 hover:shadow-lg transition-shadow">
          <Zap className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-md">Optimized Performance</h3>
          <p className="text-xs text-muted-foreground">Ensure peak efficiency.</p>
        </motion.div>
      </motion.div>
      {onGetStarted && (
        <motion.div variants={itemVariants}>
          <Button size="lg" onClick={onGetStarted} className="group">
            Explore Dashboard
            <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      )}
      {!onGetStarted && ( // Fallback if no primary action provided for this context
         (<motion.p variants={itemVariants} className="text-sm text-muted-foreground mt-4">Navigate using the sidebar or header options to access system features.
                    </motion.p>)
      )}
    </motion.div>
  );
};

export default WelcomeExperience;