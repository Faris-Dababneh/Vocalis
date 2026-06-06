import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS } from '../constants/theme';

export default function AuroraBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.blob,
          {
            width: width * 0.7,
            height: width * 0.7,
            borderRadius: width * 0.35,
            backgroundColor: COLORS.primary,
            top: -width * 0.2,
            left: -width * 0.15,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: width * 0.6,
            height: width * 0.6,
            borderRadius: width * 0.3,
            backgroundColor: COLORS.accent,
            top: -width * 0.1,
            right: -width * 0.15,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: width * 0.65,
            height: width * 0.65,
            borderRadius: width * 0.325,
            backgroundColor: COLORS.accentGreen,
            bottom: height * 0.1,
            left: width * 0.17,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    opacity: 0.07,
  },
});
