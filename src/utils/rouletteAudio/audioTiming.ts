/**
 * Cálculo dos intervalos de tempo dos ticks para simular a curva cúbica de desaceleração da roleta.
 */

export function calculateTickSchedule(totalDurationMs: number = 5000): number[] {
  const tickTimes: number[] = [];
  let currentTime = 0;

  // Fase inicial e giro contínuo rápido
  let interval = 45; // ms entre ticks no ápice da velocidade
  while (currentTime < totalDurationMs - 150) {
    tickTimes.push(currentTime);
    const progress = currentTime / totalDurationMs;

    // Curva de desaceleração suave
    if (progress < 0.25) {
      interval = 45 + progress * 20; // 45ms -> 50ms
    } else if (progress < 0.5) {
      interval = 50 + (progress - 0.25) * 140; // 50ms -> 85ms
    } else if (progress < 0.75) {
      interval = 85 + (progress - 0.5) * 450; // 85ms -> 200ms
    } else if (progress < 0.9) {
      interval = 200 + (progress - 0.75) * 1600; // 200ms -> 440ms
    } else {
      interval = 440 + (progress - 0.9) * 3500; // 440ms -> ~800ms
    }

    currentTime += interval;
  }

  // Tick final vencedor
  tickTimes.push(totalDurationMs - 50);

  return tickTimes;
}
