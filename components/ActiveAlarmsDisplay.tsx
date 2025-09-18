'use client';

import React from 'react';
import { useAppStore } from '@/stores/appStore';
import { updateActiveAlarm } from '@/lib/db';
import { ActiveAlarm } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BellRing, CheckCheck, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ActiveAlarmsDisplay: React.FC = () => {
  const activeAlarms = useAppStore((state) => state.activeAlarms);
  const currentUser = useAppStore((state) => state.currentUser);

  const unacknowledgedAlarms = activeAlarms.filter(
    (alarm) =>
      !alarm.acknowledged &&
      (alarm.originalRuleDetails?.severity === 'critical' ||
        alarm.originalRuleDetails?.severity === 'warning')
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
      toast.success(`Alarm "${alarm.originalRuleDetails?.name || 'Unknown'}" acknowledged by ${ackUser}.`);
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
    return null;
  }

  // Get the most severe alarm to display
  const mostSevereAlarm = unacknowledgedAlarms.reduce((prev, current) => {
    if (current.originalRuleDetails?.severity === 'critical') return current;
    if (prev.originalRuleDetails?.severity === 'critical') return prev;
    return current;
  });

  const isCritical = mostSevereAlarm.originalRuleDetails?.severity === 'critical';

  return (
    <div className={`fixed top-0 left-0 right-0 z-[200] p-2 text-white shadow-lg flex items-center justify-between ${isCritical ? 'bg-red-600' : 'bg-yellow-500'}`}>
        <div className="flex items-center">
            <BellRing className="mr-3 h-6 w-6 animate-pulse" />
            <div>
                <p className="font-bold">{mostSevereAlarm.originalRuleDetails?.name || 'Unnamed Alarm'}</p>
                <p className="text-sm">
                    {String(mostSevereAlarm.currentValue)}{' '}
                    {mostSevereAlarm.originalRuleDetails?.condition}{' '}
                    {String(mostSevereAlarm.originalRuleDetails?.thresholdValue)}
                </p>
            </div>
        </div>
        <div className="flex items-center">
            {unacknowledgedAlarms.length > 1 && (
                <span className="text-sm mr-4">(and {unacknowledgedAlarms.length - 1} more)</span>
            )}
            <Button
                size="sm"
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/50"
                onClick={() => handleAcknowledge(mostSevereAlarm)}
            >
                <CheckCheck className="mr-2 h-4 w-4" /> Acknowledge
            </Button>
            <Button size="sm" variant="ghost" className="ml-2 hover:bg-white/20" onClick={() => toast.dismiss(`alarm-${mostSevereAlarm.id}`)}>
                <X className="h-5 w-5" />
            </Button>
        </div>
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
