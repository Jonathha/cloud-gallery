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
  | 'file_upload' 
  | 'file_delete' 
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
  sessionId?: string;
  anonymous?: boolean;
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
  userAgent?: string;
  platform?: string;
  browser?: string;
  operatingSystem?: string;
  country?: string;
  city?: string;
  sessionId?: string;
  anonymous?: boolean;
}
