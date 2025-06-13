'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from '@/lib/db'; // Assuming correct path from previous steps
import { NotificationRule } from '@/types/notifications';
import { dataPoints as allPossibleDataPoints, DataPoint } from '@/config/dataPoints'; // Use the actual exported name
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';

interface NotificationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationConfigModal: React.FC<NotificationConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    setIsListLoading(true);
    try {
      const fetchedRules = await getAllNotificationRules();
      setRules(fetchedRules);
    } catch (error) {
      console.error('Failed to fetch notification rules:', error);
      toast.error('Failed to load rules. Please try again.');
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
      // Ensure form is hidden when modal reopens unless an edit is triggered
      if (!editingRule) {
        setShowForm(false);
      }
    }
  }, [isOpen, fetchRules, editingRule]);

  const handleAddNew = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  const handleEdit = (rule: NotificationRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = async (ruleId: string) => {
    // The loading state for delete is handled within NotificationRulesList
    // but we can set global loading if needed, or rely on its internal state.
    // For now, just call delete and refresh.
    try {
      await deleteNotificationRule(ruleId);
      toast.success('Notification rule deleted successfully.');
      fetchRules(); // Refresh list
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule. It might be in use or a database error occurred.');
    }
  };

  const handleSubmitForm = async (
    data: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt' | 'thresholdValue'> & { thresholdValue: number | string | boolean }
  ) => {
    setIsLoading(true);
    try {
      if (editingRule?.id) {
        await updateNotificationRule({ ...data, id: editingRule.id });
        toast.success(`Rule "${data.name}" updated successfully.`);
      } else {
        const newId = await addNotificationRule(data as Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>); // Cast needed if addNotificationRule expects no id
        toast.success(`Rule "${data.name}" added successfully.`);
      }
      fetchRules(); // Refresh list
      setShowForm(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule. Please check the details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  // Ensure allPossibleDataPoints is correctly typed if it's directly from config
  const typedAllPossibleDataPoints: DataPoint[] = allPossibleDataPoints as DataPoint[];


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Notification Rules</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="py-4 flex-grow overflow-y-auto">
            <NotificationRuleForm
              initialData={editingRule || undefined}
              onSubmit={handleSubmitForm}
              onCancel={handleCancelForm}
              allDataPoints={typedAllPossibleDataPoints}
            />
          </div>
        ) : (
          <>
            <div className="py-4 flex-grow overflow-y-auto">
              <div className="mb-4 flex justify-end">
                <Button onClick={handleAddNew} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Rule
                </Button>
              </div>
              <NotificationRulesList
                rules={rules}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isListLoading}
              />
            </div>
            <DialogFooter className="mt-auto pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationConfigModal;
