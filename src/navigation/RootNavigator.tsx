import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import GoalSetupScreen from '../screens/GoalSetupScreen';
import TimeframeSetupScreen from '../screens/TimeframeSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import SocialMomentScreen from '../screens/SocialMomentScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const navKey = firebaseUser?.uid ?? 'unauthenticated';

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={navKey}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {!firebaseUser ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !user?.assessmentCompleted ? (
          <>
            <Stack.Screen name="Assessment" component={AssessmentScreen} />
          </>
        ) : !user?.onboardingCompleted ? (
          <>
            <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />
            <Stack.Screen name="TimeframeSetup" component={TimeframeSetupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
            <Stack.Screen name="SocialMoment" component={SocialMomentScreen} />
            <Stack.Screen name="Assessment" component={AssessmentScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
