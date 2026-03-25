export type LevelUpPayload = {
  previousLevel: number;
  newLevel: number;
  xpGained: number;
  rewards: Array<{ label: string; value: string }>;
  unlockedFeatures: string[];
};

const XP_PER_LEVEL = 500;

export function calculateLevelFromXp(xpTotal: number): number {
  const safe = Number.isFinite(xpTotal) ? xpTotal : 0;
  return Math.max(1, Math.floor(safe / XP_PER_LEVEL) + 1);
}

export function getLevelUpPayload(args: {
  previousXpTotal: number;
  newXpTotal: number;
  previousLevel: number;
  newLevel: number;
}): LevelUpPayload | null {
  if (args.newLevel <= args.previousLevel) return null;

  const xpGained = Math.max(0, args.newXpTotal - args.previousXpTotal);

  const unlockedFeatures: string[] = [];
  if (args.newLevel >= 3 && args.previousLevel < 3) unlockedFeatures.push('Timed Quiz Game');
  if (args.newLevel >= 5 && args.previousLevel < 5) unlockedFeatures.push('Listening Practice');
  if (args.newLevel >= 8 && args.previousLevel < 8) unlockedFeatures.push('Grammar Correction');

  return {
    previousLevel: args.previousLevel,
    newLevel: args.newLevel,
    xpGained,
    rewards: [{ label: 'XP Earned', value: `+${xpGained} XP` }],
    unlockedFeatures,
  };
}
