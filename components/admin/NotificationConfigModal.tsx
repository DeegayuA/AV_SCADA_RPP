'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NotificationRuleForm } from './NotificationRuleForm';
import { NotificationRulesList } from './NotificationRulesList';
import {
  getAllNotificationRules,
  addNotificationRule,
  updateNotificationRule,
  deleteNotificationRule,
} from '@/lib/db';
import { NotificationRule } from '@/types/notifications';
import { dataPoints as allPossibleDataPoints, DataPoint } from '@/config/dataPoints';
import { toast } from 'sonner';
import { PlusCircle, BellRing, ArrowLeft, Inbox, Loader2, Edit3, Trash2, FlaskConical } from 'lucide-react'; // Added FlaskConical
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // For dev badge

interface NotificationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const listVariants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 30, transition: { duration: 0.2, ease: 'easeIn' } },
};

const formVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2, ease: 'easeIn' } },
};

// Determine if in development environment
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export const NotificationConfigModal: React.FC<NotificationConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setIsListLoading(true);
    try {
      const fetchedRules = await getAllNotificationRules();
      setRules(fetchedRules);
    } catch (error) {
      console.error('Failed to fetch notification rules:', error);
      toast.error('Failed to load rules.', { description: 'Please try closing and reopening the configuration.' });
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
      if (!editingRule) {
          setShowForm(false);
      }
    } else {
        setEditingRule(null);
        setShowForm(false);
    }
  }, [isOpen, fetchRules]);


  const handleAddNew = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  const handleEdit = (rule: NotificationRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = async (ruleId: string) => {
    const ruleToDelete = rules.find(r => r.id === ruleId);
    if (!ruleToDelete) return;

    toast.warning(`Delete "${ruleToDelete.name}"?`, {
        description: "This action cannot be undone.",
        action: {
            label: "Delete",
            onClick: async () => {
                try {
                    await deleteNotificationRule(ruleId);
                    toast.success(`Rule "${ruleToDelete.name}" deleted successfully.`);
                    fetchRules();
                } catch (error) {
                    console.error('Failed to delete rule:', error);
                    toast.error('Failed to delete rule.', { description: 'It might be in use or a database error occurred.'});
                }
            },
        },
        duration: 10000
    });
  };

  const handleSubmitForm = async (
    data: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt' | 'thresholdValue'> & { thresholdValue: number | string | boolean }
  ) => {
    setIsFormSubmitting(true);
    try {
      if (editingRule?.id) {
        await updateNotificationRule({ ...data, id: editingRule.id, thresholdValue: data.thresholdValue as any });
        toast.success(`Rule "${data.name}" updated.`, { icon: <Edit3 className="text-blue-500" /> });
      } else {
        await addNotificationRule(data as Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success(`Rule "${data.name}" added.`, { icon: <PlusCircle className="text-green-500" /> });
      }
      fetchRules();
      setShowForm(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule.', { description: 'Please check details and try again.'});
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  const handleTestRule = (rule: NotificationRule) => {
    // This is a placeholder for actual test logic.
    // In a real app, you might trigger a test event or evaluate the rule against current data.
    // For now, it just shows a toast.
    console.log("Testing Rule:", rule);
    toast.info(`Simulating test for rule: "${rule.name}"`, {
      description: `Condition: ${rule.dataPointKey} ${rule.condition} ${String(rule.thresholdValue)}.\nSeverity: ${rule.severity}. Message: "${rule.message}".`,
      duration: 8000,
      icon: <FlaskConical className="text-blue-500" />
    });
    // Example of a more specific test notification type if you have one
    // import { notifications } from '@/lib/notifications'; (your notification system)
    // notifications.show({
    //    title: `Test: ${rule.name}`,
    //    message: rule.message || `Test notification triggered for ${rule.dataPointKey}.`,
    //    severity: rule.severity, // Or a 'test' severity
    //    // ... any other properties your notification system uses
    // });
  };


  const typedAllPossibleDataPoints: DataPoint[] = allPossibleDataPoints as DataPoint[];

  const titleText = showForm ? (editingRule ? 'Edit Notification Rule' : 'Add New Notification Rule') : 'Notification Rules';
  const descriptionText = showForm 
    ? (editingRule ? `Modifying settings for "${editingRule.name}".` : 'Define a new condition for triggering alerts.')
    : 'Manage conditions that trigger system alarms and notifications.';


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden dark:bg-slate-800/90 dark:backdrop-blur-sm">
        <DialogHeader className="p-6 border-b dark:border-slate-700">
            <div className="flex items-center justify-between"> {/* For title and dev badge */}
                <div className="flex items-center space-x-3">
                    {showForm && (
                        <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}>
                            <Button variant="ghost" size="icon" onClick={handleCancelForm} className="text-muted-foreground hover:text-foreground h-9 w-9">
                                <ArrowLeft className="h-5 w-5" />
                                <span className="sr-only">Back to list</span>
                            </Button>
                        </motion.div>
                    )}
                    <BellRing className={cn("h-7 w-7", showForm ? "text-primary" : "text-primary")} />
                    <div>
                        <DialogTitle className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{titleText}</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{descriptionText}</DialogDescription>
                    </div>
                </div>
                {IS_DEVELOPMENT && !showForm && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-400/50 dark:bg-yellow-400/10 text-xs">
                       DEV MODE
                    </Badge>
                )}
            </div>
        </DialogHeader>

        <div className="flex-grow relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {showForm ? (
              <motion.div
                key="form"
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0"
              >
                <ScrollArea className="h-full p-6">
                  <NotificationRuleForm
                    key={editingRule?.id || 'new'}
                    initialData={editingRule || undefined}
                    onSubmit={handleSubmitForm}
                    onCancel={handleCancelForm}
                    allDataPoints={typedAllPossibleDataPoints}
                  />
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={listVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0 flex flex-col"
              >
                <div className="px-6 pt-6 pb-4">
                  <Button onClick={handleAddNew} variant="default" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground group">
                    <PlusCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Add New Rule
                  </Button>
                </div>
                
                <ScrollArea className="flex-grow px-6 pb-6">
                  {isListLoading ? (
                     <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-lg font-medium">Loading Rules...</p>
                        <p className="text-sm">Fetching your notification configurations.</p>
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                        <Inbox className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-6" />
                        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No Rules Yet</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                            Looks like you haven't set up any notification rules. Get started by adding one!
                        </p>
                        <Button onClick={handleAddNew} variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground group">
                            <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform"/> Create Your First Rule
                        </Button>
                    </div>
                  ) : (
                    <NotificationRulesList
                      rules={rules}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTestRule={IS_DEVELOPMENT ? handleTestRule : undefined} // Pass only in dev
                    />
                  )}
                </ScrollArea>
                 <DialogFooter className="mt-auto p-6 border-t dark:border-slate-700">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};