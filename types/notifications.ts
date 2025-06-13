export interface NotificationRule {
  id: string;
  name: string;
  nodeId: string;
  condition: '==' | '!=' | '<' | '<=' | '>' | '>=';
  thresholdValue: number | string | boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveAlarm {
  id: string;
  ruleId: string;
  triggeredAt: Date;
  lastNotifiedAt: Date;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  currentValue: number | string | boolean;
  originalRuleDetails: Partial<NotificationRule>;
}
