export interface UserAccessRecord {
  uid: string;
  email: string;
  displayName: string;
  provider?: string;
  firstAccess: number;
  lastAccess: number;
  accessCount: number;
  timeZone: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  operatingSystem?: string;
  language?: string;
  country?: string;
  city?: string;
  region?: string;
  ipVersion?: string;
  requestId?: string;
  loginAt?: number;
  lastSeen?: number;
  online?: boolean;
  anonymous?: boolean;
  sessionId?: string;
  ip?: string;
}

export type AuditEventType = 
  | 'login' 
  | 'logout' 
  | 'system_entry' 
  | 'share_create' 
  | 'share_delete'
  | 'file_upload' 
  | 'file_delete' 
  | 'trash_delete'
  | 'vault_unlock'
  | 'vault_setup'
  | 'vault_failed_attempt'
  | 'vault_lockout'
  | 'vault_pin_change'
  | 'extra_password_change'
  | 'encryption_mode_change'
  | 'password_change'
  | 'admin_action'
  | 'admin_access';

export interface AuditEventRecord {
  id?: string;
  type: AuditEventType;
  action?: string;
  userId: string;
  userEmail: string;
  adminUid?: string;
  adminEmail?: string;
  targetUid?: string;
  targetEmail?: string;
  timestamp: number;
  details: string;
  ip?: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  operatingSystem?: string;
  country?: string;
  city?: string;
  region?: string;
  sessionId?: string;
  requestId?: string;
  anonymous?: boolean;
  attemptNumber?: number;
  maxAttempts?: number;
  locked?: boolean;
  method?: string;
  fileSize?: number;
  fileName?: string;
  mediaType?: string;
  itemCount?: number;
  resourceId?: string;
  result?: string;
  status?: string;
}

export type SecurityEventType =
  | 'brute_force'
  | 'rate_limit'
  | 'temporary_block'
  | 'captcha_triggered'
  | 'share_enumeration'
  | 'unauthorized_access'
  | 'http_401'
  | 'http_403'
  | 'http_404'
  | 'http_410';

export interface SecurityEventRecord {
  id?: string;
  type: SecurityEventType;
  event?: string;
  severity?: string;
  module: string;
  timestamp: number;
  userId?: string;
  userEmail?: string;
  uid?: string;
  email?: string;
  ip?: string;
  reason: string;
  details?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  ruleCode?: string;
  actionTaken?: string;
  detectionResult?: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  operatingSystem?: string;
  country?: string;
  city?: string;
  region?: string;
  sessionId?: string;
  requestId?: string;
  anonymous?: boolean;
}
