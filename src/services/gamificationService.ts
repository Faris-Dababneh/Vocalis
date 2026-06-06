const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5500];
const LEVEL_TITLES = [
  'Newcomer',
  'Explorer',
  'Adventurer',
  'Brave',
  'Social Butterfly',
  'Confident',
  'Charismatic',
  'Magnetic',
  'Fearless',
  'Legend',
];

export interface LevelInfo {
  level: number;
  title: string;
  progress: number;
  xpForNext: number;
  xpForCurrent: number;
}

export function calculateLevel(xp: number): LevelInfo {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }

  const xpForCurrent = LEVEL_THRESHOLDS[level];
  const xpForNext =
    level < LEVEL_THRESHOLDS.length - 1
      ? LEVEL_THRESHOLDS[level + 1]
      : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;

  const progress =
    level < LEVEL_THRESHOLDS.length - 1
      ? (xp - xpForCurrent) / (xpForNext - xpForCurrent)
      : 1;

  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)],
    progress: Math.min(1, Math.max(0, progress)),
    xpForNext,
    xpForCurrent,
  };
}

export const XP_BY_DIFFICULTY: Record<string, number> = {
  micro: 10,
  easy: 25,
  medium: 50,
  hard: 100,
  elite: 200,
};
