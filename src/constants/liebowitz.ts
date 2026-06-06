export interface LsasQuestion {
  id: number;
  situation: string;
  type: 'performance' | 'social';
}

export const LSAS_QUESTIONS: LsasQuestion[] = [
  { id: 1, situation: 'Telephoning in public', type: 'performance' },
  { id: 2, situation: 'Participating in small groups', type: 'social' },
  { id: 3, situation: 'Eating in public places', type: 'performance' },
  { id: 4, situation: 'Drinking with others in public places', type: 'performance' },
  { id: 5, situation: 'Talking to people in authority', type: 'social' },
  { id: 6, situation: 'Acting, performing, or giving a talk in front of an audience', type: 'performance' },
  { id: 7, situation: 'Going to a party', type: 'social' },
  { id: 8, situation: 'Working while being observed', type: 'performance' },
  { id: 9, situation: 'Writing while being observed', type: 'performance' },
  { id: 10, situation: 'Calling someone you don\'t know very well', type: 'social' },
  { id: 11, situation: 'Talking with people you don\'t know very well', type: 'social' },
  { id: 12, situation: 'Meeting strangers', type: 'social' },
  { id: 13, situation: 'Urinating in a public bathroom', type: 'performance' },
  { id: 14, situation: 'Entering a room when others are already seated', type: 'social' },
  { id: 15, situation: 'Being the center of attention', type: 'social' },
  { id: 16, situation: 'Speaking up at a meeting', type: 'social' },
  { id: 17, situation: 'Taking a test', type: 'performance' },
  { id: 18, situation: 'Expressing disagreement or disapproval to people you don\'t know very well', type: 'social' },
  { id: 19, situation: 'Looking at people you don\'t know very well in the eyes', type: 'social' },
  { id: 20, situation: 'Giving a report to a group', type: 'performance' },
  { id: 21, situation: 'Trying to pick up someone', type: 'social' },
  { id: 22, situation: 'Returning goods to a store', type: 'social' },
  { id: 23, situation: 'Giving a party', type: 'social' },
  { id: 24, situation: 'Resisting a high pressure salesperson', type: 'social' },
];
