"use client"

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// --- Color Helper ---
interface ColorPalette {
    text: string;
    bg: string;
    name: string;
}
const PREDEFINED_COLORS: ColorPalette[] = [
    { text: "text-red-500", bg: "bg-red-500", name: "red" },
    { text: "text-blue-500", bg: "bg-blue-500", name: "blue" },
    { text: "text-green-500", bg: "bg-green-500", name: "green" },
    { text: "text-yellow-400", bg: "bg-yellow-400", name: "yellow" },
    { text: "text-pink-500", bg: "bg-pink-500", name: "pink" },
    { text: "text-purple-500", bg: "bg-purple-500", name: "purple" },
    { text: "text-orange-500", bg: "bg-orange-500", name: "orange" },
    { text: "text-cyan-500", bg: "bg-cyan-500", name: "cyan" },
    { text: "text-indigo-500", bg: "bg-indigo-500", name: "indigo" },
    { text: "text-teal-500", bg: "bg-teal-500", name: "teal" }
];
const getRandomColor = (): ColorPalette => {
    return PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
};

// --- Framer Motion Variants ---
const screenFadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35 } }, // Snappier
    exit: { opacity: 0, transition: { duration: 0.3 } }, // Snappier
};

const containerVariants = (textLength: number, letterEntryStagger: number, letterSpringSettleTime: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    scale: [1, 1.012, 1], // Subtle pulse
    transition: {
      delayChildren: 0.15, // Snappier
      staggerChildren: letterEntryStagger,
      scale: {
        duration: 2.0, // Snappier pulse
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.15 + (textLength * letterEntryStagger) + letterSpringSettleTime - 0.3, // Adjusted for snappier timings
        repeatType: "mirror" as const,
      },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15, // Snappier
      staggerChildren: 0.025, // Snappier
      staggerDirection: -1,
    }
  },
});

const letterVariants = { 
  hidden: { opacity: 0, y: 20, scale: 0.75, rotateX: -50, transformOrigin: "center bottom" }, // Slightly less extreme
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring" as const, damping: 14, stiffness: 180 }, // Snappier spring
  },
  exit: {
    opacity: 0,
    y: -18, // Slightly less extreme
    scale: 0.85,
    rotateX: 25,
    transformOrigin: "center top",
    transition: { duration: 0.12, ease: "easeOut" as const } // Snappier
  }
};
const loadingLetterVariants = {
  hidden: { opacity: 0, x: -12, skewX: -20, scaleY: 1.15 }, // Slightly less extreme
  visible: {
    opacity: 1,
    x: 0,
    skewX: 0,
    scaleY: 1,
    transition: { type: "spring" as const, damping: 11, stiffness: 200 }, // Snappier spring
  },
  exit: { opacity: 0, x: 12, skewX: 20, transition: { duration: 0.08 } } // Snappier
};
const pageNameLetterVariants = { 
  hidden: { opacity: 0, scale: 0.35, rotate: -150, y:8 }, // Slightly less extreme
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    y:0,
    transition: { type: "spring" as const, damping: 10, stiffness: 150 }, // Snappier spring
  },
  exit: letterVariants.exit,
};


// Responsive text size - adjust as needed for your desired visual impact
const UNIFORM_TEXT_SIZE = "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
const ORB_COUNT = 12; // Moderate orb count

// --- Orb Generation ---
const generateOrbs = (count: number, colorClass: string) => {
    return Array.from({ length: count }, (_, i) => {
        const size = Math.random() * 25 + 15; // 15px to 40px
        const initialY = Math.random() * 60 - 30; 
        const initialX = Math.random() * 90 + 5; // 5vw to 95vw (wider spread)
        const duration = Math.random() * 2.5 + 1.8; // 1.8s to 4.3s (snappier)
        const delay = Math.random() * 1.0; // Snappier
        return {
            id: `orb-${i}-${colorClass}-${Date.now()}`,
            style: {
                width: `${size}px`,
                height: `${size}px`,
                top: `${50 + initialY}%`,
                left: `${initialX}%`,
                opacity: Math.random() * 0.18 + 0.12, // 0.12 to 0.3
            },
            animate: {
                y: [0, Math.random() > 0.5 ? -18 : 18, 0], // Slightly smaller drift
                scale: [1, Math.random() * 0.12 + 0.9, 1], // Slightly less scale change
            },
            transition: {
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatType: "mirror" as const,
                ease: "easeInOut" as const,
            },
            colorClass: colorClass,
        };
    });
};

// --- Text Item Definitions ---
interface TextItemDefinition { /* ... same as before ... */
    id: number;
    staticText?: string;
    isPageName?: boolean;
    letterVariantType: "default" | "loading" | "pageName";
    fontClass: string;
    trackingClass: string;
}
const TEXT_DEFINITIONS_BASE: TextItemDefinition[] = [ /* ... same as before ... */
    { id: 1, staticText: "AltaVision Solar", letterVariantType: "default", fontClass: "codystar-regular", trackingClass: "tracking-tight" },
    { id: 2, staticText: "Loading", letterVariantType: "loading", fontClass: "codystar-regular", trackingClass: "tracking-tighter" },
    { id: 3, isPageName: true, letterVariantType: "pageName", fontClass: "codystar-light", trackingClass: "tracking-tight" }
];

// --- Animation Timing Calculation (Snappier) ---
const calculateItemDurations = (textLength: number) => {
    const letterEntryStagger = 0.04;       // Snappier
    const letterExitStagger = 0.025;     // Snappier
    const letterSpringSettleTime = 0.6;  // Snappier: Estimated for letter springs
    const containerDelayChildren = 0.15;  // Snappier
    // const containerExitStagger = 0.025; // Not directly used in cycleTime calculation below
    const containerExitDuration = 0.15; // Snappier
    const textPauseDuration = 1.6;     // Snappier

    const appear = containerDelayChildren + (textLength * letterEntryStagger) + letterSpringSettleTime;
    const exit = (textLength * letterExitStagger) + containerExitDuration; // Exit is text letters + container itself
    return { appear, pause: textPauseDuration, exit };
};


export default function LoadingScreen({ onDone }: { onDone: () => void }) {
    const screenRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const formattedPageName = useMemo(() => {
        const pageName = (pathname.split("/").filter(Boolean).pop() || "Home").replace(/-/g, ' ');
        return pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }, [pathname]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [currentColorPalette, setCurrentColorPalette] = useState(() => getRandomColor());
    const [orbs, setOrbs] = useState(() => generateOrbs(ORB_COUNT, currentColorPalette.bg));

    const textItemsSequence = useMemo(() => {
        return TEXT_DEFINITIONS_BASE.map(def => ({
            ...def,
            text: def.isPageName ? formattedPageName : def.staticText || "",
        }));
    }, [formattedPageName]);

    // Progress bar should animate over the entire sequence duration until onDone is called
    const totalSequenceDuration = useMemo(() => {
        let duration = 0;
        textItemsSequence.forEach((item) => {
            const durations = calculateItemDurations(item.text.length);
            duration += (durations.appear + durations.pause + durations.exit);
        });
        return duration;
    }, [textItemsSequence]);

    useEffect(() => {
        document.fonts.ready.then(() => {
             if (screenRef.current) screenRef.current.style.visibility = 'visible';
        });

        let timerId: NodeJS.Timeout;

        const runSequence = (currentIndex: number) => {
            const currentItem = textItemsSequence[currentIndex];
            const itemDurations = calculateItemDurations(currentItem.text.length);
            const cycleTimeForThisItem = itemDurations.appear + itemDurations.pause + itemDurations.exit;

            if (currentIndex >= textItemsSequence.length) {
                // This case is only hit if the sequence calculation somehow goes wrong.
                // onDone is called from the timeout of the last *actual* item.
                // However, if for some reason we reach here, call onDone.
                onDone();
                return;
            }
            
            setActiveIndex(currentIndex);
            if (currentIndex > 0 || textItemsSequence.length === 1) {
                 setCurrentColorPalette(getRandomColor());
            }

            if (currentIndex === textItemsSequence.length - 1) { // Last item
                timerId = setTimeout(onDone, cycleTimeForThisItem * 1000);
            } else {
                timerId = setTimeout(() => {
                    runSequence(currentIndex + 1);
                }, cycleTimeForThisItem * 1000);
            }
        };

        setCurrentColorPalette(getRandomColor()); // Initialize for first item
        if (textItemsSequence.length > 0) {
            runSequence(0);
        } else {
            onDone(); // No items, just finish
        }

        return () => clearTimeout(timerId);
    }, [onDone, textItemsSequence]);

    useEffect(() => {
        setOrbs(generateOrbs(ORB_COUNT, currentColorPalette.bg));
    }, [currentColorPalette]);


    const getLetterVariants = (type: string) => {
        if (type === "loading") return loadingLetterVariants;
        if (type === "pageName") return pageNameLetterVariants;
        return letterVariants;
    };
    
    const currentDisplayItem = textItemsSequence[activeIndex];
    if (!currentDisplayItem) return null;

    const { text: currentTextToDisplay, letterVariantType, fontClass, trackingClass } = currentDisplayItem;
    const currentTextLength = currentTextToDisplay.length;
    const dynamicContainerVariants = containerVariants(currentTextLength, 0.04, 0.6); // Use updated snappier values

    return (
        <motion.div
            key="loading-screen-root"
            ref={screenRef}
            variants={screenFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-slate-900 overflow-hidden"
            style={{ visibility: 'hidden' }}
            aria-live="polite"
            aria-busy="true"
        >
            {/* Floating Orbs */}
            <AnimatePresence>
                {orbs.map(orb => (
                    <motion.div
                        key={orb.id}
                        className={`absolute rounded-full ${orb.colorClass} pointer-events-none`}
                        style={{ ...orb.style, x: orb.style.left, y: orb.style.top }}
                        initial={{ scale: 0.6, opacity: 0 }} // Slightly snappier start
                        animate={{ ...orb.animate, opacity: orb.style.opacity as number, x:0, y:0 }}
                        exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }} // Snappier exit
                        transition={{
                            ...orb.transition,
                            opacity: { duration: 0.4, delay: orb.transition.delay }, // Snappier
                            scale: { duration: 0.4, delay: orb.transition.delay} // Snappier
                        }}
                    />
                ))}
            </AnimatePresence>


            {/* Text Animation Area */}
            <div 
                className="relative flex justify-center items-center w-full mb-12 md:mb-16 z-10"
                style={{ minHeight: "120px" /* Increased for larger responsive text */ }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentDisplayItem.id}-${currentColorPalette.name}`}
                        className={`text-center ${UNIFORM_TEXT_SIZE} font-semibold ${trackingClass} ${currentColorPalette.text} ${fontClass}`}
                        variants={dynamicContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        aria-label={currentTextToDisplay}
                    >
                        {currentTextToDisplay.split('').map((char, index) => (
                            <motion.span
                                key={`${currentDisplayItem.id}-char-${index}`}
                                variants={getLetterVariants(letterVariantType)}
                                className="inline-block"
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Progress Bar */}
            <div className={`absolute bottom-8 sm:bottom-10 left-1/2 transform -translate-x-1/2 w-[75vw] md:w-[65vw] max-w-md h-3 bg-slate-500/30 dark:bg-slate-700/50 rounded-full overflow-hidden z-10`}>
                <motion.div
                    className={`h-full ${currentColorPalette.bg} rounded-full relative overflow-hidden`} // Ensure overflow hidden is here for shimmer clipping
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: totalSequenceDuration, ease: "linear" }}
                    style={{ originX: 0 }}
                >
                    {/* Shimmer Effect */}
                    {/* <motion.div
                        className="absolute top-0 left-0 h-full w-16 sm:w-20 opacity-70 dark:opacity-50" // Shimmer width
                        style={{ background: "linear-gradient(to right, transparent, white, transparent)"}}
                        initial={{ x: "-100%" }} // Start with shimmer's right edge at parent's left
                        animate={{ x: "100%" }}  // Animate until shimmer's left edge is at parent's right
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: 0.1 }} // Snappier shimmer
                    /> */}
                </motion.div>
            </div>
        </motion.div>
    );
}