export interface AppConfig {
  version: string;
  buildNumber: string;
  required: boolean;
  apkUrl: string;
  securityCode?: string;
}

export type UpdateState = 'idle' | 'downloading' | 'installing';
