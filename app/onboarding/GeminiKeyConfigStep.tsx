// components/onboarding/GeminiKeyConfigStep.tsx
'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, CheckCircle2, ShieldAlert, Trash2, Save, LogOut, Link as LinkIcon } from 'lucide-react'; // Added LinkIcon
import { toast } from 'sonner';
import { cn } from "@/lib/utils"; // Assuming you have this utility

// --- Framer Motion Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(5px)' },
  visible: { 
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 100, damping: 15, mass: 0.8, delay: 0.1 } 
  },
  exit: { opacity: 0, y: -20, filter: 'blur(5px)', transition: { duration: 0.2 } }
};

const itemVariants = (delay: number = 0) => ({
  hidden: { opacity: 0, y: 15, filter: 'blur(3px)' },
  visible: { 
    opacity: 1, y: 0, filter: 'blur(0px)', 
    transition: { type: 'spring', stiffness: 120, damping: 15, mass: 0.7, delay } 
  },
});

const buttonMotionProps = (delay: number = 0) => ({
  variants: itemVariants(delay),
  whileHover: { 
    scale: 1.03, 
    boxShadow: "0px 4px 15px hsla(var(--primary)/0.2)",
    transition: { type: "spring", stiffness: 300, damping: 10 } 
  },
  whileTap: { scale: 0.97 }
});

const statusMessageVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'circOut' } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: 'circIn' } }
};

const contentAppearVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3, ease: 'easeIn' } }
};


const GeminiKeyConfigStep: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial check

  useEffect(() => {
    // Simulate a brief delay for checking local storage to allow animations
    const timer = setTimeout(() => {
      const storedKey = localStorage.getItem("geminiApiKey");
      if (storedKey) {
        setIsKeyConfigured(true);
        // Do not set apiKey state to storedKey to keep input clear if they want to change
      }
      setIsLoading(false);
    }, 300); // Small delay for effect, adjust as needed
    return () => clearTimeout(timer);
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("geminiApiKey", apiKey.trim());
      setIsKeyConfigured(true);
      setApiKey(""); // Clear input after saving
      toast.success("API Key Saved", {
        description: "Your Gemini API Key has been securely stored in local storage.",
      });
    } else {
      toast.error("Invalid API Key", {
        description: "Please enter a valid Gemini API key.",
      });
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("geminiApiKey");
    setIsKeyConfigured(false);
    setApiKey(""); // Ensure input is cleared
    toast.info("API Key Cleared", {
      description: "Your Gemini API Key has been removed from local storage.",
    });
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" exit="exit">
      <Card className="w-full shadow-lg dark:shadow-black/20 border-border/50 bg-card/80 dark:bg-neutral-800/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <motion.div variants={itemVariants(0)} className="flex items-center space-x-3">
            <KeyRound className="h-7 w-7 text-primary" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Configure Gemini API Key
            </CardTitle>
          </motion.div>
          <motion.div variants={itemVariants(0.05)}>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Provide your Gemini API Key to enable AI-powered features like automatic datapoint configuration.
              The key is stored securely in your browser's local storage.
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6 pt-2 pb-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-state"
                variants={itemVariants(0.1)}
                initial="hidden" animate="visible" exit="hidden"
                className="flex items-center justify-center h-20 text-muted-foreground"
              >
                <KeyRound className="h-5 w-5 mr-2 animate-pulse" />
                Checking API Key status...
              </motion.div>
            ) : isKeyConfigured ? (
              <motion.div
                key="configured-state"
                variants={contentAppearVariants}
                initial="hidden" animate="visible" exit="exit"
                className="space-y-4"
              >
                <motion.div 
                  variants={statusMessageVariants}
                  className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50"
                >
                  <CheckCircle2 className="h-6 w-6 mr-3 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Gemini API Key is Configured
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      AI features are ready to be used.
                    </p>
                  </div>
                </motion.div>
                <motion.div {...buttonMotionProps(0.1)} className="flex justify-start">
                  <Button
                    onClick={handleClearKey}
                    variant="outline"
                    className="group border-red-500/70 text-red-600 dark:text-red-400 dark:border-red-500/60
                               hover:border-red-500 dark:hover:border-red-400 
                               hover:bg-red-500/10 dark:hover:bg-red-500/15
                               focus-visible:ring-red-500/50 w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    Clear API Key
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="unconfigured-state"
                variants={contentAppearVariants}
                initial="hidden" animate="visible" exit="exit"
                className="space-y-4"
              >
                <motion.div 
                  variants={statusMessageVariants}
                  className="flex items-start p-3 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50"
                >
                  <ShieldAlert className="h-5 w-5 mr-3 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                   <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      API Key Not Set
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                     Please enter your Gemini API Key below.
                    </p>
                  </div>
                </motion.div>

                {/* --- Added How to get API Key section --- */}
                <motion.div variants={itemVariants(0.1)} className="px-1 pt-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <span>
                      Need a Gemini API key?{' '}
                      <a
                        href="https://ai.google.dev/gemini-api/docs/api-key"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-card rounded-sm"
                      >
                        Get one from Google AI Studio
                      </a>.
                    </span>
                  </p>
                </motion.div>
                {/* --- End How to get API Key section --- */}

                <motion.div variants={itemVariants(0.2)} className="space-y-2"> {/* Adjusted delay from 0.15 to 0.2 */}
                   <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API Key here"
                    className="text-base bg-background/70 dark:bg-neutral-800/50 focus:bg-background dark:focus:bg-neutral-800/90"
                    aria-label="Gemini API Key Input"
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    Your key is stored only in your browser and never sent to our servers except for direct communication with the Gemini API.
                  </p>
                </motion.div>
                <motion.div {...buttonMotionProps(0.3)} className="flex justify-start"> {/* Adjusted delay from 0.2 to 0.3 */}
                  <Button
                    onClick={handleSaveKey}
                    disabled={!apiKey.trim()}
                    className="group w-full bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white"
                  >
                    <Save className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-6" />
                    Save API Key
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GeminiKeyConfigStep;