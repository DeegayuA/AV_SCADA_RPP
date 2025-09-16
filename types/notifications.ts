// types/notifications.ts (or wherever your types are defined)

export interface NotificationRule {
  id: string;
  name: string;
  dataPointKey: string; // CHANGED from nodeId (or keep nodeId if it's the backend schema and map in frontend)
  condition: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'contains' | 'not_contains' | 'is_true' | 'is_false'; // EXPANDED conditions
  thresholdValue: number | string | boolean;
  severity: 'info' | 'warning' | 'critical'; // CHANGED from priority and new values
  message?: string; // ADDED - Optional custom message
  enabled: boolean;    // CHANGED from isEnabled
  sendEmail?: boolean;
  sendSms?: boolean;
  createdAt?: Date;   // Often good to have these as optional if frontend doesn't always receive them initially
  updatedAt?: Date;   // or if they are set by the backend on creation/update.
  // If nodeId is still critical for backend interaction and dataPointKey is for user-facing selection:
  nodeId?: string;    // ADD nodeId back if it's distinct and needed for DB/API.
                     // The form could then select a dataPoint (which contains its nodeId and other info)
                     // and store the relevant identifier (dataPointKey or nodeId) in the rule.
}

export interface ActiveAlarm {
  id: string;
  ruleId: string;
  triggeredAt: Date;
  lastNotifiedAt?: Date; // Made optional as it might not exist initially
  acknowledged: boolean;
  acknowledgedAt?: Date | null; // Keep as is
  acknowledgedBy?: string | null; // Keep as is
  currentValue: number | string | boolean;
  originalRuleDetails: Partial<NotificationRule>; // This will now reflect the updated NotificationRule
}