"use client"

import * as React from "react"
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion"
import {
  // BadgeCheck, // Replaced by Settings for Account
  Bell,
  ChevronsUpDown,
  // CreditCard, // Merged into Help/Billing
  LogOut,
  // Sparkles, // Removed as "Upgrade to Pro" is now "Go to Home"
  LifeBuoy, 
  UserCircle, 
  Home,     
  Settings, 
  LogInIcon, // Renamed from LogIn for clarity to avoid conflict with function
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut, 
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const getInitials = (name: string): string => {
  if (!name) return "AV";
  const names = name.split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

interface UserData {
  name: string
  email: string
  avatar?: string
  role?: string
}

const menuItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.15, ease: "easeIn" } },
};

export function NavUser({ user }: { user: UserData | null }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(3); // Example state for badge

  const handleNavigation = React.useCallback((path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  }, [router]);

  const handlePlaceholderAction = React.useCallback((featureName: string) => {
    toast.info(`${featureName} feature is a demo.`, {
        description: "Full functionality coming soon!"
    });
    setIsMenuOpen(false);
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('user');
    toast.success("Logged out successfully!");
    router.push('/login');
    setIsMenuOpen(false);
  }, [router]);

  // Define menu items with actions and shortcuts
  const menuItems = React.useMemo(() => [
    { id: 'home', label: "Go to Home", icon: Home, action: () => handleNavigation('/'), shortcutKeys: { altKey: true, key: 'h' }, displayShortcut: "Alt+H" },
    { id: 'account', label: "Account Settings", icon: Settings, action: () => handlePlaceholderAction('Account Settings'), shortcutKeys: { altKey: true, key: 'a' }, displayShortcut: "Alt+A" },
    { id: 'help', label: "Help", icon: LifeBuoy, action: () => handleNavigation('/help'), shortcutKeys: { altKey: true, key: 'b' }, displayShortcut: "Alt+B" },
    { id: 'notifications', label: "Notifications", icon: Bell, action: () => { handlePlaceholderAction('Notifications'); setNotificationCount(0); }, shortcutKeys: { altKey: true, key: 'n' }, displayShortcut: "Alt+N", badge: notificationCount },
  ], [handleNavigation, handlePlaceholderAction, notificationCount]);


  // Keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isMenuOpen) return; // Only listen when menu is open for context

      const activeItem = menuItems.find(item => 
        item.shortcutKeys.altKey === event.altKey && 
        // item.shortcutKeys.ctrlKey === event.ctrlKey && // Add if using Ctrl
        // item.shortcutKeys.metaKey === event.metaKey && // Add if using Cmd
        item.shortcutKeys.key.toLowerCase() === event.key.toLowerCase()
      );

      if (activeItem) {
        event.preventDefault();
        activeItem.action();
      }

      // Logout shortcut - might want this to be more global or also contextual
      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        handleLogout();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, menuItems, handleLogout]); // Add handleLogout to dependencies


  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router.push('/login')}
            className="group w-full"
          >
            <Avatar className="h-8 w-8 rounded-lg border border-border/50 bg-muted group-hover:border-primary/50 transition-colors">
              <AvatarFallback className="rounded-lg bg-transparent text-muted-foreground group-hover:text-primary transition-colors">
                <UserCircle className="h-5 w-5"/>
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight ml-2.5">
              <span className="truncate font-medium text-muted-foreground group-hover:text-foreground transition-colors">Guest</span>
              <span className="truncate text-xs text-muted-foreground group-hover:text-primary transition-colors">Click to Login</span>
            </div>
            <LogInIcon className="ml-auto size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const userInitials = getInitials(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }} className="w-full">
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sky-500/10 dark:data-[state=open]:bg-sky-500/20 data-[state=open]:text-sky-600 dark:data-[state=open]:text-sky-400 w-full group hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 rounded-lg border-2 border-transparent group-data-[state=open]:border-sky-500/50 transition-all">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-xs font-semibold text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-2.5 grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                </div>
                <ChevronsUpDown 
                  className={`ml-auto size-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} 
                />
              </SidebarMenuButton>
            </motion.div>
          </DropdownMenuTrigger>
          <AnimatePresence>
            {isMenuOpen && (
              <DropdownMenuContent
                asChild forceMount
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60 rounded-xl shadow-2xl bg-background/80 dark:bg-slate-900/80 backdrop-blur-lg border-border/50 dark:border-slate-700/50 p-2"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={isMobile ? 8 : 6}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                    <div className="flex items-center gap-2.5 text-left text-sm">
                      <Avatar className="h-9 w-9 rounded-lg border-2 border-sky-500/30">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-sky-600 to-cyan-600 text-sm font-semibold text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-100">{user.name}</span>
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                        {user.role && (
                           <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-medium tracking-wider mt-0.5">
                             {user.role.toUpperCase()}
                           </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1.5 bg-border/50 dark:bg-slate-700/50" />
                  
                  <DropdownMenuGroup>
                    {menuItems.map((item, index) => (
                      <motion.div key={item.id} variants={menuItemVariants} custom={index} initial="initial" animate="animate" exit="exit">
                        <DropdownMenuItem 
                            onClick={item.action}
                            className="group rounded-md text-sm text-slate-600 dark:text-slate-300 hover:!bg-sky-500/10 dark:hover:!bg-sky-500/20 hover:!text-sky-600 dark:hover:!text-sky-400 focus:!bg-sky-500/10 dark:focus:!bg-sky-500/20 focus:!text-sky-600 dark:focus:!text-sky-400 py-2 px-2.5 cursor-pointer"
                        >
                          <item.icon className="mr-2.5 h-4 w-4 opacity-70 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <motion.span 
                              key={item.badge} // Animate badge change
                              initial={{scale:0.5, opacity:0}}
                              animate={{scale:1, opacity:1}}
                              exit={{scale:0.5, opacity:0}}
                              className="ml-auto mr-2 text-xs bg-sky-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold"
                            >
                                {item.badge}
                            </motion.span>
                          )}
                          {item.displayShortcut && <DropdownMenuShortcut className="opacity-50 group-hover:opacity-80 group-focus:opacity-80">{item.displayShortcut}</DropdownMenuShortcut>}
                        </DropdownMenuItem>
                      </motion.div>
                    ))}
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator className="my-1.5 bg-border/50 dark:bg-slate-700/50" />
                  
                  <motion.div variants={menuItemVariants} custom={menuItems.length} initial="initial" animate="animate" exit="exit">
                    <DropdownMenuItem 
                        onClick={handleLogout}
                        className="group rounded-md text-sm text-red-600 dark:text-red-400 hover:!bg-red-500/10 dark:hover:!bg-red-500/20 hover:!text-red-500 dark:hover:!text-red-400 focus:!bg-red-500/10 dark:focus:!bg-red-500/20 focus:!text-red-500 dark:focus:!text-red-400 py-2 px-2.5 cursor-pointer"
                    >
                      <LogOut className="mr-2.5 h-4 w-4 opacity-70 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                      Log out
                      <DropdownMenuShortcut className="opacity-50 group-hover:opacity-80 group-focus:opacity-80">Alt+Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </motion.div>
                </motion.div>
              </DropdownMenuContent>
            )}
          </AnimatePresence>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}