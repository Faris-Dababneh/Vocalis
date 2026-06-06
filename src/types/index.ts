import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  assessmentCompleted: boolean;
  onboardingCompleted: boolean;
  anxietyScore: number;
  anxietyLevel: string;
  goal: string;
  timeframe: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  achievements: string[];
  planGenerated: boolean;
  planGeneratedAt?: Timestamp;
}

export type ChallengeDifficulty = 'micro' | 'easy' | 'medium' | 'hard' | 'elite';
export type ChallengeStatus = 'available' | 'locked' | 'completed' | 'future';
export type ChallengeCategory =
  | 'foundation'
  | 'warmup'
  | 'eye_contact'
  | 'conversation'
  | 'group'
  | 'confrontation'
  | 'romantic'
  | 'performance'
  | 'leadership';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tips: string[];
  difficulty: ChallengeDifficulty;
  xpReward: number;
  estimatedMinutes: number;
  encouragement: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  order: number;
  x: number;
  y: number;
  aiGenerated: boolean;
  week: number;
  day: number;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Assessment: { isRetake?: boolean };
  GoalSetup: undefined;
  TimeframeSetup: undefined;
  Home: undefined;
  ChallengeDetail: {
    challengeId: string;
    title: string;
    description: string;
    emoji: string;
    tips: string[];
    difficulty: ChallengeDifficulty;
    xpReward: number;
    estimatedMinutes: number;
    encouragement: string;
    category: ChallengeCategory;
    status: ChallengeStatus;
  };
  SocialMoment: undefined;
};
