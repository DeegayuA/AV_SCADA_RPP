'use client';

import React from 'react';
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
import { Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'; // Using CheckCircle2 and XCircle

interface NotificationRulesListProps {
  rules: NotificationRule[];
  onEdit: (rule: NotificationRule) => void;
  onDelete: (ruleId: string) => Promise<void>;
  isLoading?: boolean; // Optional loading state for delete operations
}

export const NotificationRulesList: React.FC<NotificationRulesListProps> = ({
  rules,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDeleteClick = async (ruleId: string) => {
    setDeletingId(ruleId);
    try {
      await onDelete(ruleId);
    } catch (error) {
      console.error("Failed to delete rule:", error);
      // Toast notification for error can be added here
    } finally {
      setDeletingId(null);
    }
  };

  if (!rules.length && !isLoading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No notification rules configured yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Node ID</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-center">Enabled</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && !rules.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                Loading rules...
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{rule.nodeId}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-mono">
                    {rule.condition}
                  </Badge>
                </TableCell>
                <TableCell>{String(rule.thresholdValue)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      rule.priority === 'HIGH'
                        ? 'destructive'
                        : rule.priority === 'MEDIUM'
                        ? 'secondary' // Consider an 'warning' or 'orange' variant if available
                        : 'outline'
                    }
                  >
                    {rule.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {rule.isEnabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 inline-block" title="Enabled" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 inline-block" title="Disabled" />
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rule)}
                    title="Edit Rule"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(rule.id)}
                    disabled={deletingId === rule.id || isLoading}
                    title="Delete Rule"
                  >
                    {deletingId === rule.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default NotificationRulesList;
