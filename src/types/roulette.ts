export interface RewardItem {
  id: number;
  amount: number;
  label: string;
  tier: 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';
  weight: number; // Peso para sorteio ponderado (maior = mais comum, menor = mais raro/difícil)
}

export const REWARDS: RewardItem[] = [
  { id: 1, amount: 10, label: "10 Robux", tier: 'tier-1', weight: 30 },
  { id: 2, amount: 20, label: "20 Robux", tier: 'tier-1', weight: 22 },
  { id: 3, amount: 30, label: "30 Robux", tier: 'tier-1', weight: 16 },
  { id: 4, amount: 50, label: "50 Robux", tier: 'tier-1', weight: 12 },
  { id: 5, amount: 100, label: "100 Robux", tier: 'tier-2', weight: 8 },
  { id: 6, amount: 200, label: "200 Robux", tier: 'tier-2', weight: 5 },
  { id: 7, amount: 300, label: "300 Robux", tier: 'tier-2', weight: 3.5 },
  { id: 8, amount: 400, label: "400 Robux", tier: 'tier-3', weight: 2 },
  { id: 9, amount: 500, label: "500 Robux", tier: 'tier-3', weight: 1 },
  { id: 10, amount: 600, label: "600 Robux", tier: 'tier-4', weight: 0.4 },
  { id: 11, amount: 700, label: "700 Robux", tier: 'tier-4', weight: 0.1 },
];

/**
 * Realiza o sorteio ponderado garantindo que prêmios altos sejam difíceis
 */
export function pickWeightedReward(): RewardItem {
  const totalWeight = REWARDS.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const reward of REWARDS) {
    if (random < reward.weight) {
      return reward;
    }
    random -= reward.weight;
  }

  return REWARDS[0];
}

