"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "AltaVision",
    email: "user@altavision.com",
    avatar: "https://i.pravatar.cc/300",
  },
  navMain: [
    {
      title: "Control Panel",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "DEYE Hybrid",
          url: "#",
        },
        {
          title: "Goodwe 10kW",
          url: "#",
        },
        {
          title: "Goodwe 5kW",
          url: "#",
        },
      ],
    },
    {
      title: "Dashboard",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "View1",
          url: "#",
        },
        {
          title: "View2",
          url: "#",
        },
        {
          title: "View3",
          url: "#",
        },
      ],
    },
    {
      title: "Another Section",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "View1",
          url: "#",
        },
        {
          title: "View2",
          url: "#",
        },
        {
          title: "View3",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "P1",
      url: "#",
      icon: Frame,
    },
    {
      name: "P2",
      url: "#",
      icon: PieChart,
    },
    {
      name: "P3",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  AV
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">AltaVison</span>
                  <span className="truncate text-xs">Solar</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
