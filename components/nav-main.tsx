"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon, ChevronDown } from "lucide-react"; // ChevronDown for sub-items
import { useSidebar } from "@/components/ui/sidebar"; // Assuming useSidebar is for collapse state
import { cn } from "@/lib/utils"; // Your utility for class names
import { usePathname } from "next/navigation";

// Define or import your activeAccents type if it's more complex
interface ActiveAccents {
  [key: string]: string;
  default: string;
}

export interface NavMainItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  sectionId: string; // Crucial for matching activeSection
  isActive?: boolean; // Can be removed if activeSection is used
  items?: Omit<NavMainItemProps, "icon" | "items" | "sectionId">[]; // Sub-items
  colorKey?: keyof ActiveAccents; // Optional specific color key
}

export function NavMain({
  items,
  activeSection,
  activeAccents,
}: {
  items: NavMainItemProps[];
  activeSection?: string;
  activeAccents: ActiveAccents;
}) {
  const sidebar = useSidebar(); // Get sidebar context
  const isCollapsed = sidebar.isCollapsed; // Access the correct property name
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <nav className="flex flex-col gap-1 px-2 py-1">
      {items.map((item, index) => {
        const isActive = item.sectionId === activeSection || item.url === activeSection; // Match by sectionId or exact URL
        const accentClass = activeAccents[item.colorKey || item.sectionId.toLowerCase().replace(/\s+/g, '')] || activeAccents.default;
        const hasSubItems = item.items && item.items.length > 0;
        const isSubmenuOpen = openSubmenus[item.title] || false;

        return (
          <React.Fragment key={item.title + index}>
            <Link href={item.url} passHref>
              <motion.a
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out group",
                  "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                  isActive && `bg-sky-100/70 dark:bg-sky-900/40 shadow-inner dark:shadow-sky-950/50 ${accentClass} !text-sky-600 dark:!text-sky-400 font-semibold`,
                  isCollapsed && "justify-center"
                )}
                whileHover={{ x: isActive ? 0 : 2, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Animated Active Indicator Bar - Surprise Element */}
                <AnimatePresence>
                {isActive && (
                    <motion.div 
                        layoutId={`active-indicator-${item.sectionId}`} // Unique layoutId
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-current" // Uses current text color
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: {type: "spring", stiffness: 300, damping: 20} }}
                        exit={{opacity:0, y: -10}}
                    />
                )}
                </AnimatePresence>
                
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "scale-110")} />
                {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
                {!isCollapsed && hasSubItems && (
                    <ChevronDown 
                        className={`ml-auto h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSubmenu(item.title); }}
                    />
                )}
              </motion.a>
            </Link>
            {/* Animated Submenu - Surprise Element */}
            {!isCollapsed && hasSubItems && (
                <AnimatePresence>
                    {isSubmenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto", transition: { staggerChildren: 0.05, duration:0.3, ease:"easeOut" } }}
                            exit={{ opacity: 0, height: 0, transition: {duration:0.2, ease:"easeIn"} }}
                            className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-700/60 flex flex-col gap-0.5 py-1"
                        >
                            {item.items?.map(subItem => {
                                const isSubActive = subItem.url && (pathname === subItem.url || pathname.startsWith(subItem.url + "/"));
                                return (
                                <Link key={subItem.title} href={subItem.url} passHref>
                                    <motion.a 
                                        className={cn(
                                            "block rounded-md px-3 py-1.5 text-xs transition-colors",
                                            "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                                            isSubActive && "!text-sky-600 dark:!text-sky-400 bg-sky-500/10 dark:bg-sky-500/20 font-medium"
                                        )}
                                        whileHover={{x:2}}
                                        initial={{opacity:0, x: -10}}
                                        animate={{opacity:1, x: 0}}
                                        exit={{opacity:0, x: 10}}
                                    >
                                        {subItem.title}
                                    </motion.a>
                                </Link>
                            )})}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}