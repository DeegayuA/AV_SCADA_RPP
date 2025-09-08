"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isOnboardingComplete } from "@/lib/idb-store";
import { AppSidebar } from "@/components/app-sidebar"
import { ProtocolSwitcher } from "@/components/ProtocolSwitcher"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import ControlPanel from "./control_dash"

import { useParams, usePathname } from "next/navigation"
import { PLANT_LOCATION } from "@/config/constants";

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const controlParam = pathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Control Panel';
  
  // Protect this page - require onboarding completion
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const completed = await isOnboardingComplete();
      if (!completed) {
        toast.warning("Setup Required", { 
          description: "Please complete all onboarding steps before accessing the control panel.", 
          duration: 4000 
        });
        router.replace('/onboarding');
      }
    };
    
    checkOnboardingStatus();
  }, [router]);

  return (
    <SidebarProvider>
      <AppSidebar/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">
                   {PLANT_LOCATION}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{controlParam}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <ProtocolSwitcher showFullInterface={false} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 px-4 pt-0 ">
          <ControlPanel/>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
