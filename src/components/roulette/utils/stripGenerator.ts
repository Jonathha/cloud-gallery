import { REWARDS, RewardItem } from '../../../types/roulette';

export const STRIP_COUNT = 65;
export const WINNING_INDEX = 50;

/**
 * Gera uma esteira de 65 itens para a roleta, posicionando o item sorteado no WINNING_INDEX
 */
export function generateStrip(targetReward?: RewardItem): RewardItem[] {
  const items: RewardItem[] = [];
  for (let i = 0; i < STRIP_COUNT; i++) {
    if (i === WINNING_INDEX && targetReward) {
      items.push(targetReward);
    } else {
      const randomIndex = Math.floor(Math.random() * REWARDS.length);
      items.push(REWARDS[randomIndex]);
    }
  }
  return items;
}

export function reconstructStrip(itemIds: number[]): RewardItem[] {
  return itemIds.map((id) => {
    const found = REWARDS.find((r) => r.id === id);
    return found || REWARDS[0];
  });
}

