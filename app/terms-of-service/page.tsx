// app/help/page.tsx (and similar pages)
'use client';

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { usePathname } from "next/navigation"; // Keep this
import { PLANT_LOCATION, APP_NAME } from "@/config/constants";
import { useEffect, useState } from "react";
import TermsOfServicePage from "./tos";

// Function to extract the primary section from the pathname
const getActiveSectionFromPath = (pathname: string | null): string => {
  if (!pathname) return "Dashboard"; // Default if pathname is null

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    // Capitalize the first letter, replace hyphens with spaces
    const sectionName = segments[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    // Map URL segments to your defined sidebar titles for exact match
    // This mapping is crucial if your URL segments don't directly match nav item titles
    const pathMap: { [key: string]: string } = {
        "control": "Control Panel",
        "dashboard": "Dashboard",
        "simpledash": "Dashboard", // Assuming simpledash is under Dashboard
        "circuit": "Another Section", // Or whatever "Another Section" links to
        "help": "Help",
        "report": "Report Bugs", // Example if it were a top-level link
        // Add other top-level route mappings here
    };
    return pathMap[segments[0].toLowerCase()] || sectionName || "Dashboard";
  }
  return "Dashboard"; // Fallback to Dashboard for "/"
};


export default function HelpLayoutPage() { // Renamed to avoid conflict if HelpPageContent exists
  const pathname = usePathname();
  
  // Determine the current page title for breadcrumb
  const currentPageTitle = pathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Help';
  
  // Get the active section for the sidebar
  const activeSection = getActiveSectionFromPath(pathname);


  return (
    <SidebarProvider>
      <AppSidebar/> {/* Pass dynamically determined activeSection */}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b dark:border-slate-800 bg-background/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-5 bg-border"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                   {PLANT_LOCATION || APP_NAME} 
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-muted-foreground" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-foreground">{currentPageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {/* Add other header elements here, like global search, notifications, theme toggle */}
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 pt-0 bg-slate-50 dark:bg-slate-950">
          {/* 
            The content of your help page (which you previously had as `HelpPage`)
            should be moved to a new component, e.g., `app/help/help-content.tsx`
            and then imported and rendered here.
          */}
          <TermsOfServicePage/>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}