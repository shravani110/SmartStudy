import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import Animated, {
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import GuideCard from "../components/GuideCard";
import { colors, shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";

function LoadingDot({ delay = 0, color }) {
  const progress = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420 }),
          withTiming(0.35, { duration: 420 })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 8 },
      { scale: 0.88 + progress.value * 0.12 },
    ],
  }));

  return <Animated.View style={[styles.loadingDot, animatedStyle, { backgroundColor: color }]} />;
}

export default function HomeScreen({ navigation }) {
  const [studyText, setStudyText] = useState("");
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { createGuideFromText, latestGuide, selectGuide, isUsingRemoteAI } = useStudyGuides();

  async function handleGenerate() {
    if (!studyText.trim()) {
      Alert.alert("Missing Study Material", "Paste some text before generating your study guide.");
      return;
    }

    try {
      setLoading(true);
      const guide = await createGuideFromText(studyText);
      setStudyText("");
      navigation.navigate("GuideDetail", {
        guideId: guide.id,
        title: guide.title,
      });
    } catch (error) {
      let errorMessage = "Something went wrong while generating the study guide.";

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.error) {
        // Handle nested error objects
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error?.message && typeof error.error.message === 'string') {
          errorMessage = error.error.message;
        } else {
          errorMessage = JSON.stringify(error.error);
        }
      } else if (typeof error === 'object' && error !== null) {
        // Fallback: stringify the entire error object
        errorMessage = JSON.stringify(error);
      }

      Alert.alert("Generation Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Transform your study material into notes, flashcards, and quizzes.</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSoft }]}>
              Paste any lecture or article to instantly generate a reusable study set.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(500)} style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Create a new study set</Text>
              <Text style={[styles.sectionHint, { color: colors.primary }]}>Auto-saved to Library</Text>
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                value={studyText}
                onChangeText={setStudyText}
                placeholder="Paste complex study material here..."
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                editable={!loading}
                style={[styles.textArea, { color: colors.text }]}
              />
            </View>

            <View style={styles.helperSection}>
              <Text style={[styles.helperText, { color: colors.muted }]}>
                {isUsingRemoteAI
                  ? "Gemini is connected. Generate a richer study set from your pasted material."
                  : "No live API key detected. The app will still generate a usable local study set."}
              </Text>
              <Text style={[styles.counterText, { color: colors.primary }]}>{studyText.trim().length} chars</Text>
            </View>

            <Pressable
              disabled={loading}
              onPress={handleGenerate}
              style={({ pressed }) => [
                styles.generateButton,
                { backgroundColor: colors.primary },
                pressed && !loading ? styles.generateButtonPressed : null,
                loading ? styles.generateButtonDisabled : null,
              ]}
            >
              <Text style={styles.generateButtonText}>
                {loading ? "Generating Study Guide..." : "Generate Study Guide"}
              </Text>
            </Pressable>

            {loading ? (
              <View style={styles.loadingWrap}>
                <View style={styles.loadingDotsRow}>
                  <LoadingDot delay={0} color={colors.primary} />
                  <LoadingDot delay={140} color={colors.primary} />
                  <LoadingDot delay={280} color={colors.primary} />
                </View>
                <Text style={[styles.loadingText, { color: colors.textSoft }]}>Building your notes, takeaways, and flashcards...</Text>
              </View>
            ) : null}
          </Animated.View>

          {latestGuide ? (
            <Animated.View entering={FadeInUp.delay(180).duration(500)} style={styles.continueSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Continue your latest set</Text>
              <GuideCard
                guide={latestGuide}
                onPress={() => {
                  selectGuide(latestGuide.id);
                  navigation.navigate("GuideDetail", {
                    guideId: latestGuide.id,
                    title: latestGuide.title,
                  });
                }}
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    ...shadows.card,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  inputCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 10,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 16,
    gap: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionHint: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    minHeight: 160,
    fontSize: 15,
    lineHeight: 24,
    padding: 0,
  },
  helperSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
    gap: 12,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 0,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  headingGroup: {
    marginBottom: 20,
  },
  headingTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  headingSubtext: {
    fontSize: 13,
    fontWeight: "500",
  },
  generateButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonPressed: {
    opacity: 0.92,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  loadingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginHorizontal: 5,
  },
  loadingText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  continueSection: {
    marginTop: 10,
    marginBottom: 12,
  },
});
