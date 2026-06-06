import Anthropic from '@anthropic-ai/sdk';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Challenge, ChallengeCategory, ChallengeDifficulty } from '../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

interface RawChallenge {
  title: string;
  description: string;
  emoji: string;
  tips: string[];
  difficulty: ChallengeDifficulty;
  xpReward: number;
  estimatedMinutes: number;
  encouragement: string;
  category: ChallengeCategory;
  week: number;
  day: number;
}

export async function generateExposurePlan(
  user: User,
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Connecting to AI therapist...');

  const systemPrompt = `You are a licensed clinical psychologist specializing in CBT and exposure therapy for social anxiety disorder. You create precise, evidence-based exposure therapy plans.`;

  // Thresholds scaled to 72-point version of LSAS (12 highest-impact questions)
  const scoreContext = (() => {
    if (user.anxietyScore >= 48) {
      return 'This is EXTREMELY SEVERE anxiety. Start with challenges so easy most people would not consider them challenges. Literally: stepping outside, looking at their reflection, texting a trusted person.';
    } else if (user.anxietyScore >= 41) {
      return 'This is VERY SEVERE anxiety. Start with solo public presence (walking to a park, sitting in a café without talking to anyone).';
    } else if (user.anxietyScore >= 34) {
      return 'This is SEVERE anxiety. Brief, scripted interactions first (cashier, barista). No unscripted conversations until challenge 8.';
    } else if (user.anxietyScore >= 28) {
      return 'This is MARKED anxiety. Can start with brief conversations but needs heavy scaffolding and exact scripts.';
    } else if (user.anxietyScore >= 19) {
      return 'This is MODERATE anxiety. Start with conversations, build to groups. Use behavioral experiments.';
    } else if (user.anxietyScore >= 10) {
      return 'This is MILD anxiety. Push into discomfort zones immediately. Include romantic and performance challenges mid-way.';
    } else {
      return 'This is MINIMAL anxiety or confidence-building. Challenges should be legitimately difficult social feats even for confident people.';
    }
  })();

  const userPrompt = `
Create a 30-challenge graduated exposure therapy plan for a person with these characteristics:
- Name: ${user.displayName}
- Social Anxiety Score: ${user.anxietyScore}/72 (${user.anxietyLevel})
- Goal: ${user.goal}
- Timeframe: ${user.timeframe}

SCIENTIFIC BASIS: This score is from a 12-item version of the Liebowitz Social Anxiety Scale (max 72). This person scored ${user.anxietyScore}/72.
${scoreContext}

RULES:
1. Challenges must be ordered by exposure hierarchy — each one slightly harder than the last
2. Challenges 1–3 must be doable TODAY, at home or within 5 minutes, indoors, regardless of score
3. Each challenge must feel like a natural next step from the previous one
4. Tips must be specific, actionable, CBT-grounded (not generic like "take a deep breath")
5. Encouragement text should be personal and reference their goal

Return ONLY a JSON array of exactly 30 objects with this schema:
{
  "title": string (max 40 chars),
  "description": string (2-3 sentences, specific and actionable),
  "emoji": string (single relevant emoji),
  "tips": [string, string, string] (each tip 1-2 sentences, CBT-based),
  "difficulty": "micro"|"easy"|"medium"|"hard"|"elite",
  "xpReward": number (10-200, proportional to difficulty),
  "estimatedMinutes": number,
  "encouragement": string (1 sentence, personal),
  "category": "foundation"|"warmup"|"eye_contact"|"conversation"|"group"|"confrontation"|"romantic"|"performance"|"leadership",
  "week": number (1-4),
  "day": number (1-7 within week)
}`;

  onProgress?.('Generating your personalized plan with AI...');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');

  onProgress?.('Saving your challenges to Firestore...');

  let rawChallenges: RawChallenge[];
  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    rawChallenges = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }

  const challengesRef = collection(db, 'users', user.uid, 'challenges');

  for (let i = 0; i < rawChallenges.length; i++) {
    const raw = rawChallenges[i];
    const x = i % 2 === 0 ? 0.2 : 0.75;
    const y = 130 * i + 60;
    const status = i === 0 ? 'available' : 'locked';

    await addDoc(challengesRef, {
      ...raw,
      order: i,
      x,
      y,
      status,
      aiGenerated: true,
    });
  }

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    planGenerated: true,
    planGeneratedAt: serverTimestamp(),
  });

  onProgress?.('Plan ready!');
}
