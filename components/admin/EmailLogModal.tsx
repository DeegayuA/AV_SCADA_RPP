'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPendingEmails, getAllEmailLogs } from '@/lib/db';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailLogModal: React.FC<EmailLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchLogsAndQueue = async () => {
        const allLogs = await getAllEmailLogs();
        setLogs(allLogs);
        const pending = await getPendingEmails();
        setQueue(pending);
      };
      fetchLogsAndQueue();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Email Sending Status</DialogTitle>
          <DialogDescription>
            View the log of sent emails and the current queue of emails to be sent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <h3 className="font-semibold mb-2">Email Log</h3>
                <ScrollArea className="h-64 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.date}>
                                    <TableCell>{log.date}</TableCell>
                                    <TableCell>{log.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            <div>
                <h3 className="font-semibold mb-2">Email Queue</h3>
                <ScrollArea className="h-64 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Retries</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {queue.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell>{job.email.subject}</TableCell>
                                    <TableCell>{job.status}</TableCell>
                                    <TableCell>{job.retryCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
