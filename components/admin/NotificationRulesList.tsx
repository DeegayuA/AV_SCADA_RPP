'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { NotificationRule } from '@/types/notifications';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit3, Trash2, FlaskConical, CheckCircle, XCircle, AlertTriangle, InfoIcon, ShieldAlert } from 'lucide-react'; // More specific icons
import { cn } from '@/lib/utils';

interface NotificationRulesListProps {
  rules: NotificationRule[];
  onEdit: (rule: NotificationRule) => void;
  onDelete: (ruleId: string) => void; // Parent handles async and toast
  onTestRule?: (rule: NotificationRule) => void; // Optional, only in dev
  // isDevelopment?: boolean; // Can be inferred if onTestRule is present
}

const rowVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' } 
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};

const getSeverityStyles = (severity: 'critical' | 'warning' | 'info' | string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return "border-red-500 text-red-600 bg-red-500/10 dark:text-red-400 dark:border-red-400/50 dark:bg-red-400/10";
    case 'warning':
      return "border-amber-500 text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:border-amber-400/50 dark:bg-amber-400/10";
    case 'info':
    default:
      return "border-sky-500 text-sky-600 bg-sky-500/10 dark:text-sky-400 dark:border-sky-400/50 dark:bg-sky-400/10";
  }
};
const getSeverityIcon = (severity: 'critical' | 'warning' | 'info' | string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />;
    case 'info':
    default:
      return <InfoIcon className="h-3.5 w-3.5 mr-1.5" />;
  }
};

export const NotificationRulesList: React.FC<NotificationRulesListProps> = ({
  rules,
  onEdit,
  onDelete,
  onTestRule,
}) => {
  // Empty state and loading state are handled by the parent modal for a more integrated feel.
  // This component now focuses solely on rendering the list of rules.
  if (rules.length === 0) {
    // This typically won't be hit if parent handles empty state,
    // but good as a fallback.
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No notification rules found or match current filters.</p>
      </div>
    );
  }

  const isDevelopment = !!onTestRule; // Inferring dev mode from the presence of onTestRule

  return (
    <TooltipProvider delayDuration={100}>
      <div className="border rounded-lg overflow-hidden dark:border-slate-700 shadow-sm">
        <Table className="min-w-full"> {/* Ensures table scrolls horizontally if needed */}
          <TableHeader className="bg-slate-50 dark:bg-slate-700/50">
            <TableRow className="border-b dark:border-slate-600/70">
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 w-[25%]">Name & Message</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Data Point</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Condition</TableHead>
              {/* Threshold combined with Condition often or separated */}
              {/* <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Threshold</TableHead> */}
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Severity</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Status</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-right w-[150px] sm:w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, index) => {
              const MotionTableRow = motion(TableRow);
              return (
                <MotionTableRow
                  key={rule.id}
                  variants={rowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={index} // For staggered animation
                  layout // Smooth layout changes (e.g., on delete)
                  className="border-b dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors duration-150"
                >
                <TableCell className="py-3 px-4 align-top">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{rule.name}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]" title={rule.message}>
                    {rule.message || <span className="italic">No custom message</span>}
                  </p>
                </TableCell>
                <TableCell className="py-3 px-4 align-top text-sm text-slate-600 dark:text-slate-300">{rule.dataPointKey}</TableCell>
                <TableCell className="py-3 px-4 align-top">
                  <Badge variant="outline" className="text-xs font-mono border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {rule.condition} {String(rule.thresholdValue)}
                  </Badge>
                </TableCell>
                {/* <TableCell className="py-3 px-4 align-top text-sm">{String(rule.thresholdValue)}</TableCell> */}
                <TableCell className="py-3 px-4 align-top">
                  <Badge variant="outline" className={cn("text-xs flex items-center w-fit", getSeverityStyles(rule.severity))}>
                    {getSeverityIcon(rule.severity)}
                    {(rule.severity || 'info').charAt(0).toUpperCase() + (rule.severity || 'info').slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-4 align-top text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        {rule.enabled ? (
                          <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 inline-block" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 dark:text-red-400 inline-block" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg">
                      <p>{rule.enabled ? 'Enabled' : 'Disabled'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="py-3 px-4 align-top text-right">
                  <div className="flex justify-end space-x-1.5">
                    {isDevelopment && onTestRule && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onTestRule(rule)}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-400/10"
                            aria-label="Test Rule"
                          >
                            <FlaskConical className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg"><p>Test Rule</p></TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(rule)}
                          className="h-8 w-8 text-slate-600 hover:bg-slate-500/10 dark:text-slate-400 dark:hover:bg-slate-400/10"
                          aria-label="Edit Rule"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg"><p>Edit Rule</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(rule.id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/10"
                          aria-label="Delete Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg"><p>Delete Rule</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                </MotionTableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};