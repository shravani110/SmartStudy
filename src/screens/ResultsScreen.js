import React, { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import EmptyState from "../components/EmptyState";
import ProfileButton from "../components/ProfileButton";
import { colors, shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";
import { formatStudyDate } from "../utils/formatters";

export default function ResultsScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { getGuideById, latestGuide, selectGuide } = useStudyGuides();
  const guide = getGuideById(route.params?.guideId) || latestGuide;

  useLayoutEffect(() => {
    if (guide) {
      navigation.setOptions({
        headerTitle: () => (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              marginLeft: 12,
              fontSize: 17,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            {guide.title}
          </Text>
        ),
        headerTitleAlign: "left",
        headerLeft: () => (
          <View style={{ marginLeft: 4 }}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </Pressable>
          </View>
        ),
        headerRight: () => (
          <View style={{ marginRight: 4 }}>
            <ProfileButton
              userName="S"
              onPress={() => navigation.navigate("Profile")}
            />
          </View>
        ),
      });
    }
  }, [guide, navigation, colors.primary]);

  if (!guide) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["bottom"]}>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="document-text-outline"
            title="No study guide selected"
            description="Go back to Home or Library and open a study set to see the full breakdown here."
          />
        </View>
      </SafeAreaView>
    );
  }

  function openTab(tabName) {
    selectGuide(guide.id);
    navigation.navigate("MainTabs", {
      screen: tabName,
    });
  }

  const noteParagraphs = String(guide.simplified_notes || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(420)} style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Study guide</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{guide.title}</Text>
          <Text style={[styles.heroText, { color: colors.textSoft }]}>
            Saved on {formatStudyDate(guide.createdAt)} | {guide.flashcards.length} flashcards |{" "}
            {guide.key_takeaways.length} takeaways
          </Text>

          <View style={styles.actionRow}>
            <Pressable onPress={() => openTab("Flashcards")} style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="albums-outline" size={16} color={colors.primary} />
              <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Open Deck</Text>
            </Pressable>
            <Pressable onPress={() => openTab("Quiz")} style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
              <Ionicons name="flash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Start Quiz</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).duration(400)} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Simplified Notes</Text>
          {noteParagraphs.map((paragraph, index) => (
            <Text key={`${paragraph}-${index}`} style={[styles.notesText, { color: colors.textSoft }]}>
              {paragraph}
            </Text>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Takeaways</Text>
          {guide.key_takeaways.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.takeawayRow}>
              <View style={[styles.takeawayIndex, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.takeawayIndexText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.takeawayText, { color: colors.textSoft }]}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyWrap: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    ...shadows.card,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    marginBottom: 10,
  },
  heroText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  notesText: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 14,
  },
  takeawayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  takeawayIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  takeawayIndexText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  takeawayText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
  },
});
