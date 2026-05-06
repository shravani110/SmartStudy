import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import EmptyState from "../components/EmptyState";
import GuideCard from "../components/GuideCard";
import { colors } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";

export default function LibraryScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { guides, selectGuide, removeGuide } = useStudyGuides();

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {guides.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title="Your library is empty"
            description="Generate your first study guide from the Home tab and it will appear here automatically."
          />
        ) : (
          <View>
            {guides.map((guide, index) => (
              <Animated.View key={guide.id} entering={FadeInUp.delay(index * 80).duration(320)}>
                <GuideCard
                  guide={guide}
                  onPress={() => {
                    selectGuide(guide.id);
                    navigation.navigate("GuideDetail", {
                      guideId: guide.id,
                      title: guide.title,
                    });
                  }}
                  onDelete={() => removeGuide(guide.id)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  heroCard: {
    marginBottom: 18,
  },
  heroLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSubtitle: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
  },
});
