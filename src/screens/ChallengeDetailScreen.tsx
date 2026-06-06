import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

import { Zap, Clock, Lightbulb } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { completeChallenge } from '../services/challengeCompletionService';
import {
  createAndStartRecording,
  stopAndSaveRecording,
  createPlaybackSound,
  formatDuration,
} from '../services/audioRecordingService';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChallengeDetail'>;
  route: RouteProp<RootStackParamList, 'ChallengeDetail'>;
};

type Phase =
  | 'detail'
  | 'anxiety_before'
  | 'recording_idle'
  | 'recording_active'
  | 'recording_review'
  | 'anxiety_after'
  | 'completing'
  | 'done';

const DIFF_COLORS: Record<string, string> = {
  micro: COLORS.accentGreen,
  easy: COLORS.accentGreen,
  medium: COLORS.accentAmber,
  hard: COLORS.accent,
  elite: COLORS.danger,
};

export default function ChallengeDetailScreen({ navigation, route }: Props) {
  const { challengeId, title, description, emoji, tips, difficulty, xpReward, estimatedMinutes, encouragement, category, status, order } = route.params;
  const insets = useSafeAreaInsets();
  const { firebaseUser, refreshUser } = useAuth();

  const [phase, setPhase] = useState<Phase>('detail');
  const [anxietyBefore, setAnxietyBefore] = useState(3);
  const [anxietyAfter, setAnxietyAfter] = useState(3);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [result, setResult] = useState<{ xpEarned: number; leveledUp: boolean; newLevel: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const startRecording = async () => {
    try {
      const { recording: rec } = await createAndStartRecording();
      setRecording(rec);
      setRecordingTime(0);
      setPhase('recording_active');
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setPhase('recording_idle');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const { uri, duration } = await stopAndSaveRecording(recording);
    setRecording(null);
    setRecordingUri(uri);
    setRecordingDuration(duration);
    setPhase('recording_review');
  };

  const playRecording = async () => {
    if (!recordingUri) return;
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      return;
    }
    const s = await createPlaybackSound(recordingUri);
    setSound(s);
    await s.playAsync();
    setIsPlaying(true);
    s.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
    });
  };

  const handleComplete = async (skipRecording = false) => {
    if (!firebaseUser) return;
    setPhase('completing');
    try {
      const res = await completeChallenge(challengeId, firebaseUser.uid, difficulty, {
        anxietyBefore,
        anxietyAfter,
        recordingUri: skipRecording ? undefined : (recordingUri ?? undefined),
        order,
      });
      setResult(res);
      await refreshUser();
      setPhase('done');
    } catch {
      setPhase('anxiety_after');
    }
  };

  const diffColor = DIFF_COLORS[difficulty] ?? COLORS.textSub;

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACE.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + '22', borderColor: diffColor }]}>
          <Text style={[styles.diffText, { color: diffColor }]}>{difficulty.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACE.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* DETAIL */}
        {phase === 'detail' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Zap size={13} color={COLORS.textSub} />
                <Text style={styles.metaChipText}>{xpReward} XP</Text>
              </View>
              <View style={styles.metaChip}>
                <Clock size={13} color={COLORS.textSub} />
                <Text style={styles.metaChipText}>~{estimatedMinutes} min</Text>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeaderRow}>
                <Lightbulb size={15} color={COLORS.primary} />
                <Text style={styles.tipsHeader}>Tips</Text>
              </View>
              {tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <View style={styles.encouragementCard}>
              <Text style={styles.encouragementText}>"{encouragement}"</Text>
            </View>

            <TouchableOpacity
              onPress={() => setPhase('anxiety_before')}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#5B8CDB', '#7C6FCD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Record Your Attempt 🎙️</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ANXIETY BEFORE */}
        {phase === 'anxiety_before' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.phaseTitle}>How anxious are you right now?</Text>
            <Text style={styles.phaseSub}>Rate your current anxiety level before attempting.</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setAnxietyBefore(v)}
                  style={[styles.ratingBtn, anxietyBefore === v && styles.ratingBtnActive]}
                >
                  <Text style={[styles.ratingNum, anxietyBefore === v && styles.ratingNumActive]}>
                    {v}
                  </Text>
                  <Text style={styles.ratingLabel}>
                    {['Calm', 'Mild', 'Moderate', 'High', 'Intense'][v - 1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setPhase('recording_idle')}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#5B8CDB', '#7C6FCD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Start →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* RECORDING IDLE */}
        {phase === 'recording_idle' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.phaseTitle}>Record your attempt</Text>
            <Text style={styles.phaseSub}>
              Tap the microphone to record your experience. Hearing yourself helps build confidence.
            </Text>
            <TouchableOpacity onPress={startRecording} style={styles.micBtn} activeOpacity={0.8}>
              <Text style={styles.micLabel}>Tap to record</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPhase('anxiety_after')} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Skip recording. Mark as done.</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECORDING ACTIVE */}
        {phase === 'recording_active' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.phaseTitle}>Recording...</Text>
            <View style={styles.waveform}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    { height: 10 + Math.random() * 30, backgroundColor: COLORS.primary },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.recTimer}>{formatDuration(recordingTime * 1000)}</Text>
            <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECORDING REVIEW */}
        {phase === 'recording_review' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.phaseTitle}>Review your recording</Text>
            <View style={styles.playbackCard}>
              <TouchableOpacity onPress={playRecording} style={styles.playBtn}>
                <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <Text style={styles.playDuration}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setPhase('anxiety_after')}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#5B8CDB', '#7C6FCD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Use this recording ✓</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPhase('recording_idle')} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Re-record</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ANXIETY AFTER */}
        {phase === 'anxiety_after' && (
          <View style={styles.phaseWrap}>
            <Text style={styles.phaseTitle}>How do you feel after?</Text>
            <Text style={styles.phaseSub}>Rate your anxiety level now that you've attempted it.</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setAnxietyAfter(v)}
                  style={[
                    styles.ratingBtn,
                    anxietyAfter === v && { ...styles.ratingBtnActive, backgroundColor: COLORS.accentGreen },
                  ]}
                >
                  <Text style={[styles.ratingNum, anxietyAfter === v && styles.ratingNumActive]}>
                    {v}
                  </Text>
                  <Text style={styles.ratingLabel}>
                    {['Calm', 'Mild', 'Moderate', 'High', 'Intense'][v - 1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => handleComplete(false)}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#7DC9A8', '#5B8CDB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Complete Challenge →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* COMPLETING */}
        {phase === 'completing' && (
          <View style={styles.phaseWrap}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.completingText}>Saving your progress...</Text>
          </View>
        )}

        {/* DONE */}
        {phase === 'done' && result && (
          <View style={styles.phaseWrap}>
            <Text style={styles.doneTitle}>Challenge Complete</Text>
            <Text style={styles.xpEarned}>+{result.xpEarned} XP</Text>
            {result.leveledUp && (
              <View style={styles.levelUpBadge}>
                <Text style={styles.levelUpText}>Level Up! You are now Level {result.newLevel}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#5B8CDB', '#7C6FCD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Back to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACE.xs },
  backText: { color: COLORS.primaryLight, fontSize: 15 },
  diffBadge: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  diffText: { fontSize: 11, ...FONTS.heading, letterSpacing: 1 },
  scroll: { padding: SPACE.lg, gap: SPACE.md },
  phaseWrap: { gap: SPACE.lg, alignItems: 'center', paddingTop: SPACE.lg },
  emoji: { fontSize: 72 },
  title: { fontSize: 26, ...FONTS.heading, color: COLORS.text, textAlign: 'center' },
  description: { fontSize: 15, color: COLORS.textSub, textAlign: 'center', lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: SPACE.sm },
  metaChip: {
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: { fontSize: 13, color: COLORS.textSub },
  tipsCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    gap: SPACE.sm,
  },
  tipsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  tipsHeader: { fontSize: 15, ...FONTS.subheading, color: COLORS.text },
  tipRow: { flexDirection: 'row', gap: SPACE.sm },
  tipBullet: { color: COLORS.primary, fontSize: 15 },
  tipText: { flex: 1, fontSize: 14, color: COLORS.textSub, lineHeight: 20 },
  encouragementCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
  },
  encouragementText: { fontSize: 14, color: COLORS.primaryLight, fontStyle: 'italic', textAlign: 'center' },
  primaryBtnWrap: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, ...FONTS.heading },
  phaseTitle: { fontSize: 22, ...FONTS.heading, color: COLORS.text, textAlign: 'center' },
  phaseSub: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', lineHeight: 20 },
  ratingRow: { flexDirection: 'row', gap: SPACE.xs, alignSelf: 'stretch', justifyContent: 'center' },
  ratingBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.sm,
    alignItems: 'center',
    gap: 2,
  },
  ratingBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  ratingNum: { fontSize: 18, ...FONTS.heading, color: COLORS.textSub },
  ratingNumActive: { color: '#fff' },
  ratingLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  micBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  micLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  skipLink: { padding: SPACE.sm },
  skipLinkText: { color: COLORS.textMuted, fontSize: 13 },
  waveform: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    height: 50,
    paddingHorizontal: SPACE.xl,
  },
  waveBar: { width: 4, borderRadius: 2, flex: 1 },
  recTimer: { fontSize: 24, ...FONTS.heading, color: COLORS.text },
  stopBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    paddingHorizontal: SPACE.xxl,
  },
  stopBtnText: { color: '#fff', fontSize: 16, ...FONTS.heading },
  playbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'stretch',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: { fontSize: 20, color: '#fff' },
  playDuration: { fontSize: 16, color: COLORS.textSub },
  completingText: { fontSize: 16, color: COLORS.textSub, marginTop: SPACE.md },
  confetti: { fontSize: 56, textAlign: 'center' },
  doneTitle: { fontSize: 28, ...FONTS.heading, color: COLORS.text },
  xpEarned: { fontSize: 48, ...FONTS.heading, color: COLORS.primary },
  levelUpBadge: {
    backgroundColor: COLORS.accentGreen + '22',
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
  },
  levelUpText: { fontSize: 16, color: COLORS.accentGreen, ...FONTS.subheading },
});
