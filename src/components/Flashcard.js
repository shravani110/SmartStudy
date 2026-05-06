import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function Flashcard({ question, answer, index = 0 }) {
  const { isDarkMode } = useTheme();
  const themeColors = getColors(isDarkMode);
  const flipped = useSharedValue(0);

  function toggleCard() {
    flipped.value = withTiming(flipped.value ? 0 : 1, {
      duration: 520,
      easing: Easing.inOut(Easing.ease),
    });
  }

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${flipped.value * 180}deg` },
    ],
    opacity: flipped.value < 0.5 ? 1 : 0,
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${180 + flipped.value * 180}deg` },
    ],
    opacity: flipped.value > 0.5 ? 1 : 0,
  }));

  return (
    <Pressable
      onPress={toggleCard}
      accessibilityRole="button"
      accessibilityLabel={`Flashcard ${index + 1}`}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
    >
      <View style={styles.cardContainer}>
        <Animated.View style={[
          styles.cardFace,
          styles.frontFace,
          { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          frontAnimatedStyle
        ]}>
          <Text style={[styles.faceLabel, { color: themeColors.primary }]}>Question</Text>
          <Text style={[styles.faceText, { color: themeColors.text }]}>{question}</Text>
          <Text style={[styles.tapHint, { color: themeColors.muted }]}>Tap to reveal answer</Text>
        </Animated.View>

        <Animated.View style={[
          styles.cardFace,
          styles.backFace,
          { backgroundColor: themeColors.primary, borderColor: themeColors.primaryDark },
          backAnimatedStyle
        ]}>
          <Text style={[styles.faceLabel, styles.backLabel]}>Answer</Text>
          <Text style={[styles.faceText, styles.backText]}>{answer}</Text>
          <Text style={[styles.tapHint, styles.backHint]}>Tap to flip back</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 16,
  },
  pressablePressed: {
    opacity: 0.96,
  },
  cardContainer: {
    minHeight: 210,
  },
  cardFace: {
    minHeight: 210,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    backfaceVisibility: "hidden",
    ...shadows.card,
  },
  frontFace: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  backFace: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  faceLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  frontLabel: {
    color: colors.primary,
  },
  backLabel: {
    color: "#C7D2FE",
  },
  faceText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.text,
  },
  backText: {
    color: "#FFFFFF",
  },
  tapHint: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  backHint: {
    color: "#E0E7FF",
  },
});
