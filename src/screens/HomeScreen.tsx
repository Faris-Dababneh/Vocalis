import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { Zap, Flame, CheckCircle2, Users, Sparkles, Star, Trophy, Lock } from 'lucide-react-native';

import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserChallenges, repairUnlockGaps } from '../services/firestoreService';
import { generateExposurePlan } from '../services/aiChallengeService';
import { updateStreak } from '../services/streakService';
import { calculateLevel } from '../services/gamificationService';
import { RootStackParamList, Challenge } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import { AFFIRMATIONS } from '../constants/affirmations';
import AuroraBackground from '../components/AuroraBackground';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

function NodeIcon({
  difficulty,
  isCompleted,
  isLocked,
}: {
  difficulty: Challenge['difficulty'];
  isCompleted: boolean;
  isLocked: boolean;
}): React.ReactElement {
  if (isCompleted) return <CheckCircle2 size={20} color="#fff" /> as React.ReactElement;
  if (isLocked) return <Lock size={16} color={COLORS.textMuted} /> as React.ReactElement;
  if (difficulty === 'elite') return <Trophy size={20} color="#fff" /> as React.ReactElement;
  if (difficulty === 'hard') return <Star size={20} color="#fff" /> as React.ReactElement;
  if (difficulty === 'medium') return <Zap size={20} color="#fff" /> as React.ReactElement;
  return <Sparkles size={20} color="#fff" /> as React.ReactElement;
}

type BreathPhase = 'idle' | 'select' | 'session' | 'done';
type SessionPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

const PHASE_ORDER: SessionPhase[] = ['inhale', 'hold_in', 'exhale', 'hold_out'];
const PHASE_LABELS: Record<SessionPhase, string> = {
  inhale: 'INHALE',
  hold_in: 'HOLD',
  exhale: 'EXHALE',
  hold_out: 'HOLD',
};
const PHASE_DURATION = 4;

const DURATION_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { firebaseUser, user, refreshUser } = useAuth();

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState('');
  const [generateError, setGenerateError] = useState('');

  // Breathing
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('idle');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [currentSessionPhase, setCurrentSessionPhase] = useState<SessionPhase>('inhale');
  const [phaseCountdown, setPhaseCountdown] = useState(PHASE_DURATION);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbPulse = useRef(new Animated.Value(1)).current;
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseIndexRef = useRef(0);
  const phaseCountdownRef = useRef(PHASE_DURATION);

  // Affirmation
  const [affirmIndex, setAffirmIndex] = useState(0);
  const affirmOpacity = useRef(new Animated.Value(1)).current;

  // Profile panel
  const [panelOpen, setPanelOpen] = useState(false);
  const panelHeight = height * 0.8;
  const panelAnim = useRef(new Animated.Value(panelHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const levelInfo = calculateLevel(user?.xp ?? 0);
  const completedCount = challenges.filter((c) => c.status === 'completed').length;
  const repairDoneRef = useRef(false);

  // Subscribe to challenges; repair any unlock gaps on first load
  useEffect(() => {
    if (!firebaseUser) return;
    repairDoneRef.current = false;
    const unsub = subscribeToUserChallenges(firebaseUser.uid, (chs) => {
      setChallenges(chs);
      if (!repairDoneRef.current && chs.length > 0) {
        repairDoneRef.current = true;
        repairUnlockGaps(firebaseUser.uid, chs);
      }
    });
    return unsub;
  }, [firebaseUser]);

  // Update streak on mount
  useEffect(() => {
    if (firebaseUser) {
      updateStreak(firebaseUser.uid).then(() => refreshUser());
    }
  }, [firebaseUser]);

  // Affirmation rotation
  useEffect(() => {
    if (breathPhase === 'session' || breathPhase === 'select') return;
    const cycle = () => {
      Animated.timing(affirmOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setAffirmIndex((i) => (i + 1) % AFFIRMATIONS.length);
        Animated.timing(affirmOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    };
    const interval = setInterval(cycle, 8000);
    return () => clearInterval(interval);
  }, [breathPhase]);

  // Idle pulse
  useEffect(() => {
    if (breathPhase !== 'idle' && breathPhase !== 'done') {
      orbPulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [breathPhase]);

  const stopTimers = useCallback(() => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    sessionTimerRef.current = null;
    phaseTimerRef.current = null;
  }, []);

  const animatePhase = useCallback((phase: SessionPhase) => {
    let toValue = 1;
    if (phase === 'inhale') toValue = 1.3;
    else if (phase === 'hold_in') toValue = 1.3;
    else if (phase === 'exhale') toValue = 0.85;
    else toValue = 0.85;

    Animated.timing(orbScale, {
      toValue,
      duration: PHASE_DURATION * 1000,
      useNativeDriver: true,
    }).start();
  }, [orbScale]);

  const startSession = useCallback(() => {
    setBreathPhase('session');
    setSessionTimeLeft(sessionDuration);
    phaseIndexRef.current = 0;
    phaseCountdownRef.current = PHASE_DURATION;
    setCurrentSessionPhase('inhale');
    setPhaseCountdown(PHASE_DURATION);
    animatePhase('inhale');

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    sessionTimerRef.current = setInterval(() => {
      setSessionTimeLeft((t) => {
        if (t <= 1) {
          stopTimers();
          setBreathPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    phaseTimerRef.current = setInterval(() => {
      phaseCountdownRef.current -= 1;
      setPhaseCountdown(phaseCountdownRef.current);

      if (phaseCountdownRef.current <= 0) {
        phaseIndexRef.current = (phaseIndexRef.current + 1) % PHASE_ORDER.length;
        const nextPhase = PHASE_ORDER[phaseIndexRef.current];
        phaseCountdownRef.current = PHASE_DURATION;
        setCurrentSessionPhase(nextPhase);
        setPhaseCountdown(PHASE_DURATION);
        animatePhase(nextPhase);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }, 1000);
  }, [sessionDuration, animatePhase, stopTimers]);

  useEffect(() => {
    return () => stopTimers();
  }, []);

  const resetBreathing = () => {
    stopTimers();
    orbScale.setValue(1);
    setBreathPhase('idle');
    setPhaseCountdown(PHASE_DURATION);
  };

  // Profile panel
  const openPanel = () => {
    setPanelOpen(true);
    Animated.parallel([
      Animated.timing(panelAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(panelAnim, { toValue: panelHeight, duration: 300, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setPanelOpen(false));
  };

  const handleSignOut = async () => {
    closePanel();
    const doSignOut = async () => {
      await signOut(auth);
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Sign out of Vocalis?')) {
        await doSignOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const handleGeneratePlan = async () => {
    if (!user || generating) return;
    setGenerating(true);
    setGenerateError('');
    setGeneratingMsg('Starting...');
    try {
      await generateExposurePlan(user, (msg) => setGeneratingMsg(msg));
      await refreshUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Plan generation failed. Please try again.';
      setGenerateError(msg);
    } finally {
      setGenerating(false);
      setGeneratingMsg('');
    }
  };

  const orbBaseSize = Math.min(width * 0.38, 150);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Build SVG path for challenge connections
  const buildPath = (a: Challenge, b: Challenge, sw: number) => {
    const ax = a.x * sw;
    const ay = a.y + 32;
    const bx = b.x * sw;
    const by = b.y + 32;
    const cx = (ax + bx) / 2;
    return `M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`;
  };

  const pathHeight = challenges.length > 0 ? challenges.length * 130 + 100 : 300;

  return (
    <View style={[styles.root, { overflow: 'hidden' }]}>
      <AuroraBackground />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.wordmarkRow}>
          <Sparkles size={16} color={COLORS.primary} />
          <Text style={styles.wordmark}>Vocalis</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={openPanel}>
          <Text style={styles.avatarText}>
            {(user?.displayName ?? 'U').slice(0, 2).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACE.xxl }]}
        showsVerticalScrollIndicator={false}
        horizontal={false}
        overScrollMode="never"
      >
        {/* Greeting */}
        <View style={styles.section}>
          <Text style={styles.greeting}>
            {getGreeting()}, {firstName}
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{user?.streak ?? 0} day streak</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Level {user?.level ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Box Breathing Orb */}
        <View style={[styles.section, styles.orbSection]}>
          {/* Orb — flat sibling structure so text is always fully visible */}
          <TouchableOpacity
            onPress={() => {
              if (breathPhase === 'idle') setBreathPhase('select');
              else if (breathPhase === 'done') resetBreathing();
            }}
            activeOpacity={breathPhase === 'session' ? 1 : 0.85}
            disabled={breathPhase === 'session'}
          >
            <Animated.View
              style={[
                styles.orbContainer,
                {
                  width: orbBaseSize * 1.3,
                  height: orbBaseSize * 1.3,
                  transform: [
                    {
                      scale:
                        breathPhase === 'idle' || breathPhase === 'done'
                          ? orbPulse
                          : orbScale,
                    },
                  ],
                },
              ]}
            >
              {/* Ring 1 — outermost glow, rgba so children unaffected */}
              <View
                style={[
                  styles.orbRing,
                  {
                    width: orbBaseSize * 1.3,
                    height: orbBaseSize * 1.3,
                    borderRadius: orbBaseSize * 0.65,
                    backgroundColor: 'rgba(123,110,255,0.12)',
                  },
                ]}
              />
              {/* Ring 2 — middle */}
              <View
                style={[
                  styles.orbRing,
                  {
                    width: orbBaseSize * 1.1,
                    height: orbBaseSize * 1.1,
                    borderRadius: orbBaseSize * 0.55,
                    backgroundColor: 'rgba(123,110,255,0.22)',
                  },
                ]}
              />
              {/* Core — solid */}
              <View
                style={[
                  styles.orbRing,
                  {
                    width: orbBaseSize,
                    height: orbBaseSize,
                    borderRadius: orbBaseSize * 0.5,
                    backgroundColor: COLORS.primary,
                  },
                ]}
              />
              {/* Text content — sibling, full opacity */}
              <View style={styles.orbTextLayer}>
                {breathPhase === 'idle' && (
                  <>
                    <Text style={styles.orbLabel}>BOX BREATHING</Text>
                    <Text style={styles.orbSub}>tap to begin</Text>
                  </>
                )}
                {breathPhase === 'session' && (
                  <>
                    <Text style={styles.orbPhase}>{PHASE_LABELS[currentSessionPhase]}</Text>
                    <Text style={styles.orbCountdown}>{phaseCountdown}</Text>
                  </>
                )}
                {breathPhase === 'done' && (
                  <>
                    <Text style={styles.orbLabel}>COMPLETE</Text>
                    <Text style={styles.orbSub}>Tap to reset</Text>
                  </>
                )}
                {breathPhase === 'select' && (
                  <>
                    <Text style={styles.orbLabel}>BOX BREATHING</Text>
                    <Text style={styles.orbSub}>choose duration</Text>
                  </>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>

          {breathPhase === 'session' && (
            <View style={styles.sessionControls}>
              <Text style={styles.timeLeft}>{formatTime(sessionTimeLeft)}</Text>
              <TouchableOpacity onPress={resetBreathing} style={styles.stopSessionBtn}>
                <Text style={styles.stopSessionText}>End Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {breathPhase === 'select' && (
            <View style={styles.durationPicker}>
              <View style={styles.durationChips}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d.seconds}
                    onPress={() => setSessionDuration(d.seconds)}
                    style={[styles.durationChip, sessionDuration === d.seconds && styles.durationChipActive]}
                  >
                    <Text style={[styles.durationChipText, sessionDuration === d.seconds && styles.durationChipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.btnRowWrap}>
                <TouchableOpacity
                  onPress={startSession}
                  activeOpacity={0.85}
                  style={styles.beginBtnWrap}
                >
                  <LinearGradient
                    colors={['#5B8CDB', '#7C6FCD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.beginBtn}
                  >
                    <Text style={styles.beginBtnText}>Begin Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBreathPhase('idle')}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Affirmation */}
        {(breathPhase === 'idle' || breathPhase === 'done') && (
          <Animated.View style={[styles.section, { opacity: affirmOpacity }]}>
            <Text style={styles.affirmation}>"{AFFIRMATIONS[affirmIndex]}"</Text>
          </Animated.View>
        )}

        {/* Socialize CTA */}
        <View style={[styles.section, { paddingHorizontal: SPACE.lg }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SocialMoment')}
            activeOpacity={0.85}
            style={styles.socializeBtnWrap}
          >
            <LinearGradient
              colors={['#5B8CDB', '#7C6FCD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.socializeBtn}
            >
              <View style={styles.socializeBtnInner}>
                <Users size={20} color="#fff" />
                <Text style={styles.socializeBtnText}>I'm About to Socialize</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={[styles.section, styles.statsStrip]}>
          <View style={styles.statCard}>
            <Zap size={15} color={COLORS.primary} />
            <Text style={styles.statValue}>{user?.xp ?? 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={15} color={COLORS.accentAmber} />
            <Text style={styles.statValue}>{user?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle2 size={15} color={COLORS.accentGreen} />
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
        </View>

        {/* Journey Path */}
        <View style={styles.section}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>Your Journey</Text>
            <View style={styles.progressChip}>
              <Text style={styles.progressChipText}>
                {completedCount}/{challenges.length} complete
              </Text>
            </View>
          </View>

          {/* Plan generating / not yet generated */}
          {challenges.length === 0 && (
            <View style={styles.noPlanCard}>
              {generating ? (
                <>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                  <Text style={styles.noPlanTitle}>Building your plan...</Text>
                  <Text style={styles.noPlanSub}>{generatingMsg}</Text>
                  <Text style={styles.noPlanHint}>
                    Powered by Qwen AI · usually takes 30–60 seconds
                  </Text>
                </>
              ) : generateError ? (
                <>
                  <Text style={styles.noPlanError}>{generateError}</Text>
                  <TouchableOpacity
                    onPress={handleGeneratePlan}
                    style={styles.generateBtnWrap}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#5B8CDB', '#7C6FCD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.generateBtn}
                    >
                      <Text style={styles.generateBtnText}>Try Again</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.noPlanTitle}>Your Journey Awaits</Text>
                  <Text style={styles.noPlanText}>
                    Generate a personalized 20-challenge exposure therapy plan based on your anxiety profile.
                  </Text>
                  <TouchableOpacity
                    onPress={handleGeneratePlan}
                    style={styles.generateBtnWrap}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#5B8CDB', '#7C6FCD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.generateBtn}
                    >
                      <Text style={styles.generateBtnText}>Generate My Plan</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.noPlanHint}>Takes about 30–60 seconds</Text>
                </>
              )}
            </View>
          )}

          {challenges.length > 0 && (
            <ScrollView
              style={{ height: Math.min(pathHeight, height * 0.6) }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width, height: pathHeight, position: 'relative' }}>
                <Svg
                  width={width}
                  height={pathHeight}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  {challenges.slice(0, -1).map((c, i) => (
                    <Path
                      key={c.id}
                      d={buildPath(c, challenges[i + 1], width)}
                      stroke={COLORS.border}
                      strokeWidth={2}
                      fill="none"
                    />
                  ))}
                </Svg>

                {challenges.map((c, i) => {
                  const nodeX = c.x * width - 32;
                  const nodeY = c.y;
                  const isAvailable = c.status === 'available';
                  const isCompleted = c.status === 'completed';
                  const isLocked = c.status === 'locked' || c.status === 'future';
                  const prev = challenges[i - 1];
                  const showDayLabel = i === 0 || c.day !== prev?.day || c.week !== prev?.week;

                  return (
                    <React.Fragment key={c.id}>
                      {showDayLabel && (
                        <View
                          style={[
                            styles.dayLabel,
                            { top: nodeY - 25, left: 0, right: 0 },
                          ]}
                          pointerEvents="none"
                        >
                          <Text style={styles.dayLabelText}>
                            Week {c.week} · Day {c.day}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.challengeNode,
                          {
                            left: nodeX,
                            top: nodeY,
                            borderColor: isAvailable
                              ? COLORS.primary
                              : isCompleted
                              ? COLORS.accentGreen
                              : COLORS.border,
                            backgroundColor: isAvailable
                              ? COLORS.primary
                              : isCompleted
                              ? COLORS.accentGreen
                              : COLORS.surfaceHi,
                          },
                        ]}
                        disabled={isLocked}
                        onPress={() => {
                          if (isLocked) return;
                          navigation.navigate('ChallengeDetail', {
                            challengeId: c.id,
                            title: c.title,
                            description: c.description,
                            emoji: c.emoji,
                            tips: c.tips,
                            difficulty: c.difficulty,
                            xpReward: c.xpReward,
                            estimatedMinutes: c.estimatedMinutes,
                            encouragement: c.encouragement,
                            category: c.category,
                            status: c.status,
                            order: c.order,
                          });
                        }}
                        activeOpacity={0.8}
                      >
                          <NodeIcon
                          difficulty={c.difficulty}
                          isCompleted={isCompleted}
                          isLocked={isLocked}
                        />
                        <Text
                          style={[
                            styles.nodeTitle,
                            { color: isLocked ? COLORS.textMuted : COLORS.text },
                          ]}
                        >
                          {c.title}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Profile Panel */}
      {panelOpen && (
        <>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="auto"
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePanel} />
          </Animated.View>

          <Animated.View
            style={[
              styles.panel,
              {
                height: panelHeight,
                bottom: 0,
                transform: [{ translateY: panelAnim }],
              },
            ]}
          >
            <View style={styles.panelHandle} />
            <ScrollView
              contentContainerStyle={[styles.panelScroll, { paddingBottom: insets.bottom + SPACE.xl }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.panelAvatar}>
                <Text style={styles.panelAvatarText}>
                  {(user?.displayName ?? 'U').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.panelName}>{user?.displayName}</Text>
              <Text style={styles.panelEmail}>{user?.email}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  Level {user?.level ?? 0}. {levelInfo.title}
                </Text>
              </View>

              {/* XP Bar */}
              <View style={styles.xpBarWrap}>
                <View style={[styles.xpBar, { overflow: 'hidden' }]}>
                  <View
                    style={[
                      styles.xpBarFill,
                      { width: `${levelInfo.progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.xpBarLabel}>
                  {user?.xp ?? 0} / {levelInfo.xpForNext} XP
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {[
                  { label: 'Total XP', value: String(user?.xp ?? 0) },
                  { label: 'Challenges', value: String(completedCount) },
                  { label: 'Streak', value: String(user?.streak ?? 0) },
                  { label: 'Badges', value: String(user?.achievements?.length ?? 0) },
                ].map((s) => (
                  <View key={s.label} style={styles.statGridItem}>
                    <Text style={styles.statGridValue}>{s.value}</Text>
                    <Text style={styles.statGridLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>Social Anxiety Score</Text>
                <View style={styles.scorePill}>
                  <Text style={styles.scorePillText}>
                    {user?.anxietyScore ?? 0}/144 · {user?.anxietyLevel}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  closePanel();
                  navigation.navigate('Assessment', { isRetake: true });
                }}
              >
                <Text style={styles.secondaryBtnText}>Retake Assessment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
    height: 'auto',
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  wordmark: { fontSize: 22, ...FONTS.heading, color: COLORS.primary },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, ...FONTS.heading },
  scroll: { paddingTop: SPACE.lg },
  section: { marginBottom: SPACE.xl, paddingHorizontal: SPACE.lg },
  greeting: { fontSize: 26, ...FONTS.heading, color: COLORS.text, marginBottom: SPACE.sm },
  pillRow: { flexDirection: 'row', gap: SPACE.sm },
  pill: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillText: { fontSize: 13, color: COLORS.textSub },
  orbSection: { alignItems: 'center', gap: SPACE.lg },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    position: 'absolute',
  },
  orbTextLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  orbLabel: { fontSize: 10, ...FONTS.heading, color: '#fff', letterSpacing: 2 },
  orbSub: { fontSize: 9, color: 'rgba(255,255,255,0.85)' },
  orbPhase: { fontSize: 16, ...FONTS.heading, color: '#fff', letterSpacing: 3 },
  orbCountdown: { fontSize: 30, ...FONTS.heading, color: '#fff' },
  sessionControls: {
    alignItems: 'center',
    gap: SPACE.sm,
  },
  timeLeft: {
    fontSize: 15,
    color: COLORS.textSub,
    ...FONTS.subheading,
  },
  stopSessionBtn: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: SPACE.lg,
  },
  stopSessionText: {
    color: COLORS.danger,
    fontSize: 13,
    ...FONTS.subheading,
  },
  durationPicker: { alignItems: 'center', gap: SPACE.md, width: '100%' },
  durationChips: { flexDirection: 'row', gap: SPACE.sm },
  durationChip: {
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  durationChipText: { fontSize: 14, color: COLORS.textSub },
  durationChipTextActive: { color: '#fff' },
  btnRowWrap: { alignItems: 'center', gap: SPACE.sm, width: '100%' },
  beginBtnWrap: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden' },
  beginBtn: { paddingVertical: 14, alignItems: 'center' },
  beginBtnText: { color: '#fff', fontSize: 16, ...FONTS.heading },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
  affirmation: {
    fontSize: 15,
    color: COLORS.textSub,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  socializeBtnWrap: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  socializeBtn: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socializeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  socializeBtnText: { color: '#fff', fontSize: 17, ...FONTS.heading },
  statsStrip: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, ...FONTS.heading, color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  journeyTitle: { fontSize: 20, ...FONTS.subheading, color: COLORS.text },
  progressChip: {
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  progressChipText: { fontSize: 12, color: COLORS.textSub },
  noPlanCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.xl,
    alignItems: 'center',
    gap: SPACE.sm,
  },
  noPlanTitle: { fontSize: 17, ...FONTS.subheading, color: COLORS.text, textAlign: 'center', marginTop: SPACE.sm },
  noPlanText: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', lineHeight: 20 },
  noPlanSub: { fontSize: 13, color: COLORS.primaryLight, textAlign: 'center', marginTop: 2 },
  noPlanHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACE.xs },
  noPlanError: { fontSize: 13, color: COLORS.danger, textAlign: 'center', lineHeight: 18, marginBottom: SPACE.md },
  generateBtnWrap: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACE.sm },
  generateBtn: { paddingVertical: 14, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 15, ...FONTS.heading },
  challengeNode: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeSymbol: { fontSize: 16, color: '#fff', ...FONTS.heading },
  nodeTitle: {
    position: 'absolute',
    top: 68,
    width: 100,
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textSub,
    left: -18,
    flexWrap: 'wrap',
  },
  dayLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.subheading,
    letterSpacing: 0.5,
  },
  // Panel
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 20,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACE.md,
    marginBottom: SPACE.sm,
  },
  panelScroll: { paddingHorizontal: SPACE.lg, alignItems: 'center', gap: SPACE.md },
  panelAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelAvatarText: { color: '#fff', fontSize: 18, ...FONTS.heading },
  panelName: { fontSize: 20, ...FONTS.heading, color: COLORS.text },
  panelEmail: { fontSize: 12, color: COLORS.textMuted },
  levelBadge: {
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelBadgeText: { fontSize: 13, color: COLORS.primaryLight, ...FONTS.subheading },
  xpBarWrap: { alignSelf: 'stretch', gap: SPACE.xs },
  xpBar: {
    height: 8,
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  xpBarLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    alignSelf: 'stretch',
  },
  statGridItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    alignItems: 'center',
  },
  statGridValue: { fontSize: 20, ...FONTS.heading, color: COLORS.primary },
  statGridLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, alignSelf: 'stretch' },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  assessmentLabel: { fontSize: 14, color: COLORS.textSub },
  scorePill: {
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  scorePillText: { fontSize: 12, color: COLORS.primaryLight },
  secondaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.textSub, fontSize: 15, ...FONTS.subheading },
  signOutBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutBtnText: { color: COLORS.danger, fontSize: 15, ...FONTS.subheading },
});
