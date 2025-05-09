// components/onboarding/WelcomeStep.tsx
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
// Assuming OnboardingContext is in the path specified in your existing WelcomeStep
import { useOnboarding } from './OnboardingContext'; 
// Assuming constants are in this path as per your existing WelcomeStep
import { APP_LOGO, APP_NAME } from '@/config/constants'; 
import Image from 'next/image';
import { Rocket, Sparkles } from 'lucide-react'; // Using lucide-react icons

// AppLogo component definition (as provided in your snippet)
// For next/image to work best with className for sizing, APP_LOGO might be an SVG,
// or you might need to ensure the parent div correctly constrains the Image with layout="fill".
// For raster images (PNG, JPG), explicit width & height props on <Image> are generally better.
// Assuming for this example that your setup for AppLogo handles this.
const AppLogo = ({ className }: { className?: string }) => (
  // Ensure APP_LOGO is a valid path like '/logo.png' or an imported image object
  <Image 
    src={APP_LOGO} // e.g., "/logos/main-logo.svg" or an imported static image
    alt={`${APP_NAME} Logo`} 
    className={className || "h-10 w-auto"} 
    width={80} // Added for better next/image handling if it's not SVG/fill
    height={80} // Added for better next/image handling
    priority // Important for LCP elements
  />
);


export default function WelcomeStep() {
  const { nextStep } = useOnboarding();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, // Stagger animation for children
        delayChildren: 0.1,
      },
    },
    exit: { 
        opacity: 0,
        y: -20, // Optional: slight move up on exit
        transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 150,
            damping: 10,
            delay: 0.6 // Extra delay for the button to pop
        }
    },
    hover: {
        scale: 1.05,
        // Example: boxShadow: "0px 0px 12px rgba(var(--primary))" // If you have primary color CSS var
        transition: { type: "spring", stiffness: 300, damping: 10 }
    },
    tap: {
        scale: 0.95
    }
  }

  return (
    // The main div already handles initial entrance/exit for the whole step via parent AnimatePresence
    // This internal container is for staggering children within this step
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit" // Use the main exit from parent if preferred, or custom like this
      className="flex flex-col items-center justify-center h-full p-4 md:p-6 text-center"
    >
      <motion.div variants={itemVariants} className="mb-6 md:mb-8">
        <AppLogo className="h-32 md:h-40 w-auto"/>
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
      >
        Welcome to <span className="text-primary">{APP_NAME}!</span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-base sm:text-lg text-muted-foreground max-w-lg md:max-w-xl mb-8 md:mb-10"
      >
        Let's quickly personalize your solar minigrid dashboard. A few settings are all it takes to
        unlock powerful monitoring and a tailored energy management experience.
      </motion.p>

      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          size="lg"
          onClick={nextStep}
          className="px-8 py-3 h-auto text-base md:text-lg font-semibold rounded-full group shadow-lg hover:shadow-primary/30 focus-visible:ring-primary/70"
          // For a subtle glow on hover if you have CSS vars:
          // style={{ boxShadow: "0 0 0px 0px rgba(var(--primary-rgb), 0.4)" }}
          // onHoverStart={e => e.currentTarget.style.boxShadow = "0 0 15px 3px rgba(var(--primary-rgb), 0.4)"}
          // onHoverEnd={e => e.currentTarget.style.boxShadow = "0 0 0px 0px rgba(var(--primary-rgb), 0.4)"}
        >
          <Sparkles className="mr-2.5 h-5 w-5 text-amber-400 transition-transform duration-300 ease-out group-hover:scale-125 group-hover:rotate-[15deg]" />
          Begin Setup
        </Button>
      </motion.div>
      
      <motion.p 
        variants={itemVariants}
        className="text-xs text-muted-foreground mt-10 max-w-md"
        style={{ transitionDelay: '0.6s' }} // manual delay to appear after button
      >
        This initial configuration ensures optimal performance and accuracy from the start.
      </motion.p>
    </motion.div>
  );
}