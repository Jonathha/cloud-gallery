export interface DeviceState {
  batteryLevel: number;
  isCharging: boolean;
  pinAppEnabled: boolean;
  pinnedAppName: string;
  blockedApps: Record<string, boolean>;
  isCameraActive: boolean;
  isShuttingDown: boolean;
}

export interface ControlTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
