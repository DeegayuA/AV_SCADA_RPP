// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Home,
  ShieldQuestion,
  LucideIcon, // Import LucideIcon for type usage
  ChevronsRight, // For project expansion
  Dot, // Subtle indicator for active project
} from "lucide-react";

import { NavMain, NavMainItemProps } from "@/components/nav-main";
import { NavProjects /*, NavProjectItemProps (Define this) */ } from "@/components/nav-projects";
import { NavSecondary /*, NavSecondaryItemProps (Define this) */ } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar, // Import useSidebar
} from "@/components/ui/sidebar";
import { AppLogo, AppLogo2 } from "@/app/onboarding/AppLogo";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";
import Link from "next/link"; // Import Link

interface StoredUser {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface ActiveAccents { // Export for use in child components
  [key: string]: string; // e.g., "dashboard": "text-sky-600 dark:text-sky-400 border-sky-500"
  default: string;
}

const activeAccents: ActiveAccents = {
  dashboard: "text-sky-600 dark:text-sky-400 border-sky-500 indicator-bg-sky-500",
  control: "text-indigo-600 dark:text-indigo-400 border-indigo-500 indicator-bg-indigo-500",
  circuit: "text-purple-600 dark:text-purple-400 border-purple-500 indicator-bg-purple-500",
  settings: "text-pink-600 dark:text-pink-400 border-pink-500 indicator-bg-pink-500",
  help: "text-teal-600 dark:text-teal-400 border-teal-500 indicator-bg-teal-500",
  report: "text-amber-600 dark:text-amber-400 border-amber-500 indicator-bg-amber-500",
  projects: "text-orange-600 dark:text-orange-400 border-orange-500 indicator-bg-orange-500", // Example for projects section
  default: "text-primary border-primary indicator-bg-primary dark:text-primary-dark dark:border-primary-dark dark:indicator-bg-primary-dark"
};

// Define Props for NavProjects and NavSecondary if they are separate components
// You would create these interfaces in their respective files or a shared types file.
// For this example, I'll use a generic structure and you should adapt it.

interface NavChildItem {
  title?: string; // Title for main/secondary, name for projects
  name?: string;
  url: string;
  icon: LucideIcon;
  sectionId: string; // Unique ID for matching activeSection
  colorKey?: keyof ActiveAccents; // To pick specific accent
}
export interface NavProjectItemProps extends NavChildItem { name: string; }
export interface NavSecondaryItemProps extends NavChildItem { title: string; }


const navData = {
  navMain: [
    { title: "Control Panel", url: "/control", icon: SquareTerminal, sectionId: "Control Panel", colorKey: "control" },
    { title: "Dashboard", url: "/dashboard", icon: Bot, sectionId: "Dashboard", colorKey: "dashboard" },
    { title: "Circuit Layouts", url: "/circuit", icon: BookOpen, sectionId: "Circuit Layouts", colorKey: "circuit" },
    { title: "System Settings", url: "/settings", icon: Settings2, sectionId: "Settings", colorKey: "settings" },
  ] as NavMainItemProps[], // Ensure type assertion here
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

// --- Header animations ---
const headerVariants = {
  collapsed: { height: 68, paddingTop: "0.5rem", paddingBottom: "0.5rem" },
  expanded: { height: 88, paddingTop: "1rem", paddingBottom: "1rem" },
};
const logoContainerVariants = {
  collapsed: { scale: 0.75, x: -2, y: 0 }, // Center it when collapsed
  expanded: { scale: 1, x: 0, y: 0 },
};
const appNameVariants = {
  collapsed: { opacity: 0, width: 0, marginLeft: 0, transition: { duration: 0.1 } },
  expanded: { opacity: 1, width: "auto", marginLeft: "0.625rem", transition: { delay: 0.1, duration: 0.2 } },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState<StoredUser | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar(); // Get state and isMobile
  const isCollapsed = !isMobile && sidebarState === "collapsed";


  const activeSection = React.useMemo(() => {
    if (pathname === "/") return "Control";

    const findActive = (items: NavChildItem[]) => {
      // Prioritize exact match or deepest prefix match
      let bestMatch: NavChildItem | undefined = undefined;
      let bestMatchLength = 0;

      for (const item of items) {
        if (pathname === item.url) {
          return item.sectionId || item.title || item.name; // Exact match is best
        }
        if (pathname.startsWith(item.url + '/') && item.url.length > bestMatchLength) {
          bestMatch = item;
          bestMatchLength = item.url.length;
        }
      }
      return bestMatch?.sectionId || bestMatch?.title || bestMatch?.name;
    };

    let currentSection = findActive(navData.navMain);
    if (!currentSection) currentSection = findActive(navData.projects);
    if (!currentSection) currentSection = findActive(navData.navSecondary);

    // Fallback if no specific section matched (e.g. deeply nested pages not in nav)
    if (!currentSection) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const firstSegment = segments[0].toLowerCase();
        // Try to map first segment back to a sectionId (more robust)
        const mappedSection = [...navData.navMain, ...navData.navSecondary, ...navData.projects].find(
          item => item.url.substring(1).toLowerCase() === firstSegment // compare e.g. 'dashboard' with 'dashboard'
        );
        if (mappedSection) return mappedSection.sectionId;
        return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1); // Capitalize
      }
    }
    return currentSection || "Dashboard"; // Ultimate fallback
  }, [pathname]);


  React.useEffect(() => {
    const storedUserString = localStorage.getItem("user");
    if (storedUserString) {
      try { setCurrentUser(JSON.parse(storedUserString)); }
      catch (e) {
        console.error("User parse error", e); localStorage.removeItem("user");
        if (pathname !== '/login' && !pathname.startsWith('/onboarding')) router.replace("/login");
      }
    } else {
      if (pathname !== '/login' && !pathname.startsWith('/onboarding')) router.replace("/login");
    }
    setIsMounted(true);
  }, [pathname, router]);

  if (!isMounted) {
    return ( // Skeleton Sidebar
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
          {[...Array(4)].map((_, i) => <div key={i} className={`h-10 mx-2.5 rounded-md bg-slate-200 dark:bg-slate-700 ${isCollapsed ? 'w-10 !mx-auto' : ''}`}></div>)}
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
      <motion.div // Wrap header for animated height based on isCollapsed
        variants={headerVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center border-b border-slate-200/80 dark:border-slate-800 overflow-hidden px-2.5" // Use variants for padding
      >
        <SidebarMenu className="w-full"> {/* Ensure menu takes full width */}
          <SidebarMenuItem className="hover:!bg-transparent dark:hover:!bg-transparent focus-visible:!ring-0">
            <SidebarMenuButton
              size="lg"
              asChild
              className={cn(
                "!bg-transparent !p-0 hover:!bg-slate-100/60 dark:hover:!bg-slate-800/60 focus-visible:!ring-2 focus-visible:!ring-sky-500 dark:focus-visible:!ring-sky-500 rounded-lg transition-colors",
                isCollapsed && "!justify-center !w-auto"
              )}
            >
              <Link href="/" className="flex items-center w-full py-2 px-1.5"> {/* Added padding here for button-like area */}
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
        {currentUser ? (
          <NavUser user={{ name: currentUser.name || "User", email: currentUser.email, avatar: currentUser.avatar, role: currentUser.role }} />
        ) : (
          <div className={cn(
            "flex items-center justify-center p-2 h-[52px]",
            isCollapsed && "!h-10"
          )}>
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mr-2"></div>
            {!isCollapsed &&
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-2 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            }
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}