// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion"; // AnimatePresence removed as it's not directly used at this level
import {
  BookOpen,
  Bot,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  // Home, // Already provided by NavUser or NavMain
  ShieldQuestion,
  LucideIcon,
  // ChevronsRight, // Not used directly, might be in child components
  // Dot, // Not used directly, might be in child components
} from "lucide-react";

import { NavMain, NavMainItemProps } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader, // SidebarHeader seemed unused, but kept for potential structure
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo2 } from "@/app/onboarding/AppLogo"; // Assuming AppLogo is AppLogo2 or vice versa
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Import Zustand store and user types
import { useAppStore } from '@/stores/appStore'; // Correct path to your store

// StoredUser interface is no longer needed here, as NavUser handles user data directly from the store.
// interface StoredUser { ... }

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
  default: "text-primary border-primary indicator-bg-primary dark:text-primary-dark dark:border-primary-dark dark:indicator-bg-primary-dark"
};


// Assuming NavChildItem is a shared type or defined elsewhere, 
// or NavMainItemProps, NavProjectItemProps, NavSecondaryItemProps cover these.
interface NavChildItemForSectionLogic {
  title?: string; 
  name?: string;
  url: string;
  sectionId: string;
}

// Define NavProjectItemProps interface since it's not exported from nav-projects
interface NavProjectItemProps {
  name: string;
  url: string;
  icon: LucideIcon;
  sectionId: string;
  colorKey: string;
}

// Define NavSecondaryItemProps interface since it's not exported from nav-secondary
interface NavSecondaryItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  sectionId: string;
  colorKey: string;
}

const navData = {
  navMain: [
    { title: "Control Panel", url: "/control", icon: SquareTerminal, sectionId: "Control Panel", colorKey: "control" },
    { title: "Dashboard", url: "/dashboard", icon: Bot, sectionId: "Dashboard", colorKey: "dashboard" },
    { title: "Circuit Layouts", url: "/circuit", icon: BookOpen, sectionId: "Circuit Layouts", colorKey: "circuit" },
    { title: "System Settings", url: "/settings", icon: Settings2, sectionId: "Settings", colorKey: "settings" },
  ] as NavMainItemProps[],
  navSecondary: [
    { title: "Help Center", url: "/help", icon: ShieldQuestion, sectionId: "Help Center", colorKey: "help" },
    { title: "Privacy Policy", url: "/privacy-policy", icon: LifeBuoy, sectionId: "Privacy Policy", colorKey: "settings" },
    { title: "Terms of Service", url: "/terms-of-service", icon: Map, sectionId: "Terms of Service", colorKey: "dashboard" },
    { title: "Report Issue", url: "/report-issue", icon: Send, sectionId: "Report Issue", colorKey: "report" },
  ] as NavSecondaryItemProps[],
  projects: [
    { name: "Main Plant Status", url: "/projects/main-plant", icon: Frame, sectionId: "Main Plant Status", colorKey: "projects" },
    { name: "Substation Alpha Metrics", url: "/projects/substation-alpha", icon: PieChart, sectionId: "Substation Alpha Metrics", colorKey: "projects" },
  ] as NavProjectItemProps[],
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
  // No longer need local currentUser state or setIsMounted based on localStorage
  // const [currentUser, setCurrentUser] = React.useState<StoredUser | null>(null);
  // const [isMounted, setIsMounted] = React.useState(false);
  
  const router = useRouter(); // Kept for activeSection logic, potentially not needed if activeSection solely relies on pathname
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar();
  const isCollapsed = !isMobile && sidebarState === "collapsed";

  // Get Zustand store hydration status
  // Zustand persist hydration status
  const storeHasHydrated = useAppStore.persist.hasHydrated();

  const activeSection = React.useMemo(() => {
    if (pathname === "/") return "Dashboard"; // Default to Dashboard for home

    const allNavItems: NavChildItemForSectionLogic[] = [
      ...navData.navMain,
      ...navData.projects,
      ...navData.navSecondary,
    ];

    const findActive = (items: NavChildItemForSectionLogic[]) => {
      let bestMatch: NavChildItemForSectionLogic | undefined = undefined;
      let bestMatchLength = 0;



      for (const item of items) {
        if (pathname === item.url) return item.sectionId; // Exact match is best
        // Check if pathname starts with item.url AND is followed by a '/' or is an exact match without trailing '/' for base path
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
        return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
      }
    }
    return currentSection || "Dashboard"; // Ultimate fallback
  }, [pathname]);


  // Removed the useEffect that managed local currentUser and router.replace.
  // Auth guarding should be handled by individual page components (like UnifiedDashboardPage)
  // or a higher-order component / middleware if using Next.js Pages Router patterns.

  // Render skeleton if Zustand store is not yet hydrated.
  // NavUser component will handle its own skeleton/loading state based on storeHasHydrated.
  if (!storeHasHydrated) {
    return (
      <Sidebar variant="inset" {...props} className="animate-pulse !bg-transparent dark:!bg-transparent pointer-events-none">
        <motion.div
          variants={headerVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
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
  
  // Main Sidebar Render once store is hydrated
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
          items={navData.navMain}
          activeSection={activeSection}
          activeAccents={activeAccents}
        />
        {navData.projects.length > 0 &&
          <NavProjects
            projects={navData.projects}
            activeSection={activeSection}
            activeAccents={activeAccents}
          />
        }
        <NavSecondary
          items={navData.navSecondary}
          activeSection={activeSection}
          activeAccents={activeAccents}
          className="mt-auto pt-2.5 border-t border-border/20 dark:border-slate-700/50"
        />
      </SidebarContent>

      <SidebarFooter className={cn(
        "border-t border-border/20 dark:border-slate-700/50 p-2.5 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-all duration-200",
        isCollapsed && "!py-2"
      )}>
        {/* NavUser component now gets user data directly from Zustand store */}
        {/* It will also handle its own skeleton/loading state based on store hydration */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}