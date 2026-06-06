import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { updateUser, awardXP } from '../services/firestoreService';
import { RootStackParamList } from '../types';
import { LSAS_QUESTIONS } from '../constants/liebowitz';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';
import PrimaryButton from '../components/PrimaryButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Assessment'>;
  route: RouteProp<RootStackParamList, 'Assessment'>;
};

const FEAR_LABELS = ['None', 'Mild', 'Moderate', 'Severe'];
const AVOIDANCE_LABELS = ['Never', 'Occasionally', 'Often', 'Usually'];
const QUESTIONS_PER_PAGE = 6; // 12 questions across 2 pages

// Thresholds scaled proportionally from original 144-point scale to 72-point scale
function scoreToLevel(score: number): string {
  if (score <= 9)  return 'minimal';
  if (score <= 18) return 'mild';
  if (score <= 27) return 'moderate';
  if (score <= 33) return 'marked';
  if (score <= 40) return 'severe';
  if (score <= 47) return 'very_severe';
  return 'extremely_severe';
}

export default function AssessmentScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { firebaseUser, refreshUser } = useAuth();
  const isRetake = route.params?.isRetake ?? false;

  const totalPages = Math.ceil(LSAS_QUESTIONS.length / QUESTIONS_PER_PAGE);
  const [page, setPage] = useState(0);
  const [fearRatings, setFearRatings] = useState<number[]>(
    new Array(LSAS_QUESTIONS.length).fill(-1)
  );
  const [avoidanceRatings, setAvoidanceRatings] = useState<number[]>(
    new Array(LSAS_QUESTIONS.length).fill(-1)
  );
  const [loading, setLoading] = useState(false);

  const pageQuestions = LSAS_QUESTIONS.slice(
    page * QUESTIONS_PER_PAGE,
    (page + 1) * QUESTIONS_PER_PAGE
  );

  const pageComplete = pageQuestions.every((_, localIdx) => {
    const globalIdx = page * QUESTIONS_PER_PAGE + localIdx;
    return fearRatings[globalIdx] >= 0 && avoidanceRatings[globalIdx] >= 0;
  });

  const handleNext = async () => {
    if (page < totalPages - 1) {
      setPage((p) => p + 1);
      return;
    }
    if (!firebaseUser) return;

    const total =
      fearRatings.reduce((a, b) => a + b, 0) +
      avoidanceRatings.reduce((a, b) => a + b, 0);
    const level = scoreToLevel(total);
    setLoading(true);
    try {
      await updateUser(firebaseUser.uid, {
        anxietyScore: total,
        anxietyLevel: level,
        assessmentCompleted: true,
      });
      if (isRetake) {
        await awardXP(firebaseUser.uid, 25);
      }
      await refreshUser();
      if (isRetake) {
        navigation.goBack();
      } else {
        navigation.navigate('GoalSetup');
      }
    } finally {
      setLoading(false);
    }
  };

  const progress = (page + 1) / totalPages;

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />
      <View style={[styles.header, { paddingTop: insets.top + SPACE.md }]}>
        <Text style={styles.heading}>
          {isRetake ? 'Retake Assessment' : 'Social Anxiety Assessment'}
        </Text>
        <Text style={styles.subheading}>
          Page {page + 1} of {totalPages} · {LSAS_QUESTIONS.length} questions total
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACE.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.legend}>
          Rate each situation for{' '}
          <Text style={styles.legendBold}>Fear/Anxiety</Text> and{' '}
          <Text style={styles.legendBold}>Avoidance</Text>
        </Text>

        {pageQuestions.map((q, localIdx) => {
          const globalIdx = page * QUESTIONS_PER_PAGE + localIdx;
          return (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionText}>
                {globalIdx + 1}. {q.situation}
              </Text>

              <Text style={styles.ratingLabel}>Fear / Anxiety</Text>
              <View style={styles.ratingRow}>
                {FEAR_LABELS.map((label, val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      const updated = [...fearRatings];
                      updated[globalIdx] = val;
                      setFearRatings(updated);
                    }}
                    style={[
                      styles.ratingBtn,
                      fearRatings[globalIdx] === val && styles.ratingBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingBtnText,
                        fearRatings[globalIdx] === val && styles.ratingBtnTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingLabel}>Avoidance</Text>
              <View style={styles.ratingRow}>
                {AVOIDANCE_LABELS.map((label, val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      const updated = [...avoidanceRatings];
                      updated[globalIdx] = val;
                      setAvoidanceRatings(updated);
                    }}
                    style={[
                      styles.ratingBtn,
                      avoidanceRatings[globalIdx] === val && styles.ratingBtnActive,
                      avoidanceRatings[globalIdx] === val && {
                        backgroundColor: COLORS.accent,
                        borderColor: COLORS.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingBtnText,
                        avoidanceRatings[globalIdx] === val && styles.ratingBtnTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <PrimaryButton
          title={
            page < totalPages - 1
              ? 'Next →'
              : isRetake
              ? 'Save New Results →'
              : 'See My Results →'
          }
          onPress={handleNext}
          loading={loading}
          disabled={!pageComplete}
          style={styles.nextBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 20, ...FONTS.heading, color: COLORS.text },
  subheading: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACE.sm },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  scroll: { padding: SPACE.lg, gap: SPACE.md },
  legend: { fontSize: 13, color: COLORS.textSub, marginBottom: SPACE.sm },
  legendBold: { color: COLORS.primaryLight, fontWeight: '600' },
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    gap: SPACE.sm,
  },
  questionText: { fontSize: 15, color: COLORS.text, ...FONTS.subheading, lineHeight: 22 },
  ratingLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACE.xs },
  ratingRow: { flexDirection: 'row', gap: SPACE.xs, flexWrap: 'wrap' },
  ratingBtn: {
    flex: 1,
    minWidth: 60,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    backgroundColor: COLORS.surfaceHi,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ratingBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  ratingBtnText: { fontSize: 11, color: COLORS.textSub },
  ratingBtnTextActive: { color: '#fff', fontWeight: '600' },
  nextBtn: { marginTop: SPACE.lg, alignSelf: 'stretch' },
});
