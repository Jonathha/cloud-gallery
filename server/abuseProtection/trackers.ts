import { IpTrackingData, ModuleType } from "./types";

// Maps per module to ensure total isolation
export const trackers: Record<ModuleType, Map<string, IpTrackingData>> = {
  share_view: new Map<string, IpTrackingData>(),
  share_create: new Map<string, IpTrackingData>(),
  share_manage: new Map<string, IpTrackingData>(),
  share: new Map<string, IpTrackingData>(),
  storage: new Map<string, IpTrackingData>(),
  auth: new Map<string, IpTrackingData>(),
  upload: new Map<string, IpTrackingData>(),
  chat: new Map<string, IpTrackingData>(),
  roulette: new Map<string, IpTrackingData>(),
  logs: new Map<string, IpTrackingData>(),
  general: new Map<string, IpTrackingData>()
};

export const processedRequests = new WeakSet<object>();

// Periodic garbage collection for idle tracking records (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  Object.values(trackers).forEach(tracker => {
    for (const [key, data] of tracker.entries()) {
      if (data.blockedUntil < now && now - data.windowStart > 32 * 60 * 1000) {
        tracker.delete(key);
      }
    }
  });
}, 10 * 60 * 1000);
