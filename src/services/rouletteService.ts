import { authPrimary } from '../firebase';
import { getApiUrl } from '../utils/apiUrl';
import { RewardItem } from '../types/roulette';

export interface RouletteStatusResponse {
  success: boolean;
  userId?: string;
  email?: string | null;
  spinsRemaining: number;
  totalSpins: number;
  lastActivity?: number;
  error?: string;
}

export interface RouletteSpinResponse {
  success: boolean;
  spinId?: string;
  reward?: RewardItem;
  stripItemIds?: number[];
  jitter?: number;
  spinsRemaining?: number;
  error?: string;
}

export interface RouletteUserRecord {
  user_id: string;
  email: string | null;
  spins_remaining: number;
  total_spins: number;
  last_activity: number;
  created_at: number;
}

export interface RouletteSpinRecord {
  id: string;
  user_id: string;
  user_email: string | null;
  reward_id: number;
  reward_amount: number;
  reward_label: string;
  reward_tier: string;
  strip_item_ids?: string;
  stripItemIds?: number[];
  jitter?: number;
  spins_remaining: number;
  ip?: string;
  created_at: number;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    if (typeof (authPrimary as any).authStateReady === 'function') {
      await (authPrimary as any).authStateReady();
    } else if (!authPrimary.currentUser) {
      await new Promise<void>((resolve) => {
        const unsubscribe = authPrimary.onAuthStateChanged(() => {
          unsubscribe();
          resolve();
        });
        setTimeout(resolve, 1000);
      });
    }
    const user = authPrimary.currentUser;
    if (user) {
      const token = await (user as any).getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Ignore error
  }
  return headers;
}

export async function fetchRouletteStatus(): Promise<RouletteStatusResponse> {
  const headers = await getAuthHeader();
  const res = await fetch(getApiUrl('/api/roulette/status'), { method: 'GET', headers });
  return await res.json();
}

export async function executeRouletteSpin(clientRequestId?: string): Promise<RouletteSpinResponse> {
  const headers = await getAuthHeader();
  const reqId = clientRequestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const res = await fetch(getApiUrl('/api/roulette/spin'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ requestId: reqId, clientRequestId: reqId })
  });
  return await res.json();
}

export async function fetchAdminRouletteUsers(): Promise<RouletteUserRecord[]> {
  const headers = await getAuthHeader();
  const res = await fetch(getApiUrl('/api/admin/roulette/users'), { method: 'GET', headers });
  const data = await res.json();
  return data.users || [];
}

export async function fetchAdminRouletteSpins(): Promise<RouletteSpinRecord[]> {
  const headers = await getAuthHeader();
  const res = await fetch(getApiUrl('/api/admin/roulette/spins'), { method: 'GET', headers });
  const data = await res.json();
  return data.spins || [];
}

export async function fetchAdminRouletteSpinDetail(id: string): Promise<RouletteSpinRecord | null> {
  const headers = await getAuthHeader();
  const res = await fetch(getApiUrl(`/api/admin/roulette/spins/${id}`), { method: 'GET', headers });
  const data = await res.json();
  return data.spin || null;
}

export async function adminUpdateUserSpins(userId: string, delta: number): Promise<{ success: boolean; user?: RouletteUserRecord; error?: string }> {
  const headers = await getAuthHeader();
  const res = await fetch(getApiUrl('/api/admin/roulette/update-spins'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, delta })
  });
  return await res.json();
}

