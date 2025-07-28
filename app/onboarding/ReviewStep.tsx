// app/onboarding/ReviewStep.tsx
'use client';
import React from 'react';
// FIX: Import the 'Variants' type
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Factory, Network, Database, AlertCircle, ExternalLink, Merge, Info, PackageCheck, Binary, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from './OnboardingContext';
import { DataPointConfig, IconComponentType } from '@/config/dataPoints';
import { cn } from '@/lib/utils';
import * as lucideIcons from 'lucide-react';

// --- Framer Motion Variants (FIXED with explicit 'Variants' type) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } }
};

const itemVariants = (delay: number = 0, yOffset: number = 20, blurAmount: number = 2): Variants => ({
  hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 100, damping: 15, delay, mass: 0.8 }
  },
  exit: { opacity: 0, y: -(yOffset / 2), filter: `blur(${blurAmount}px)`, transition: { duration: 0.2 } }
});

const buttonMotionProps = (delay: number = 0, primary: boolean = false) => ({
  variants: itemVariants(delay, 10, 1),
  whileHover: {
    scale: 1.03,
    boxShadow: primary ? "0px 6px 20px hsla(var(--primary)/0.25)" : "0px 4px 15px hsla(var(--foreground)/0.1)",
    transition: { type: "spring" as const, stiffness: 300, damping: 10 }
  },
  whileTap: { scale: 0.97, transition: {type: "spring" as const, stiffness: 350, damping: 12} }
});

const DEFAULT_ICON = Merge; 

function resolveIconComponent(icon: string | IconComponentType | undefined): IconComponentType {
    if (typeof icon === 'function') return icon;
    if (typeof icon === 'string') {
        const icons = lucideIcons as unknown as Record<string, IconComponentType>;
        const normalizedIconName = icon.replace(/Icon$/, '');
        const iconKey = Object.keys(icons).find(key => key.toLowerCase() === normalizedIconName.toLowerCase());
        if (iconKey) return icons[iconKey];
    }
    return DEFAULT_ICON;
}


interface ReviewDetailProps {
  label: string;
  value?: string | number | null;
  isOpcUrl?: boolean;
}

const ReviewDetailItem: React.FC<ReviewDetailProps> = ({ label, value, isOpcUrl }) => (
  <>
    <dt className="font-medium text-muted-foreground whitespace-nowrap">{label}:</dt>
    <dd className="text-foreground break-all">
      {value ? (
        isOpcUrl ? `opc.tcp://${value}` : value
      ) : (
        <span className="italic text-muted-foreground/70">Not set</span>
      )}
    </dd>
  </>
);

interface DataPointListProps {
  points: DataPointConfig[];
  listTitle: string;
  listIcon: IconComponentType;
  emptyMessage: string;
}

const DataPointListSection: React.FC<DataPointListProps> = ({ points, listTitle, listIcon: ListIcon, emptyMessage }) => {
  if (points.length === 0) {
    return (
      <div className="py-3 px-1">
        <div className="flex items-center space-x-2.5 mb-2">
            <ListIcon className="h-5 w-5 text-muted-foreground/80 shrink-0"/>
            <h4 className="text-md font-medium text-muted-foreground">{listTitle} ({points.length})</h4>
        </div>
        <p className="text-xs text-muted-foreground/70 pl-1">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div variants={itemVariants(0.1)} className="space-y-2">
       <div className="flex items-center space-x-2.5 mb-1.5 px-1">
            <ListIcon className="h-5 w-5 text-muted-foreground/90 shrink-0"/>
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">{listTitle} ({points.length})</h4>
        </div>
      <ScrollArea className="max-h-72 w-full rounded-md border bg-background/50 dark:bg-neutral-800/30 shadow-inner">
        <ul className="divide-y divide-border/70 dark:divide-neutral-700/50 p-1">
          {points.map((dp: DataPointConfig) => {
            const Icon = resolveIconComponent(dp.icon);
            return (
              <li key={dp.id} className="flex items-center justify-between p-2.5 hover:bg-muted/60 dark:hover:bg-neutral-700/50 transition-colors duration-150">
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={dp.name}>{dp.name}</p>
                    <p className="text-xs text-muted-foreground truncate" title={dp.id}><code className="text-xs">{dp.id}</code></p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/80 shrink-0 ml-4 hidden md:block truncate max-w-[200px] lg:max-w-[300px]" title={dp.nodeId}>
                  Node: <code className="text-xs">{dp.nodeId}</code>
                </p>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </motion.div>
  );
};


export default function ReviewStep() {
  const { onboardingData } = useOnboarding();
  const { plantName, plantLocation, plantCapacity, appName, opcUaEndpointOffline, opcUaEndpointOnline, configuredDataPoints } = onboardingData;

  const downloadConfiguration = () => {
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
    const configToDownload = {
      plantDetails: {
        plantName: onboardingData.plantName,
        plantLocation: onboardingData.plantLocation,
        plantType: onboardingData.plantType,
        plantCapacity: onboardingData.plantCapacity,
      },
      applicationSettings: {
        appName: onboardingData.appName || onboardingData.plantName,
        opcUaEndpointOffline: onboardingData.opcUaEndpointOffline,
        opcUaEndpointOnline: onboardingData.opcUaEndpointOnline,
      },
      configuredDataPoints: configuredDataPoints?.map(dp => {
        const iconName = Object.keys(lucideIcons).find(
            key => (lucideIcons as any)[key] === dp.icon
        ) || (typeof dp.icon === 'string' ? dp.icon : 'Merge');
        return {...dp, icon: iconName};
      }) || [],
      metadata: {
        onboardingCompleted: true, 
        timestamp: new Date().toISOString(),
        version: appVersion,
      }
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(configToDownload, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `minigrid_config_${onboardingData.plantName?.toLowerCase().replace(/\s+/g, '_') || 'review'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Configuration JSON Downloaded", { description: "Your setup has been saved to a JSON file."});
  };

  const manualDataPoints = configuredDataPoints?.filter(
    dp => (dp as any).source === 'manual' // Assuming a 'source' property exists from the merged discovery step
  ) || [];
  const automatedDataPoints = configuredDataPoints?.filter(
    dp => (dp as any).source !== 'manual'
  ) || [];

  return (
    <motion.div
        key="review-step"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
        <motion.div variants={itemVariants(0)}>
            <Card className="shadow-xl dark:shadow-black/30 border-border/60 bg-gradient-to-br from-card via-card to-card/90 dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-800/90 backdrop-blur-lg">
                <CardHeader className="border-b border-border/50 dark:border-neutral-700/50 pb-4">
                    <div className="flex items-center space-x-3.5">
                        <PackageCheck className="h-8 w-8 text-primary shrink-0"/>
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                                Review & Confirm Your Setup
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-0.5">
                                Please carefully review all configured settings. If everything is correct, the "Confirm & Save" button below will finalize your setup.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                 <CardContent className="pt-5 text-sm text-muted-foreground">
                    <p className="flex items-start">
                        <Info size={18} className="mr-2.5 mt-px text-sky-500 shrink-0"/>
                        <span>
                            This is your final opportunity to check details before they are saved. You can download a copy of this configuration for your records.
                        </span>
                    </p>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.1)}>
             <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader className="border-b border-border/50 dark:border-neutral-700/50">
                    <div className="flex items-center space-x-3">
                        <Factory className="h-6 w-6 text-indigo-500 dark:text-indigo-400 shrink-0"/>
                        <CardTitle className="text-lg font-medium">Plant & Application Details</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-5 text-sm">
                    <dl className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] lg:grid-cols-[max-content,1fr,max-content,1fr] gap-x-6 gap-y-3">
                        <ReviewDetailItem label="Plant Name" value={onboardingData.plantName} />
                        <ReviewDetailItem label="Location" value={onboardingData.plantLocation} />
                        <ReviewDetailItem label="Type" value={onboardingData.plantType} />
                        <ReviewDetailItem label="Capacity" value={onboardingData.plantCapacity} />
                        <ReviewDetailItem label="Application Name" value={onboardingData.appName || onboardingData.plantName} />
                    </dl>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.2)}>
            <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader className="border-b border-border/50 dark:border-neutral-700/50">
                     <div className="flex items-center space-x-3">
                        <Network className="h-6 w-6 text-green-500 dark:text-green-400 shrink-0"/>
                        <CardTitle className="text-lg font-medium">OPC UA Endpoints</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-5 text-sm">
                    <dl className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] gap-x-6 gap-y-3">
                        <ReviewDetailItem label="Offline Endpoint" value={onboardingData.opcUaEndpointOffline} isOpcUrl />
                        <ReviewDetailItem label="Online Endpoint" value={onboardingData.opcUaEndpointOnline} isOpcUrl />
                    </dl>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.3)}>
            <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 dark:border-neutral-700/50">
                    <div className="flex items-center space-x-3">
                        <Database className="h-6 w-6 text-purple-500 dark:text-purple-400 shrink-0"/>
                        <div>
                            <CardTitle className="text-lg font-medium">Data Points Configuration</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-0.5">
                                Total Data Points: <span className="font-semibold text-primary">{configuredDataPoints?.length || 0}</span>
                            </CardDescription>
                        </div>
                    </div>
                    <motion.div {...buttonMotionProps(0, false)} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={downloadConfiguration} className="w-full group text-base py-2.5 sm:py-2 px-4">
                            <Download className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover:scale-110"/>
                            Download Config (JSON)
                        </Button>
                    </motion.div>
                </CardHeader>
                <CardContent className="pt-5 space-y-6">
                    {configuredDataPoints && configuredDataPoints.length > 0 ? (
                        <>
                           <DataPointListSection
                                points={automatedDataPoints}
                                listTitle="From Automated Processes (File/Discovery/AI)"
                                listIcon={Binary}
                                emptyMessage="No data points were identified from automated processes."
                           />
                           <div className="border-t border-border/50 dark:border-neutral-700/50 my-3"></div>
                           <DataPointListSection
                                points={manualDataPoints}
                                listTitle="Manually Added Data Points"
                                listIcon={PencilLine}
                                emptyMessage="No data points have been added using the manual entry form."
                           />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/30 dark:bg-neutral-800/20">
                            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-3"/>
                            <p className="text-sm font-medium text-muted-foreground">No custom data points have been configured.</p>
                            <p className="text-xs text-muted-foreground/80 mt-1">Default data points (if any) might be used by the application.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants(0.4)} className="text-center pt-2">
            <p className="text-xs text-muted-foreground flex items-center justify-center">
               <ExternalLink size={14} className="mr-1.5 shrink-0"/> The "Finish & Save" button is part of the main navigation controls below.
            </p>
        </motion.div>
    </motion.div>
  );
}