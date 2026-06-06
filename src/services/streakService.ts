import { updateUser, getUser } from './firestoreService';

export async function updateStreak(userId: string): Promise<number> {
  const user = await getUser(userId);
  if (!user) return 0;

  const today = new Date().toISOString().split('T')[0];
  const last = user.lastActiveDate;

  if (last === today) {
    return user.streak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const newStreak = last === yesterdayStr ? user.streak + 1 : 1;
  await updateUser(userId, { streak: newStreak, lastActiveDate: today });
  return newStreak;
}
