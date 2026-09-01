import { UserAccessRecord, AuditEventRecord, SecurityEventRecord } from './types';

export const state = {
  localAccesses: [] as UserAccessRecord[],
  localAuditLogs: [] as AuditEventRecord[],
  localSecurityEvents: [] as SecurityEventRecord[],
  sessionEntryLogged: false,
  lastAccessRecordedTime: 0,
  isSendingSecurityEvent: false,
};
