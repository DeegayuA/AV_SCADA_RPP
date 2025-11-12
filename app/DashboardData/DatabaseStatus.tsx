"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database, Server, ServerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DatabaseStatusProps {
  status: "online" | "offline" | "disconnected";
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = React.memo(
  ({ status }) => {
    const handleReconnect = async () => {
      if (status !== "disconnected") return;

      toast.info("Attempting to reconnect to Database...", {
        id: "db-reconnect",
      });
      try {
        // You can add a reconnect endpoint here if needed
        toast.info("Database reconnection feature not yet implemented", {
          id: "db-reconnect",
        });
      } catch (error) {
        toast.error("Failed to reconnect to database.", {
          id: "db-reconnect",
          description: "Check the database connection.",
        });
      }
    };

    const getStatusInfo = () => {
      switch (status) {
        case "online":
          return {
            text: "DB: Online",
            Icon: Database,
            className:
              "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
            title: "Database connected and operational",
            pulsate: false,
          };
        case "offline":
          return {
            text: "DB: Offline",
            Icon: Server,
            className:
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
            title: "Database is offline",
            pulsate: false,
          };
        case "disconnected":
        default:
          return {
            text: "DB: Off",
            Icon: ServerOff,
            className:
              "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 cursor-pointer hover:bg-red-200 dark:hover:bg-red-800",
            title: "Database Disconnected. Click to attempt reconnection.",
            pulsate: false,
          };
      }
    };

    const { text, Icon, className, title, pulsate } = getStatusInfo();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={handleReconnect}
                className={cn(
                  "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors",
                  className
                )}
              >
                <motion.div
                  animate={
                    pulsate
                      ? {
                          scale: [1, 1.1, 1],
                          transition: { duration: 2, repeat: Infinity },
                        }
                      : {}
                  }
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                <span>{text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    );
  }
);

DatabaseStatus.displayName = "DatabaseStatus";

export default DatabaseStatus;
