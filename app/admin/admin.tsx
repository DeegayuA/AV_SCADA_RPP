'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NotificationConfigModal } from '@/components/admin/NotificationConfigModal'; // Verify path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, BellRing, Users, ScrollText, AlertTriangle, Settings, SlidersHorizontal, BarChart3, LockKeyhole } from 'lucide-react';
import { UserRole, User } from '@/types/auth';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils'; // For conditional class names
import { APP_AUTHOR } from '@/config/constants';

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.98, y: -10, transition: { duration: 0.3, ease: "easeIn" } },
};

const headerVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5, ease: "easeOut" } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.2 + i * 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
  hover: {
    y: -5,
    // Using Tailwind's shadow classes directly is often preferred for consistency
    boxShadow: "var(--tw-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  buttonText: string;
  onClick?: () => void;
  disabled?: boolean;
  colorClass: string; // e.g., "sky", "indigo", "emerald" - just the color name
  index: number;
}

// Helper to map color names to Tailwind gradient classes
const getButtonGradientClasses = (colorName: string): string => {
  switch (colorName) {
    case "sky":
      return "from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 dark:from-sky-400 dark:to-sky-500 dark:hover:from-sky-500 dark:hover:to-sky-600";
    case "indigo":
      return "from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 dark:from-indigo-400 dark:to-indigo-500 dark:hover:from-indigo-500 dark:hover:to-indigo-600";
    case "emerald":
      return "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-500 dark:hover:from-emerald-500 dark:hover:to-emerald-600";
    case "purple":
      return "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-400 dark:to-purple-500 dark:hover:from-purple-500 dark:hover:to-purple-600";
    case "rose":
      return "from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 dark:from-rose-400 dark:to-rose-500 dark:hover:from-rose-500 dark:hover:to-rose-600";
    case "amber":
      return "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 dark:from-amber-400 dark:to-amber-500 dark:hover:from-amber-500 dark:hover:to-amber-600";
    default: // Fallback to primary theme color (you might want to define this gradient too)
      return "bg-primary hover:bg-primary/90 text-primary-foreground";
  }
};


const AdminActionCard: React.FC<AdminCardProps> = ({ title, description, icon: Icon, buttonText, onClick, disabled, colorClass, index }) => {
  // Derive text and background opacity classes from the base color name
  const textIconColor = `text-${colorClass}-500 dark:text-${colorClass}-400`; // e.g., text-sky-500 dark:text-sky-400
  const bgIconOpacityColor = `bg-${colorClass}-500/10 dark:bg-${colorClass}-400/20`; // e.g., bg-sky-500/10 dark:bg-sky-400/20

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-lg flex flex-col"
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-lg mb-3 w-fit", 
                          disabled ? "bg-slate-400/10 dark:bg-slate-600/10" : bgIconOpacityColor
                          )}>
            <Icon className={cn("h-7 w-7", disabled ? "text-slate-400 dark:text-slate-500" : textIconColor)} />
          </div>
        </div>
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</CardTitle>
        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 min-h-[40px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
      <Button
          onClick={onClick}
          disabled={disabled}
          className={cn(
              "w-full font-medium group text-white dark:text-white/95 shadow-lg hover:shadow-xl transition-all duration-200", // Common styles for non-disabled
              disabled 
                  ? "bg-slate-200 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 cursor-not-allowed" 
                  : `bg-gradient-to-r ${getButtonGradientClasses(colorClass)}`
          )}
          // Variant "default" for non-disabled, "secondary" could be used for disabled,
          // but direct styling in className often takes precedence or works well with Shadcn structure.
      >
          {buttonText}
          {!disabled && <Settings className="ml-2 h-4 w-4 transform transition-transform duration-200 group-hover:rotate-[25deg]" />}
      </Button>
      </CardContent>
    </motion.div>
  );
};


const AdminPage: React.FC = () => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const currentUser = useAppStore((state) => state.currentUser);

    if (currentUser?.role !== UserRole.ADMIN) {
        return (
            <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                className="rounded-lg flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-neutral-900 p-6 text-center"
            >
                <motion.div
                    initial={{ opacity:0, y:20 }}
                    animate={{ opacity:1, y:0, transition: {delay: 0.2, type: 'spring', stiffness:150, damping:10} }}
                    className="p-8 bg-white dark:bg-slate-800/80 rounded-xl shadow-2xl max-w-md w-full border border-red-200 dark:border-red-500/30 backdrop-blur-md"
                >
                    <AlertTriangle className="mx-auto h-16 w-16 text-red-500 dark:text-red-400 mb-5" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-300 mb-3">Access Denied</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                        You must be an administrator to view this page. If you believe this is an error, please contact support.
                    </p>
                    <Button 
                        onClick={() => window.history.back()} 
                        variant="outline" 
                        className="mt-8 w-full sm:w-auto border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    >
                        Go Back
                    </Button>
                </motion.div>
                <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
                    © {new Date().getFullYear()} {APP_AUTHOR}
                </p>
            </motion.div>
        );
    }

    const adminSections: Omit<AdminCardProps, 'index'>[] = [
      {
        title: "Notification Rules",
        description: "Configure system alarms and notification triggers based on data point values.",
        icon: BellRing,
        buttonText: "Configure Notifications",
        onClick: () => setIsModalOpen(true),
        colorClass: "sky", // Just the color name
      },
      {
        title: "User Management",
        description: "View, manage user accounts, roles, and permissions across the platform.",
        icon: Users,
        buttonText: "Manage Users",
        disabled: true, 
        colorClass: "indigo",
      },
      {
        title: "System Logs",
        description: "Access and review detailed system operational logs and event histories.",
        icon: ScrollText, // Or your chosen icon
        buttonText: "View Logs",
        onClick: () => router.push('/admin/system-logs'), // Navigate to the new page
        disabled: false, // Enable the card
        colorClass: "emerald", // Or your chosen color
      },
      {
        title: "Feature Flags",
        description: "Enable or disable experimental features and manage A/B testing configurations.",
        icon: SlidersHorizontal,
        buttonText: "Manage Features",
        disabled: true,
        colorClass: "purple",
      },
      {
        title: "Security Settings",
        description: "Configure global security policies, authentication methods, and API access.",
        icon: LockKeyhole,
        buttonText: "Adjust Security",
        disabled: true,
        colorClass: "rose",
      },
      {
        title: "Data Analytics",
        description: "View aggregated system metrics, performance dashboards, and generate reports.",
        icon: BarChart3,
        buttonText: "View Analytics",
        disabled: true,
        colorClass: "amber",
      },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 selection:bg-primary/20"
        >
            <div className="container mx-auto py-10 px-4 md:px-6 lg:px-8">
                <motion.header
                    variants={headerVariants}
                    className="mb-12 text-center"
                >
                    <div className="inline-block p-4 bg-primary/10 dark:bg-primary/20 rounded-full mb-6 shadow-lg border-2 border-primary/20 hover:scale-105 transition-transform duration-300">
                        <ShieldCheck className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
                        Administration Panel
                    </h1>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Welcome, <span className="font-semibold text-primary dark:text-primary-foreground">{currentUser.name || 'Admin'}</span>. Oversee and fine-tune your application from this central hub.
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                    {adminSections.map((section, index) => (
                        <AdminActionCard key={section.title} {...section} index={index} />
                    ))}
                </div>

                <NotificationConfigModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            </div>
             <footer className="py-10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    © {new Date().getFullYear()} {APP_AUTHOR} - Admin Portal
                </p>
            </footer>
        </motion.div>
    );
};

export default AdminPage;