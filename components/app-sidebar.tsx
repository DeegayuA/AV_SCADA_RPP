"use client"

import * as React from "react"
import { motion } from "framer-motion"
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

import logo from "@/av_logo.svg"

const data = {
  user: {
    name: "AltaVision",
    email: "user@altavision.com",
    avatar: "https://i.pravatar.cc/300",
  },
  navMain: [
    {
      title: "Control Panel",
      url: "control",
      icon: SquareTerminal,
      isActive: false,
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
      url: "dashboard",
      icon: Bot,
      items: [
        {
          title: "Data at a glance",
          url: "dashboard",
        },
        {
          title: "simeple testing dash",
          url: "simpledash",
        },
        {
          title: "View3",
          url: "#",
        },
      ],
    },
    {
      title: "Another Section",
      url: "circuit",
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
      title: "Help",
      url: "help",
      icon: LifeBuoy,
    },
    {
      title: "Report Bugs",
      url: "report",
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

export function AppSidebar({ activeSection, ...props }: React.ComponentProps<typeof Sidebar> & { activeSection?: string }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <motion.div
                  className={`flex aspect-square size-12 items-center justify-center rounded-lg bg-white text-white p-1`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <img src={logo.src} alt="logo" />
                </motion.div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-xl">AltaVison</span>
                  <span className="truncate text-xs">Solar</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} activeSection={activeSection} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
