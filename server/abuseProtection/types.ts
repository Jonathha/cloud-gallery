export interface RequestAttempt {
  ip: string;
  userAgent: string;
  path: string;
  attempts: number;
  timestamp: string;
}

export interface IpTrackingData {
  id: string; // IP or UID/Token hash
  windowStart: number;
  attempts: number;
  blockedUntil: number;
  captchaRequired: boolean;
  captchaSolvedAtAttempts: number;
  recentAttempts?: RequestAttempt[];
}

export type ModuleType =
  | 'share_view'
  | 'share_create'
  | 'share_manage'
  | 'share'
  | 'storage'
  | 'auth'
  | 'upload'
  | 'chat'
  | 'roulette'
  | 'logs'
  | 'general';
