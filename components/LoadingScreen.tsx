"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import logo from "@/av-loading.png"; // Import the logo image

// Function to get a random Tailwind text color class and its background equivalent
const getRandomColor = () => {
    const colors = [
        { text: "text-red-500", bg: "bg-red-500" },
        { text: "text-blue-500", bg: "bg-blue-500" },
        { text: "text-green-500", bg: "bg-green-500" },
        { text: "text-yellow-500", bg: "bg-yellow-500" },
        { text: "text-pink-500", bg: "bg-pink-500" },
        { text: "text-purple-500", bg: "bg-purple-500" },
        { text: "text-orange-500", bg: "bg-orange-500" },
        { text: "text-cyan-500", bg: "bg-cyan-500" },
        { text: "text-indigo-500", bg: "bg-indigo-500" },
        { text: "text-teal-500", bg: "bg-teal-500" }
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

// --- Framer Motion Variants ---

// Variants for the container div that holds the letters
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

// Variants for each individual letter span
const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 150,
    },
  },
};

// Define a base uniform text size
const UNIFORM_TEXT_SIZE = "text-6xl";

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const pageName = (pathname.split("/").filter(Boolean).pop() || "Home")
                     .replace(/-/g, ' ');
    const formattedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    const [activeIndex, setActiveIndex] = useState(0);
    const loadingColor = getRandomColor();

    // Define the text items with updated classes for uniform size
    const textItems = [
        // do not remove this, this will implement the logo animation
        // {
        //     id: 0,
        //     text: "", // Remove text, just show logo
        //     className: "flex justify-center items-center" // Center the logo
        // },
        {
            id: 1,
            text: "AltaVision Solar",
            className: `${UNIFORM_TEXT_SIZE} font-semibold tracking-tight ${loadingColor.text} codystar-regular`
        },
        {
            id: 2,
            text: "Loading",
            className: `${UNIFORM_TEXT_SIZE} font-semibold tracking-tight ${loadingColor.text} codystar-regular`
        },
        {
            id: 3,
            text: formattedPageName,
            className: `${UNIFORM_TEXT_SIZE} font-semibold tracking-tight ${loadingColor.text} codystar-light`
        }
    ];

    // --- Adjusted Animation Timings ---
    const letterStagger = 0.04;
    const maxLetters = Math.max(...textItems.map(item => item.text.length));
    const maxLetterAnimDuration = maxLetters * letterStagger + 0.5;
    const textAppearDuration = Math.max(0.5, maxLetterAnimDuration);
    const textPauseDuration = 1.2;
    const textExitDuration = 0.2;
    const cycleDuration = textAppearDuration + textPauseDuration + textExitDuration;
    const totalSequenceDuration = textItems.length * cycleDuration;

    useEffect(() => {
        document.fonts.ready.then(() => {
             if (containerRef.current) {
                containerRef.current.style.visibility = 'visible';
             }
        });

        const intervalId = setInterval(() => {
            setActiveIndex((prevIndex) => {
                const nextIndex = prevIndex + 1;
                if (nextIndex >= textItems.length) {
                    clearInterval(intervalId);
                    setTimeout(onDone, textExitDuration * 1000);
                    return prevIndex;
                }
                return nextIndex;
            });
        }, cycleDuration * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [onDone, textItems.length, cycleDuration, textExitDuration]);

    return (
        <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center containerRef"
        aria-live="polite"
        aria-busy="true"
    >
       
       {/* Logo Animation */}
{/* <motion.div
    className="flex justify-center items-center w-full h-full absolute"
    initial={{ opacity: 1, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{
        duration: 1.5, // Duration for scaling and showing
        ease: "easeOut",
        delay: 0.5, // Delay before the animation starts
    }}
>
    <motion.img
        src={logo.src}
        alt="Logo"
        className="w-auto h-auto max-w-full max-h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
            duration: 1.5, // Show the image for 1.5 seconds
            ease: "easeOut",
            delay: 0.5, // Delay before showing
        }}
    />
</motion.div> */}

           {/* Centered Top Progress Bar */}
           <div
                className="absolute top-6 left-1/2 transform -translate-x-1/2 w-[80vw] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            >
                <motion.div
                    className={`h-full ${loadingColor.bg} rounded-full`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                        duration: totalSequenceDuration,
                        ease: "linear"
                    }}
                    style={{ originX: 0 }}
                />
            </div>
    
        {/* Text Animation */}
        <div className="flex justify-center items-center w-full h-full absolute">
            <AnimatePresence mode="wait">
                <motion.div
                    key={textItems[activeIndex].id}
                    className={`text-center ${textItems[activeIndex].className}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {textItems[activeIndex].text.split('').map((char, index) => (
                        <motion.span
                            key={`${textItems[activeIndex].id}-char-${index}`}
                            variants={letterVariants}
                            className="inline-block"
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </motion.span>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
    );
}