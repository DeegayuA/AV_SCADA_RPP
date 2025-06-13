'use client';

import React from 'react';
import { useAppStore } from '@/stores/appStore';
import { updateActiveAlarm } from '@/lib/db';
import { ActiveAlarm } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BellRing, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ActiveAlarmsDisplay: React.FC = () => {
  const activeAlarms = useAppStore((state) => state.activeAlarms);
  const currentUser = useAppStore((state) => state.currentUser);
  // No need to call setActiveAlarms directly from here, useNotificationSystem handles it.

  const unacknowledgedAlarms = activeAlarms.filter(
    (alarm) =>
      !alarm.acknowledged &&
      (alarm.originalRuleDetails.priority === 'HIGH' ||
        alarm.originalRuleDetails.priority === 'MEDIUM')
  );

  const handleAcknowledge = async (alarm: ActiveAlarm) => {
    try {
      const ackUser = currentUser?.name || currentUser?.email || 'system';
      await updateActiveAlarm({
        id: alarm.id,
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: ackUser,
      });
      toast.dismiss(`alarm-${alarm.id}`); // Dismiss the persistent toast
      toast.success(`Alarm "${alarm.originalRuleDetails.name}" acknowledged by ${ackUser}.`);
      // The useNotificationSystem hook will eventually sync its local state from DB
      // or if it directly listens to DB changes (which it doesn't currently),
      // and then update the Zustand store.
      // For immediate UI update, we might need a direct refresh mechanism or ensure
      // useNotificationSystem updates Zustand quickly after DB update.
      // For now, relying on useNotificationSystem's polling/update cycle.
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
      toast.error('Failed to acknowledge alarm. Please try again.');
    }
  };

  if (unacknowledgedAlarms.length === 0) {
    return null; // Or a subtle "No active critical alarms" message if preferred
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-md space-y-3">
      {unacknowledgedAlarms.map((alarm) => (
        <Card
          key={alarm.id}
          className={`border-2 ${
            alarm.originalRuleDetails.priority === 'HIGH'
              ? 'border-red-500/80 bg-red-500/10 dark:bg-red-900/30'
              : 'border-yellow-500/80 bg-yellow-500/10 dark:bg-yellow-900/30'
          } shadow-xl animate-pulse-once-fast`} // Custom animation for new alarms
        >
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold flex items-center">
                <BellRing
                  className={`mr-2 h-5 w-5 ${
                    alarm.originalRuleDetails.priority === 'HIGH' ? 'text-red-500' : 'text-yellow-500'
                  }`}
                />
                {alarm.originalRuleDetails.name || 'Unnamed Alarm'}
              </CardTitle>
              <Badge
                variant={
                  alarm.originalRuleDetails.priority === 'HIGH' ? 'destructive' : 'secondary'
                }
                className={
                    alarm.originalRuleDetails.priority === 'HIGH'
                    ? 'bg-red-600 text-white'
                    : 'bg-yellow-500 text-black'
                }
              >
                {alarm.originalRuleDetails.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4 text-xs">
            <p className="text-muted-foreground">
              Triggered: {formatDistanceToNow(new Date(alarm.triggeredAt), { addSuffix: true })}
            </p>
            <p className="font-mono my-1">
              Condition: {String(alarm.currentValue)}{' '}
              <span className="font-bold">{alarm.originalRuleDetails.condition}</span>{' '}
              {String(alarm.originalRuleDetails.thresholdValue)}
            </p>
            <p className="text-muted-foreground text-[11px]">Rule Node ID: {alarm.originalRuleDetails.nodeId}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full text-xs h-8 border-gray-400 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => handleAcknowledge(alarm)}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Add a simple keyframe animation for new alarms if not already in globals.css
// This is a conceptual placement. Ideally, this would be in a CSS file.
if (typeof window !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  const keyframes = `
  @keyframes pulse-once-fast {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.3); }
    50% { transform: scale(1.02); box-shadow: 0 0 0 5px rgba(0, 0, 0, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
  }`;
  try {
    if (styleSheet) { // Check if styleSheet exists
        // Check if this specific animation already exists to avoid duplicates if component re-renders in dev
        let animationExists = false;
        if (styleSheet.cssRules) { // cssRules can be null if stylesheet is from different origin
            for (let i = 0; i < styleSheet.cssRules.length; i++) {
                const rule = styleSheet.cssRules[i] as CSSKeyframesRule;
                if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'pulse-once-fast') {
                    animationExists = true;
                    break;
                }
            }
        }
        if (!animationExists) {
            styleSheet.insertRule(keyframes, styleSheet.cssRules ? styleSheet.cssRules.length : 0);
        }
    }
  } catch (e) {
    console.warn("Could not insert keyframes for ActiveAlarmsDisplay:", e);
  }
}


export default ActiveAlarmsDisplay;
