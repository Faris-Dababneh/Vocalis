import OpenAI from 'openai';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, ChallengeCategory, ChallengeDifficulty } from '../types';

// Qwen via DashScope international — OpenAI-compatible interface
const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_DASHSCOPE_API_KEY ?? '',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
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

/** Returns true if the user already has a saved plan in Firestore */
export async function planAlreadyExists(uid: string): Promise<boolean> {
  const snap = await getDocs(collection(db, 'users', uid, 'challenges'));
  return !snap.empty;
}

export async function generateExposurePlan(
  user: User,
  onProgress?: (message: string) => void
): Promise<void> {
  // Guard: never overwrite an existing plan
  if (user.planGenerated) {
    const exists = await planAlreadyExists(user.uid);
    if (exists) {
      onProgress?.('Plan already exists — loading your challenges...');
      return;
    }
  }

  onProgress?.('Building your personalized plan...');

  const scoreContext = (() => {
    if (user.anxietyScore >= 48)
      return 'EXTREMELY SEVERE anxiety. Begin with trivially easy actions: stepping outside, texting a trusted person, eye contact with reflection.';
    if (user.anxietyScore >= 41)
      return 'VERY SEVERE anxiety. Solo public presence only at first — walking to a park, sitting in a café without talking to anyone.';
    if (user.anxietyScore >= 34)
      return 'SEVERE anxiety. Scripted one-line interactions (cashier, barista). No open-ended conversation until challenge 8.';
    if (user.anxietyScore >= 28)
      return 'MARKED anxiety. Brief scripted conversations with heavy scaffolding.';
    if (user.anxietyScore >= 19)
      return 'MODERATE anxiety. Real conversations from day 1, group interactions by challenge 8.';
    if (user.anxietyScore >= 10)
      return 'MILD anxiety. Push immediately into discomfort. Include romantic and performance challenges mid-way.';
    return 'MINIMAL anxiety. Challenges should be genuinely difficult social feats even for confident people.';
  })();

  const systemPrompt =
    'You are a licensed clinical psychologist specializing in CBT and graduated exposure therapy for social anxiety. Output ONLY valid JSON. No prose, no markdown, no code fences. Never use hyphens or dashes. Write warmly and conversationally.';

  const userPrompt = `Generate exactly 20 graduated exposure therapy challenges for:
- Name: ${user.displayName}
- Score: ${user.anxietyScore}/72 (${user.anxietyLevel}). ${scoreContext}
- Goal: ${user.goal}
- Timeframe: ${user.timeframe}

Rules:
1. Order by exposure hierarchy. Each challenge slightly harder than the last.
2. Challenges 1 to 3 must be completable today, indoors, within 5 minutes.
3. Tips must be specific and CBT-grounded, not generic.
4. Encouragement references their personal goal.

CRITICAL FORMATTING RULES:
- NEVER use hyphens, em dashes, or en dashes (-, or similar) anywhere in any field
- Write in plain, warm, conversational English
- Keep sentences short. Use periods, not dashes.
- No bullet points or numbered lists inside string fields
- title: max 6 words
- description: 1 to 2 short sentences. Plain language. No jargon.
- tips: each tip is 1 short sentence. Practical. Specific. No cliches.
- encouragement: 1 warm sentence. Reference their goal naturally.

Return ONLY a raw JSON array (no markdown, no backticks) of exactly 20 objects:
[{"title":"...","description":"...","emoji":"...","tips":["...","...","..."],"difficulty":"micro"|"easy"|"medium"|"hard"|"elite","xpReward":10-200,"estimatedMinutes":1-60,"encouragement":"...","category":"foundation"|"warmup"|"eye_contact"|"conversation"|"group"|"confrontation"|"romantic"|"performance"|"leadership","week":1-4,"day":1-7},...]`;

  onProgress?.('Calling AI — this takes about 30–60 seconds...');

  let rawText: string;
  try {
    const completion = await client.chat.completions.create({
      model: 'qwen3.6-flash', // qwen3.6-plus via DashScope international API string
      max_tokens: 16000,  // 20 challenges × ~300 tokens each = ~6000; headroom to never truncate
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const choice = completion.choices[0];
    if (!choice?.message?.content) throw new Error('Empty response from Qwen API');
    rawText = choice.message.content.trim();

    // Check if response was truncated
    if (choice.finish_reason === 'length') {
      throw new Error('Qwen response was truncated (max_tokens reached). Try again.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Qwen API request failed';
    throw new Error(`AI generation failed: ${msg}`);
  }

  onProgress?.('Parsing AI response...');

  let rawChallenges: RawChallenge[];
  try {
    // Strip any accidental markdown fences or leading/trailing text
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(
        `No JSON array found in response. First 200 chars: ${rawText.slice(0, 200)}`
      );
    }
    rawChallenges = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(rawChallenges) || rawChallenges.length === 0) {
      throw new Error('Parsed result is not a non-empty array');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown parse error';
    throw new Error(`Failed to parse AI response: ${msg}`);
  }

  onProgress?.(`Saving ${rawChallenges.length} challenges...`);

  // Use a single writeBatch — one network round trip instead of 30+
  const batch = writeBatch(db);

  rawChallenges.forEach((raw, i) => {
    const challengeRef = doc(collection(db, 'users', user.uid, 'challenges'));
    batch.set(challengeRef, {
      ...raw,
      order: i,
      x: i % 2 === 0 ? 0.2 : 0.75,
      y: 130 * i + 60,
      status: i === 0 ? 'available' : 'locked',
      aiGenerated: true,
    });
  });

  // Mark plan as generated on the user doc (setDoc merge — never fails on missing doc)
  const userRef = doc(db, 'users', user.uid);
  batch.set(
    userRef,
    { planGenerated: true, planGeneratedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();

  onProgress?.('Done! Your plan is ready.');
}
