'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/stores/appStore';
import {
  getEnabledNotificationRules,
  addActiveAlarm,
  updateActiveAlarm,
  getActiveAlarm,
  getAllActiveAlarms,
  deleteActiveAlarm,
} from '@/lib/db';
import { playNotificationSound, NotificationSoundType } from '@/lib/utils'; // Import sound utility
import { toast } from 'sonner'; // Import toast
import type { NotificationRule, ActiveAlarm } from '@/types/notifications';
import type { DataPoint } from '@/config/dataPoints'; // Not directly used in this version but good for context

import { setActiveAlarms as updateGlobalActiveAlarms } from '@/stores/appStore'; // Import the action directly if it's exported, or useAppStore().setActiveAlarms

// Helper function to check condition
const checkCondition = (
  actualValue: any,
  condition: NotificationRule['condition'],
  thresholdValue: NotificationRule['thresholdValue']
): boolean => {
  if (actualValue === undefined || actualValue === null) {
    return false; // Cannot evaluate if actual value is not set
  }

  // Handle boolean comparisons
  if (typeof thresholdValue === 'boolean') {
    const actualBool = Boolean(actualValue); // Coerce actualValue to boolean
    switch (condition) {
      case '==':
        return actualBool === thresholdValue;
      case '!=':
        return actualBool !== thresholdValue;
      default:
        console.warn(`[NotificationSystem] Unsupported condition "${condition}" for boolean threshold.`);
        return false;
    }
  }

  // Handle numeric comparisons (attempt to parse actualValue if it's not a number)
  if (typeof thresholdValue === 'number') {
    const numericActualValue = typeof actualValue === 'number' ? actualValue : parseFloat(String(actualValue));
    if (isNaN(numericActualValue)) {
      console.warn(`[NotificationSystem] Could not parse actualValue "${actualValue}" to number for numeric comparison.`);
      return false;
    }
    switch (condition) {
      case '==':
        return numericActualValue === thresholdValue;
      case '!=':
        return numericActualValue !== thresholdValue;
      case '<':
        return numericActualValue < thresholdValue;
      case '<=':
        return numericActualValue <= thresholdValue;
      case '>':
        return numericActualValue > thresholdValue;
      case '>=':
        return numericActualValue >= thresholdValue;
      default:
        return false;
    }
  }

  // Handle string comparisons (case-sensitive)
  if (typeof thresholdValue === 'string') {
    const stringActualValue = String(actualValue);
    switch (condition) {
      case '==':
        return stringActualValue === thresholdValue;
      case '!=':
        return stringActualValue !== thresholdValue;
      // Other conditions like <, <=, >, >= are less common for strings but can be implemented if needed
      // For example, lexicographical comparison or length comparison.
      default:
        console.warn(`[NotificationSystem] Unsupported condition "${condition}" for string threshold, or condition not applicable.`);
        return false;
    }
  }

  console.warn(`[NotificationSystem] Unhandled threshold type: ${typeof thresholdValue}`);
  return false;
};


export const useNotificationSystem = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  // Internal activeAlarms state for this hook
  const [localActiveAlarms, setLocalActiveAlarms] = useState<ActiveAlarm[]>([]);
  const opcUaNodeValues = useAppStore((state) => state.opcUaNodeValues);
  const zustandSetActiveAlarms = useAppStore((state) => state.setActiveAlarms);

  // Sync localActiveAlarms to Zustand store whenever it changes
  useEffect(() => {
    zustandSetActiveAlarms(localActiveAlarms);
  }, [localActiveAlarms, zustandSetActiveAlarms]);

  // Fetch initial data (rules and active alarms)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const enabledRules = await getEnabledNotificationRules();
        setRules(enabledRules);
        console.log('[NotificationSystem] Fetched enabled rules:', enabledRules.length);

        const currentActiveAlarms = await getAllActiveAlarms();
        setLocalActiveAlarms(currentActiveAlarms); // Update local state, which then updates Zustand
        console.log('[NotificationSystem] Fetched active alarms:', currentActiveAlarms.length);
      } catch (error) {
        console.error('[NotificationSystem] Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []); // Empty dependency array means this runs once on mount

  // Process OPC-UA node value changes
  useEffect(() => {
    if (!rules.length || Object.keys(opcUaNodeValues).length === 0) {
      return; // No rules loaded or no values to check
    }

    const processNodeValueChange = async (nodeId: string, currentValue: any) => {
      const relevantRules = rules.filter((rule) => rule.nodeId === nodeId && rule.isEnabled);

      for (const rule of relevantRules) {
        const conditionMet = checkCondition(currentValue, rule.condition, rule.thresholdValue);
        // Use localActiveAlarms for checking existing alarms
        const existingAlarm = localActiveAlarms.find(
          (alarm) => alarm.ruleId === rule.id && !alarm.acknowledged
        );

        if (conditionMet) {
          if (!existingAlarm) {
            const newAlarm: ActiveAlarm = {
              id: uuidv4(),
              ruleId: rule.id,
              triggeredAt: new Date(),
              lastNotifiedAt: new Date(),
              acknowledged: false,
              acknowledgedAt: null,
              acknowledgedBy: null,
              currentValue: currentValue,
              originalRuleDetails: {
                name: rule.name,
                priority: rule.priority,
                condition: rule.condition,
                thresholdValue: rule.thresholdValue,
                nodeId: rule.nodeId,
              },
            };
            try {
              await addActiveAlarm(newAlarm);
              setLocalActiveAlarms((prev) => [...prev, newAlarm]); // Update local state

              const toastId = newAlarm.id; // Use alarm.id directly as toastId
              const description = `Value ${currentValue} ${rule.condition} ${rule.thresholdValue}. Node: ${rule.nodeId}.`;

              switch (rule.priority) {
                case 'LOW':
                  playNotificationSound('info');
                  toast.info(rule.name, { id: toastId, description, duration: 5000 });
                  console.log(`[NotificationSystem] LOW ALARM: "${rule.name}" (Value: ${currentValue})`);
                  break;
                case 'MEDIUM':
                  playNotificationSound('warning');
                  toast.warning(rule.name, { id: toastId, description: `${description} Requires acknowledgement.`, duration: Infinity });
                  console.log(`[NotificationSystem] MEDIUM ALARM: "${rule.name}" (Value: ${currentValue})`);
                  break;
                case 'HIGH':
                  playNotificationSound('error');
                  toast.error(rule.name, { id: toastId, description: `CRITICAL: ${description} Requires immediate acknowledgement.`, duration: Infinity });
                  console.log(`[NotificationSystem] HIGH ALARM: "${rule.name}" (Value: ${currentValue})`);
                  break;
              }
            } catch (error) {
              console.error('[NotificationSystem] Error adding active alarm:', error);
            }
          } else {
            // Optional: Update existing unacknowledged alarm if its currentValue has changed
            if (existingAlarm.currentValue !== currentValue) {
              const updatedAlarm = { ...existingAlarm, currentValue, lastNotifiedAt: new Date() }; // Also update lastNotifiedAt to avoid immediate re-sound
              try {
                await updateActiveAlarm(updatedAlarm);
                setLocalActiveAlarms(prevAlarms => prevAlarms.map(a => a.id === updatedAlarm.id ? updatedAlarm : a));
              } catch (error) {
                console.error('[NotificationSystem] Error updating current value of active alarm:', error);
              }
            }
          }
        } else { // Condition NOT met
          if (existingAlarm) {
            if (rule.priority === 'LOW') {
              try {
                await deleteActiveAlarm(existingAlarm.id);
                setLocalActiveAlarms((prev) => prev.filter((alarm) => alarm.id !== existingAlarm.id)); // Update local state
                toast.success(`RESOLVED: ${rule.name}`, {
                  description: `Value ${currentValue} no longer meets condition ${rule.condition} ${rule.thresholdValue}.`,
                  duration: 3000,
                });
                console.log(`[NotificationSystem] LOW ALARM RESOLVED: "${rule.name}" (Value: ${currentValue})`);
              } catch (error) {
                console.error('[NotificationSystem] Error deleting auto-resolving LOW priority alarm:', error);
              }
            } else {
              // For MEDIUM/HIGH, they persist until manually acknowledged.
              // We could update its currentValue to reflect it's no longer in alarm state,
              // but it remains for acknowledgement. This depends on specific requirements.
              // For now, do nothing, it waits for manual acknowledgement.
              // console.log(`[NotificationSystem] Condition for ${rule.priority} rule "${rule.name}" no longer met, but alarm ID ${existingAlarm.id} persists until acknowledged.`);
            }
          }
        }
      }
    };

    // Iterate over all changed OPC-UA values
    Object.entries(opcUaNodeValues).forEach(([nodeId, value]) => {
      // Check if this value is new or different from a previous state if complex comparison is needed.
      // For simplicity, we're checking all values against rules on every change detected by Zustand.
      processNodeValueChange(nodeId, value);
    });

  }, [opcUaNodeValues, rules, activeAlarms]); // Rerun when values, rules, or local activeAlarms change

  // Functions to be exposed by the hook, if any (e.g., manual ack, etc.)
  // For now, this hook primarily works in the background.
  // It could return `activeAlarms` if other parts of the UI need direct access from the hook.

  // Periodic sound for unacknowledged Medium/High priority alarms
  useEffect(() => {
    const HIGH_PRIORITY_INTERVAL = 10 * 1000; // 10 seconds for high priority
    const MEDIUM_PRIORITY_INTERVAL = 60 * 1000; // 60 seconds for medium priority

    const intervalId = setInterval(async () => {
      const currentAlarms = useAppStore.getState().opcUaNodeValues; // Re-fetch current alarms if needed, or use state `activeAlarms`
      // To ensure we are using the latest set of activeAlarms from the hook's state:
      // Iterate over the `activeAlarms` from this hook's state.

      let soundPlayed = false; // To prevent multiple sounds in one interval check if many alarms qualify

      for (const alarm of activeAlarms) {
        if (!alarm.acknowledged) {
          const now = new Date().getTime();
          const lastNotified = new Date(alarm.lastNotifiedAt).getTime();
          let needsUpdate = false;

          if (alarm.originalRuleDetails.priority === 'HIGH') {
            if (now - lastNotified > HIGH_PRIORITY_INTERVAL && !soundPlayed) {
              playNotificationSound('error');
              alarm.lastNotifiedAt = new Date();
              needsUpdate = true;
              soundPlayed = true; // Play only one high priority sound per interval check
               console.log(`[NotificationSystem] Periodic HIGH ALARM sound for rule "${alarm.originalRuleDetails.name}"`);
            }
          } else if (alarm.originalRuleDetails.priority === 'MEDIUM') {
            if (now - lastNotified > MEDIUM_PRIORITY_INTERVAL && !soundPlayed) {
              playNotificationSound('warning');
              alarm.lastNotifiedAt = new Date();
              needsUpdate = true;
              soundPlayed = true; // Play only one medium priority sound per interval check (if no high prio played)
              console.log(`[NotificationSystem] Periodic MEDIUM ALARM sound for rule "${alarm.originalRuleDetails.name}"`);
            }
          }

          if (needsUpdate) {
            try {
              await updateActiveAlarm(alarm);
              // Update local state to reflect change in lastNotifiedAt
              setActiveAlarms(prevAlarms =>
                prevAlarms.map(a => a.id === alarm.id ? { ...a, lastNotifiedAt: alarm.lastNotifiedAt } : a)
              );
            } catch (error) {
              console.error('[NotificationSystem] Error updating alarm lastNotifiedAt:', error);
            }
          }
          if (soundPlayed && alarm.originalRuleDetails.priority === 'HIGH') break; // Prioritize re-sounding HIGH alarms
        }
      }
    }, Math.min(HIGH_PRIORITY_INTERVAL, MEDIUM_PRIORITY_INTERVAL) / 2); // Run interval more frequently to catch windows

    return () => clearInterval(intervalId);
  }, [activeAlarms]); // Rerun if activeAlarms list changes

  return {
    activeAlarms, // Exposing active alarms for potential UI display
    rules, // Exposing rules for potential debugging or display
  };
};
