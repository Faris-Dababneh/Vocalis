import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { completeSocialMoment } from '../services/challengeCompletionService';
import {
  createAndStartRecording,
  stopAndSaveRecording,
  createPlaybackSound,
  formatDuration,
} from '../services/audioRecordingService';
import { SOCIAL_CONTEXTS, STATIC_MISSIONS, SocialMission } from '../constants/socialContexts';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'SocialMoment'> };
type Step = 'context' | 'mission' | 'recording' | 'confidence' | 'celebration';
type RecPhase = 'idle' | 'active' | 'review';

export default function SocialMomentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { firebaseUser, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('context');
  const [selectedContext, setSelectedContext] = useState('');
  const [selectedMission, setSelectedMission] = useState<SocialMission | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [loading, setLoading] = useState(false);

  // Recording state
  const [recPhase, setRecPhase] = useState<RecPhase>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const missions: SocialMission[] = selectedContext
    ? (STATIC_MISSIONS[selectedContext] ?? [])
    : [];

  const startRecording = async () => {
    try {
      const { recording: rec } = await createAndStartRecording();
      setRecording(rec);
      setRecordingTime(0);
      setRecPhase('active');
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setRecPhase('idle');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const { uri, duration } = await stopAndSaveRecording(recording);
    setRecording(null);
    setRecordingUri(uri);
    setRecordingDuration(duration);
    setRecPhase('review');
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

  const resetRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(null);
    setRecordingUri(null);
    setRecordingDuration(0);
    setRecordingTime(0);
    setIsPlaying(false);
    setSound(null);
    setRecPhase('idle');
  };

  const handleComplete = async () => {
    if (!firebaseUser || !selectedMission) return;
    setLoading(true);
    try {
      await completeSocialMoment(firebaseUser.uid, {
        context: selectedContext,
        mission: selectedMission.title,
        confidence,
        recordingUri: recordingUri ?? undefined,
      });
      await refreshUser();
      setStep('celebration');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = (): React.ReactElement => {
    switch (step) {
      case 'context':
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Where are you?</Text>
            <Text style={styles.stepSub}>Pick your current social context.</Text>
            <View style={styles.contextGrid}>
              {SOCIAL_CONTEXTS.map((ctx) => (
                <TouchableOpacity
                  key={ctx.id}
                  onPress={() => {
                    setSelectedContext(ctx.id);
                    setStep('mission');
                  }}
                  style={[styles.contextChip, selectedContext === ctx.id && styles.contextChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.contextEmoji}>{ctx.emoji}</Text>
                  <Text style={[styles.contextLabel, selectedContext === ctx.id && styles.contextLabelActive]}>
                    {ctx.label.split(' ').slice(1).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'mission':
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Your Mission</Text>
            <Text style={styles.stepSub}>Choose a micro-challenge to try right now.</Text>
            <View style={styles.missionList}>
              {missions.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelectedMission(m);
                    resetRecording();
                    setStep('recording');
                  }}
                  style={[styles.missionCard, selectedMission?.title === m.title && styles.missionCardActive]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.missionEmoji}>{m.emoji}</Text>
                  <View style={styles.missionText}>
                    <Text style={styles.missionTitle}>{m.title}</Text>
                    <Text style={styles.missionDesc}>{m.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setStep('context')} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Change location</Text>
            </TouchableOpacity>
          </View>
        );

      case 'recording':
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Record your attempt</Text>
            <Text style={styles.stepSub}>Optional. Go try your mission, then record a quick reflection.</Text>

            <View style={styles.selectedMissionBadge}>
              <Text style={styles.selectedMissionEmoji}>{selectedMission?.emoji}</Text>
              <Text style={styles.selectedMissionTitle}>{selectedMission?.title}</Text>
            </View>

            {recPhase === 'idle' && (
              <>
                <TouchableOpacity onPress={startRecording} style={styles.micBtn} activeOpacity={0.8}>
                  <Mic size={32} color="#fff" />
                  <Text style={styles.micLabel}>Tap to Record</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep('confidence')}
                  activeOpacity={0.85}
                  style={styles.primaryBtnWrap}
                >
                  <LinearGradient
                    colors={['#5B8CDB', '#7C6FCD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Skip. Rate confidence.</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('mission')} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Change mission</Text>
                </TouchableOpacity>
              </>
            )}

            {recPhase === 'active' && (
              <>
                <View style={styles.waveform}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.waveBar, { height: 10 + Math.random() * 28, backgroundColor: COLORS.primary }]}
                    />
                  ))}
                </View>
                <Text style={styles.recTimer}>{formatDuration(recordingTime * 1000)}</Text>
                <TouchableOpacity onPress={stopRecording} style={styles.stopBtn} activeOpacity={0.8}>
                  <Square size={16} color="#fff" />
                  <Text style={styles.stopBtnText}>Stop</Text>
                </TouchableOpacity>
              </>
            )}

            {recPhase === 'review' && (
              <>
                <View style={styles.playbackCard}>
                  <TouchableOpacity onPress={playRecording} style={styles.playBtn}>
                    {isPlaying
                      ? <Pause size={20} color="#fff" />
                      : <Play size={20} color="#fff" />}
                  </TouchableOpacity>
                  <Text style={styles.playDuration}>{formatDuration(recordingDuration)}</Text>
                  <TouchableOpacity onPress={resetRecording} style={styles.rerecordBtn}>
                    <RotateCcw size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setStep('confidence')}
                  activeOpacity={0.85}
                  style={styles.primaryBtnWrap}
                >
                  <LinearGradient
                    colors={['#7DC9A8', '#5B8CDB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Use this recording</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { resetRecording(); setStep('confidence'); }}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>Discard. Continue without recording.</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'confidence':
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>How confident do you feel?</Text>
            <Text style={styles.stepSub}>Rate your confidence from 0 to 10.</Text>
            <View style={styles.selectedMissionBadge}>
              <Text style={styles.selectedMissionEmoji}>{selectedMission?.emoji}</Text>
              <Text style={styles.selectedMissionTitle}>{selectedMission?.title}</Text>
            </View>
            <View style={styles.sliderRow}>
              {Array.from({ length: 11 }, (_, i) => i).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setConfidence(v)}
                  style={[styles.confidenceBtn, confidence === v && styles.confidenceBtnActive]}
                >
                  <Text style={[styles.confidenceNum, confidence === v && styles.confidenceNumActive]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.confidenceLabels}>
              <Text style={styles.confidenceLabel}>Terrified</Text>
              <Text style={styles.confidenceLabel}>Confident</Text>
            </View>
            <TouchableOpacity
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#5B8CDB', '#7C6FCD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Saving...' : 'I Did It'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('recording')} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'celebration':
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.celebTitle}>You did it.</Text>
            <Text style={styles.celebSub}>
              Every social moment you complete builds your confidence. Keep going!
            </Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+50 XP Earned</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
              style={[styles.primaryBtnWrap, { alignSelf: 'stretch', width: '100%' }]}
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
        );
    }
  };

  const stepIndex = ['context', 'mission', 'recording', 'confidence', 'celebration'].indexOf(step);

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />

      <View style={[styles.header, { paddingTop: insets.top + SPACE.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Social Moment</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>{stepIndex + 1}/5</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((stepIndex + 1) / 5) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACE.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
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
    paddingBottom: SPACE.sm,
  },
  backBtn: { padding: SPACE.xs },
  backBtnText: { color: COLORS.primaryLight, fontSize: 15 },
  headerTitle: { fontSize: 16, ...FONTS.subheading, color: COLORS.text },
  stepIndicator: {
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  stepIndicatorText: { fontSize: 12, color: COLORS.textSub },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.surfaceHi,
    marginHorizontal: SPACE.lg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  scroll: { padding: SPACE.lg },
  stepWrap: { gap: SPACE.lg, alignItems: 'center', paddingTop: SPACE.lg },
  stepTitle: { fontSize: 26, ...FONTS.heading, color: COLORS.text, textAlign: 'center' },
  stepSub: { fontSize: 14, color: COLORS.textSub, textAlign: 'center' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, justifyContent: 'center' },
  contextChip: {
    width: '44%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    alignItems: 'center',
    gap: SPACE.xs,
  },
  contextChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  contextEmoji: { fontSize: 28 },
  contextLabel: { fontSize: 13, color: COLORS.textSub, textAlign: 'center' },
  contextLabelActive: { color: '#fff' },
  missionList: { gap: SPACE.sm, alignSelf: 'stretch' },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
  },
  missionCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceHi },
  missionEmoji: { fontSize: 28, marginTop: 2 },
  missionText: { flex: 1, gap: 4 },
  missionTitle: { fontSize: 15, ...FONTS.subheading, color: COLORS.text },
  missionDesc: { fontSize: 13, color: COLORS.textSub, lineHeight: 18 },
  backLink: { padding: SPACE.sm },
  backLinkText: { color: COLORS.textMuted, fontSize: 13 },
  selectedMissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.borderBright,
  },
  selectedMissionEmoji: { fontSize: 24 },
  selectedMissionTitle: { fontSize: 15, ...FONTS.subheading, color: COLORS.text, flex: 1 },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, justifyContent: 'center' },
  confidenceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  confidenceNum: { fontSize: 15, color: COLORS.textSub, ...FONTS.subheading },
  confidenceNumActive: { color: '#fff' },
  confidenceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  confidenceLabel: { fontSize: 12, color: COLORS.textMuted },
  primaryBtnWrap: { borderRadius: RADIUS.full, overflow: 'hidden', alignSelf: 'stretch' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, ...FONTS.heading },
  celebConfetti: { fontSize: 56, textAlign: 'center' },
  celebTitle: { fontSize: 32, ...FONTS.heading, color: COLORS.text },
  celebSub: { fontSize: 15, color: COLORS.textSub, textAlign: 'center', lineHeight: 22 },
  xpBadge: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  xpBadgeText: { fontSize: 20, ...FONTS.heading, color: COLORS.primary },
  micBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  micLabel: { fontSize: 12, color: '#fff', ...FONTS.subheading },
  waveform: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    height: 50,
    paddingHorizontal: SPACE.xl,
  },
  waveBar: { width: 4, borderRadius: 2, flex: 1 },
  recTimer: { fontSize: 22, ...FONTS.heading, color: COLORS.text },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingVertical: 12,
    paddingHorizontal: SPACE.xl,
  },
  stopBtnText: { color: '#fff', fontSize: 15, ...FONTS.heading },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDuration: { flex: 1, fontSize: 15, color: COLORS.textSub },
  rerecordBtn: { padding: SPACE.sm },
});
