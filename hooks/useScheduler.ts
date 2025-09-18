'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getDailyGeneration, getEmailLog, addEmailLog, getAllScheduledEmails, addEmailToQueue, getPendingEmails, updateEmailJob, deleteEmailJob } from '@/lib/db';
import { UserRole } from '@/types/auth';

export function useScheduler() {
  const { sunsetTime } = useAppStore();

  useEffect(() => {
    const checkAndSchedule = async () => {
      if (!sunsetTime) return;

      const now = new Date();
      const sunset = new Date(sunsetTime * 1000);

      if (now > sunset) {
        const today = now.toISOString().split('T')[0];
        const emailLog = await getEmailLog(today);

        if (!emailLog || emailLog.status === 'pending') {
          const scheduledEmails = await getAllScheduledEmails();
          if (scheduledEmails.length > 0) {
            const generation = await getDailyGeneration(today);
            const email = {
              subject: 'Daily Generation Report',
              message: `Today's total generation was ${generation} kWh.`,
              // In a real app, you'd get recipients based on roles
            };
            await addEmailToQueue(email);
            await addEmailLog({ date: today, status: 'pending', lastAttempt: Date.now() });
          }
        }
      }
    };

    const processEmailQueue = async () => {
        const pendingEmails = await getPendingEmails();
        for (const job of pendingEmails) {
            const now = Date.now();
            const lastAttempt = job.lastAttempt || 0;
            const retryCount = job.retryCount || 0;

            if (job.status === 'pending' || (job.status === 'failed' && now - lastAttempt > 60 * 1000)) {
                if (retryCount < 3) {
                    try {
                        await updateEmailJob({ ...job, status: 'sending', lastAttempt: now });
                        const response = await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rule: job.email, currentValue: 'Scheduled Report' }),
                        });
                        if (response.ok) {
                            await deleteEmailJob(job.id);
                            await addEmailLog({ date: new Date().toISOString().split('T')[0], status: 'sent', lastAttempt: now });
                        } else {
                            throw new Error('Failed to send email');
                        }
                    } catch (error) {
                        await updateEmailJob({ ...job, status: 'failed', retryCount: retryCount + 1 });
                    }
                } else if (now - lastAttempt > 60 * 60 * 1000) { // After 3 failed attempts, wait an hour
                     await updateEmailJob({ ...job, retryCount: 0 }); // Reset retry count for the next hour
                }
            }
        }
    };

    const scheduleInterval = setInterval(checkAndSchedule, 60 * 1000); // Every minute
    const queueInterval = setInterval(processEmailQueue, 30 * 1000); // Every 30 seconds

    return () => {
        clearInterval(scheduleInterval);
        clearInterval(queueInterval);
    };
  }, [sunsetTime]);
}
