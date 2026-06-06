import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChallengeDifficulty } from '../types';
import { updateChallengeStatus, unlockNextChallenge, awardXP, getUser, updateUser } from './firestoreService';
import { updateStreak } from './streakService';
import { XP_BY_DIFFICULTY } from './gamificationService';

interface CompletionData {
  anxietyBefore?: number;
  anxietyAfter?: number;
  recordingUri?: string;
  order?: number;
}

interface CompletionResult {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newXp: number;
}

export async function completeChallenge(
  challengeId: string,
  userId: string,
  difficulty: ChallengeDifficulty,
  data: CompletionData
): Promise<CompletionResult> {
  const xpEarned = XP_BY_DIFFICULTY[difficulty] ?? 25;

  await updateChallengeStatus(userId, challengeId, 'completed');

  if (data.order !== undefined) {
    await unlockNextChallenge(userId, data.order);
  }

  const completionRef = doc(db, 'users', userId, 'completions', challengeId);
  await setDoc(completionRef, {
    challengeId,
    completedAt: serverTimestamp(),
    anxietyBefore: data.anxietyBefore ?? null,
    anxietyAfter: data.anxietyAfter ?? null,
    hasRecording: !!data.recordingUri,
    xpEarned,
  });

  const { newXp, leveledUp, newLevel } = await awardXP(userId, xpEarned);
  await updateStreak(userId);

  return { xpEarned, leveledUp, newLevel, newXp };
}

export async function completeSocialMoment(
  userId: string,
  data: { context: string; mission: string; confidence: number; recordingUri?: string }
): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  const momentRef = doc(db, 'users', userId, 'socialMoments', `${Date.now()}`);
  // Build document explicitly — never spread optional fields that may be undefined,
  // as Firestore rejects undefined values outright.
  const momentDoc: Record<string, unknown> = {
    context: data.context,
    mission: data.mission,
    confidence: data.confidence,
    completedAt: serverTimestamp(),
    xpEarned: 50,
  };
  if (data.recordingUri) {
    momentDoc.recordingUri = data.recordingUri;
  }
  await setDoc(momentRef, momentDoc);

  await awardXP(userId, 50);
  await updateStreak(userId);
}
