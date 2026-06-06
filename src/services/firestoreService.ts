import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Challenge } from '../types';
import { calculateLevel } from './gamificationService';

export async function createGuestUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString().split('T')[0];
  await setDoc(userRef, {
    uid,
    email: '',
    displayName: 'Guest',
    createdAt: serverTimestamp(),
    assessmentCompleted: true,
    onboardingCompleted: true,
    anxietyScore: 33,
    anxietyLevel: 'marked',
    goal: 'Be more social in general',
    timeframe: '3 months',
    xp: 0,
    level: 0,
    streak: 0,
    lastActiveDate: now,
    achievements: [],
    planGenerated: false,
  });
}

export async function createDefaultUser(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString().split('T')[0];
  await setDoc(userRef, {
    uid,
    email,
    displayName,
    createdAt: serverTimestamp(),
    assessmentCompleted: false,
    onboardingCompleted: false,
    anxietyScore: 0,
    anxietyLevel: 'minimal',
    goal: '',
    timeframe: '',
    xp: 0,
    level: 0,
    streak: 0,
    lastActiveDate: now,
    achievements: [],
    planGenerated: false,
  });
}

export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  // Use setDoc with merge so it works even if the document doesn't exist yet
  await setDoc(userRef, data as Record<string, unknown>, { merge: true });
}

export async function getUserChallenges(uid: string): Promise<Challenge[]> {
  const challengesRef = collection(db, 'users', uid, 'challenges');
  const q = query(challengesRef, orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
}

export function subscribeToUserChallenges(
  uid: string,
  callback: (challenges: Challenge[]) => void
): () => void {
  const challengesRef = collection(db, 'users', uid, 'challenges');
  const q = query(challengesRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const challenges = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
    callback(challenges);
  });
}

export function subscribeToUser(
  uid: string,
  callback: (user: User | null) => void
): () => void {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback(snap.data() as User);
    }
  });
}

export async function updateChallengeStatus(
  uid: string,
  challengeId: string,
  status: Challenge['status']
): Promise<void> {
  const ref = doc(db, 'users', uid, 'challenges', challengeId);
  await updateDoc(ref, { status });
}

export async function unlockNextChallenge(uid: string, currentOrder: number): Promise<void> {
  const challengesRef = collection(db, 'users', uid, 'challenges');
  const q = query(challengesRef, where('order', '==', currentOrder + 1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const nextDoc = snap.docs[0];
    await updateDoc(nextDoc.ref, { status: 'available' });
  }
}

// Scans all challenges and unlocks any that should be available (completed predecessor) but aren't.
// Handles users who completed challenges before the auto-unlock fix was deployed.
export async function repairUnlockGaps(uid: string, challenges: Challenge[]): Promise<void> {
  const sorted = [...challenges].sort((a, b) => a.order - b.order);
  const repairs: Promise<void>[] = [];
  for (const c of sorted) {
    if (c.status === 'completed') {
      const next = sorted.find((ch) => ch.order === c.order + 1);
      if (next && (next.status === 'locked' || next.status === 'future')) {
        repairs.push(updateDoc(doc(db, 'users', uid, 'challenges', next.id), { status: 'available' }));
      }
    }
  }
  await Promise.all(repairs);
}

export async function awardXP(
  uid: string,
  xpEarned: number
): Promise<{ newXp: number; leveledUp: boolean; newLevel: number }> {
  const user = await getUser(uid);
  if (!user) throw new Error('User not found');

  const oldLevel = user.level;
  const newXp = user.xp + xpEarned;
  const { level: newLevel } = calculateLevel(newXp);
  const leveledUp = newLevel > oldLevel;

  await updateUser(uid, { xp: newXp, level: newLevel });
  return { newXp, leveledUp, newLevel };
}
