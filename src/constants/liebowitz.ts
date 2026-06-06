export interface LsasQuestion {
  id: number;
  situation: string;
  type: 'performance' | 'social';
}

// 12 highest-impact questions from the full LSAS (max score: 72)
export const LSAS_QUESTIONS: LsasQuestion[] = [
  { id: 2,  situation: 'Participating in small groups', type: 'social' },
  { id: 5,  situation: 'Talking to people in authority', type: 'social' },
  { id: 6,  situation: 'Acting, performing, or giving a talk in front of an audience', type: 'performance' },
  { id: 7,  situation: 'Going to a party', type: 'social' },
  { id: 11, situation: 'Talking with people you don\'t know very well', type: 'social' },
  { id: 12, situation: 'Meeting strangers', type: 'social' },
  { id: 14, situation: 'Entering a room when others are already seated', type: 'social' },
  { id: 15, situation: 'Being the center of attention', type: 'social' },
  { id: 16, situation: 'Speaking up at a meeting', type: 'social' },
  { id: 18, situation: 'Expressing disagreement or disapproval to people you don\'t know very well', type: 'social' },
  { id: 19, situation: 'Looking at people you don\'t know very well in the eyes', type: 'social' },
  { id: 21, situation: 'Trying to pick up someone / approaching someone romantically', type: 'social' },
];

// Max score with 12 questions = 72 (each rated 0-3 for fear + 0-3 for avoidance)
export const LSAS_MAX_SCORE = 72;
