// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"; // useRouter removed as it was not directly used for navigation here
import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  // Frame, // Commented out as NavProjectItemProps might not be defined for it
  LifeBuoy,
  Map,
  // PieChart, // Commented out
  Send,
  Settings2,
  SquareTerminal,
  ShieldQuestion,
  LucideIcon,
  ShieldCheck, // Changed User to ShieldCheck for Admin for better visual distinction
  // Home, 
  // User, // Replaced by ShieldCheck for admin or can be other role-specific icon
  // ChevronsRight, 
  // Dot, 
  ServerCog, // Added for API Monitoring
  Wrench,
} from "lucide-react";

import { NavMain, NavMainItemProps } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects"; // Keep if projects are used, else can be removed if navData.projects is empty
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  // SidebarHeader, // Kept for potential structure
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo2 } from "@/app/onboarding/AppLogo";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Import Zustand store and user types
import { useAppStore } from '@/stores/appStore';
import { UserRole, User } from '@/types/auth'; // Import User and UserRole

export interface ActiveAccents {
  [key: string]: string;
  default: string;
}

const activeAccents: ActiveAccents = {
  dashboard: "text-sky-600 dark:text-sky-400 border-sky-500 indicator-bg-sky-500",
  control: "text-indigo-600 dark:text-indigo-400 border-indigo-500 indicator-bg-indigo-500",
  circuit: "text-purple-600 dark:text-purple-400 border-purple-500 indicator-bg-purple-500",
  settings: "text-pink-600 dark:text-pink-400 border-pink-500 indicator-bg-pink-500",
  help: "text-teal-600 dark:text-teal-400 border-teal-500 indicator-bg-teal-500",
  report: "text-amber-600 dark:text-amber-400 border-amber-500 indicator-bg-amber-500",
  projects: "text-orange-600 dark:text-orange-400 border-orange-500 indicator-bg-orange-500",
  admin: "text-red-600 dark:text-red-400 border-red-500 indicator-bg-red-500", // Added admin color
  system: "text-gray-600 dark:text-gray-400 border-gray-500 indicator-bg-gray-500", // Added for system/API monitoring
  default: "text-primary border-primary indicator-bg-primary dark:text-primary-dark dark:border-primary-dark dark:indicator-bg-primary-dark"
};

interface NavChildItemForSectionLogic {
  title?: string;
  name?: string;
  url: string;
  sectionId: string;
  icon?: LucideIcon; // icon could be useful here too
  colorKey?: keyof ActiveAccents;
}

// Define NavProjectItemProps interface - assuming it's used elsewhere or keep projects minimal
interface NavProjectItemProps {
  name: string;
  url: string;
  icon: LucideIcon;
  sectionId: string;
  colorKey: string;
}

// Define NavSecondaryItemProps interface
interface NavSecondaryItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  sectionId: string;
  colorKey: string;
}

// Original navigation data configuration
const navDataConfig = {
  navMainBase: [
    { title: "Control Panel", url: "/control", icon: SquareTerminal, sectionId: "Control Panel", colorKey: "control" },
    { title: "Dashboard", url: "/dashboard", icon: Bot, sectionId: "Dashboard", colorKey: "dashboard" },
    { title: "Circuit Layouts", url: "/circuit", icon: BookOpen, sectionId: "Circuit Layouts", colorKey: "circuit" },
  ] as NavMainItemProps[],
  maintenanceNavItem: { title: "Maintained", url: "/maintained", icon: Wrench, sectionId: "Maintained", colorKey: "red" } as NavMainItemProps,
  adminNavItem: { title: "Administration", url: "/admin", icon: ShieldCheck, sectionId: "Administration", colorKey: "admin" } as NavMainItemProps,
  adminSettingsNavItem: { title: "Mobile Config", url: "/mobile-config", icon: Settings2, sectionId: "Settings", colorKey: "settings" } as NavMainItemProps,
  apiMonitoringNavItem: { title: "API Monitoring", url: "/system/api-monitoring", icon: ServerCog, sectionId: "API Monitoring", colorKey: "system" } as NavMainItemProps,
  navSecondary: [
    { title: "Help Center", url: "/help", icon: ShieldQuestion, sectionId: "Help Center", colorKey: "help" },
    { title: "Privacy Policy", url: "/privacy-policy", icon: LifeBuoy, sectionId: "Privacy Policy", colorKey: "settings" },
    { title: "Terms of Service", url: "/terms-of-service", icon: Map, sectionId: "Terms of Service", colorKey: "dashboard" },
    { title: "Report Issue", url: "/report-issue", icon: Send, sectionId: "Report Issue", colorKey: "report" },
  ] as NavSecondaryItemProps[],
  projects: [] as NavProjectItemProps[], // Keep empty or define projects if any
};

const headerVariants = {
  collapsed: { height: 68, paddingTop: "0.5rem", paddingBottom: "0.5rem" },
  expanded: { height: 88, paddingTop: "1rem", paddingBottom: "1rem" },
};
const logoContainerVariants = {
  collapsed: { scale: 0.75, x: -2, y: 0 },
  expanded: { scale: 1, x: 0, y: 0 },
};
const appNameVariants = {
  collapsed: { opacity: 0, width: 0, marginLeft: 0, transition: { duration: 0.1 } },
  expanded: { opacity: 1, width: "auto", marginLeft: "0.625rem", transition: { delay: 0.1, duration: 0.2 } },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar();
  const isCollapsed = !isMobile && sidebarState === "collapsed";
  // Set default collapsed state for non-mobile devices
  React.useEffect(() => {
    if (!isMobile && sidebarState === "expanded") {
      // Auto-collapse on component mount for desktop
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebarElement) {
        const collapseButton = sidebarElement.querySelector('[data-sidebar="trigger"]');
        if (collapseButton instanceof HTMLElement) {
          collapseButton.click();
        }
      }
    }
  }, [isMobile, sidebarState]);
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const currentUser = useAppStore((state) => state.currentUser);

  // Dynamically construct navMainItems based on user role
  const navMainItems = React.useMemo(() => {
    let items = [...navDataConfig.navMainBase];
    // Add API Monitoring for all users
    items.push(navDataConfig.apiMonitoringNavItem);
    
    if (currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR)) {
      items.push(navDataConfig.maintenanceNavItem);
    }
    if (currentUser && currentUser.role === UserRole.ADMIN) {
      items.push(navDataConfig.adminNavItem);
      items.push(navDataConfig.adminSettingsNavItem);
    }
    // Example: Add for other roles if needed
    // else if (currentUser && currentUser.role === UserRole.EDITOR) {
    //   items.push(navDataConfig.apiMonitoringNavItem);
    // }
    return items;
  }, [currentUser]);

  const activeSection = React.useMemo(() => {
    if (pathname === "/") return "Dashboard"; // Default to Dashboard for home

    const allNavItems: NavChildItemForSectionLogic[] = [
      ...navMainItems, // Use dynamically generated navMainItems
      ...navDataConfig.projects,
      ...navDataConfig.navSecondary,
    ];

    const findActive = (items: NavChildItemForSectionLogic[]) => {
      let bestMatch: NavChildItemForSectionLogic | undefined = undefined;
      let bestMatchLength = 0;

      for (const item of items) {
        if (pathname === item.url) return item.sectionId; 
        if (pathname.startsWith(item.url) && (pathname.length === item.url.length || pathname[item.url.length] === '/')) {
            if (item.url.length > bestMatchLength) {
                bestMatch = item;
                bestMatchLength = item.url.length;
            }
        }
      }
      return bestMatch?.sectionId;
    };
    
    let currentSection = findActive(allNavItems);

    if (!currentSection) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0].toLowerCase();
        const mappedSection = allNavItems.find(
          item => item.url.substring(1).toLowerCase() === firstSegment
        );
        if (mappedSection) return mappedSection.sectionId;
        // Fallback to capitalizing the first segment if no direct mapping
        return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
      }
    }
    return currentSection || "Dashboard"; // Ultimate fallback
  }, [pathname, navMainItems]); // Add navMainItems to dependency array

  if (!storeHasHydrated) {
    // Skeleton rendering remains the same
    return (
      <Sidebar variant="inset" {...props} className="animate-pulse !bg-transparent dark:!bg-transparent pointer-events-none">
        <motion.div
          variants={headerVariants}
          animate="collapsed"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center px-2.5 border-b border-slate-200/80 dark:border-slate-800 overflow-hidden"
        >
          <motion.div variants={logoContainerVariants} className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0" />
          <motion.div variants={appNameVariants} className="flex-1">
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </motion.div>
        </motion.div>
        <SidebarContent className="py-3">
          {[...Array(4)].map((_, i) => <div key={i} className={`h-10 mx-2.5 mb-1.5 rounded-md bg-slate-200 dark:bg-slate-700 ${isCollapsed ? 'w-10 !mx-auto' : ''}`}></div>)}
        </SidebarContent>
        <SidebarFooter className="p-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <div className={`h-12 rounded-md bg-slate-200 dark:bg-slate-700 ${isCollapsed ? 'w-10 !mx-auto h-10' : ''}`}></div>
        </SidebarFooter>
      </Sidebar>
    );
  }
  
  return (
    <Sidebar variant="inset" {...props}
      className={cn("transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isCollapsed ? "shadow-none" : "shadow-xl dark:shadow-slate-900/50")}>
      <motion.div
        variants={headerVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center border-b border-slate-200/80 dark:border-slate-800 overflow-hidden px-2.5"
      >
        <SidebarMenu className="w-full">
          <SidebarMenuItem className="hover:!bg-transparent dark:hover:!bg-transparent focus-visible:!ring-0">
            <SidebarMenuButton
              size="lg"
              asChild
              className={cn(
                "!bg-transparent !p-0 hover:!bg-slate-100/60 dark:hover:!bg-slate-800/60 focus-visible:!ring-2 focus-visible:!ring-sky-500 dark:focus-visible:!ring-sky-500 rounded-lg transition-colors",
                isCollapsed && "!justify-center !w-auto"
              )}
            >
              <Link href="/" className="flex items-center w-full py-2 px-1.5">
                <motion.div
                  variants={logoContainerVariants}
                  className="flex flex-shrink-0 aspect-square size-12 items-center justify-center rounded-lg p-0.5 border-2 border-slate-300/80 dark:border-slate-600"
                  whileHover={{ scale: 1.1, rotate: 8, transition: { type: "spring", stiffness: 350, damping: 10 } }}
                >
                  <AppLogo2 className="max-h-full max-w-full h-auto w-auto text-white" />
                </motion.div>
                <motion.div variants={appNameVariants} className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-md text-slate-800 dark:text-slate-100">{APP_NAME}</span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">Energy Portal</span>
                </motion.div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </motion.div>
      <SidebarContent className="py-2.5 transition-opacity duration-150" style={{ opacity: isCollapsed ? 0.3 : 1 }}>
        <NavMain
          items={navMainItems} // Pass the dynamically generated items
          activeSection={activeSection}
          activeAccents={activeAccents}
        />
        {navDataConfig.projects.length > 0 && ( // Use navDataConfig here
          <NavProjects
            projects={navDataConfig.projects} // Use navDataConfig here
            activeSection={activeSection}
            activeAccents={activeAccents}
          />
        )}
        <NavSecondary
          items={navDataConfig.navSecondary} // Use navDataConfig here
          activeSection={activeSection}
          activeAccents={activeAccents}
          className="mt-auto pt-2.5 border-t border-border/20 dark:border-slate-700/50"
        />
      </SidebarContent>
      <SidebarFooter className={cn(
        "border-t border-border/20 dark:border-slate-700/50 p-2.5 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-all duration-200",
        isCollapsed && "!py-2"
      )}>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}