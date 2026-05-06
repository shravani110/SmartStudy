 import React, { useState, useLayoutEffect, useEffect } from "react";
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import EmptyState from "../components/EmptyState";
import Flashcard from "../components/Flashcard";
import { shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";
import { formatStudyDate } from "../utils/formatters";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function DefaultHeader({ colors }) {
  return (
    <View style={[styles.defaultHeader, { borderBottomColor: colors.border }]}>
      <Text style={[styles.defaultHeaderTitle, { color: colors.text }]}>Flashcards</Text>
      <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.profileText}>S</Text>
      </View>
    </View>
  );
}

function ActiveHeader({ colors, selectedTopic, onBackPress }) {
  return (
    <View style={[styles.activeHeader, { borderBottomColor: colors.border }]}>
      <View style={{ marginLeft: 8 }}>
        <Pressable onPress={onBackPress} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.headerTitle, { color: colors.text }]}
      >
        {selectedTopic.title}
      </Text>
      <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.profileText}>S</Text>
      </View>
    </View>
  );
}

export default function FlashcardsScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { guides } = useStudyGuides();
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const navigation = useNavigation();

  const selectedTopic = guides.find((g) => g.id === selectedTopicId);

  // Get safe area insets for tab bar
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    if (selectedTopic) {
      navigation.setOptions({
        headerShown: true,
        // EXACT CHANGE IS HERE: Custom title component with left alignment and spacing
        headerTitle: () => (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ 
              fontSize: 17, 
              fontWeight: "800", 
              color: colors.text, 
              marginLeft: 12 // This adds the space between the arrow and the text
            }}
          >
            {selectedTopic.title}
          </Text>
        ),
        headerTitleAlign: "left", // This tucks the title right next to the arrow
        headerBackTitleVisible: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerLeft: () => (
          <View style={{ marginLeft: 16 }}>
            <Pressable onPress={() => setSelectedTopicId(null)} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </Pressable>
          </View>
        ),
        // Hide bottom tab bar when viewing flashcards
        tabBarStyle: { display: "none" },
      });
    } else {
      navigation.setOptions({
        headerShown: true,
        headerTitle: "Flashcards",
        headerTitleStyle: { fontSize: 17, fontWeight: "800", color: colors.text },
        headerLeft: undefined,
        headerStyle: {
          backgroundColor: colors.background,
        },
        // Show bottom tab bar on main list with proper safe area
        tabBarStyle: {
          display: "flex",
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 5,
        },
      });
    }
  }, [selectedTopic, navigation, colors.primary, colors.background, insets.bottom]);

  // Handle hardware back button to return to flashcards list instead of home
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedTopic) {
        setSelectedTopicId(null); // Go back to flashcards list
        return true; // Prevent default navigation
      }
      return false; // Let default behavior happen on main list
    });

    return () => backHandler.remove();
  }, [selectedTopic]);

  if (guides.length === 0) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <EmptyState
            icon="albums-outline"
            title="No flashcards yet"
            description="Generate a study set from the Home tab and your flashcards will be ready here."
          />
        </ScrollView>
      </View>
    );
  }

  if (!selectedTopic) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FlatList
            scrollEnabled={false}
            data={guides}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
                <Pressable
                  onPress={() => setSelectedTopicId(item.id)}
                  style={({ pressed }) => [
                    styles.topicCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && styles.topicCardPressed,
                  ]}
                >
                  <View style={styles.textColumn}>
                    <Text style={[styles.topicCardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.topicCardMeta, { color: colors.textSoft }]}>
                      {item.flashcards.length} cards • Tap to review
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </Pressable>
              </Animated.View>
            )}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {selectedTopic.flashcards.map((card, index) => (
          <Animated.View
            key={`${selectedTopic.id}-${index}`}
            entering={FadeInUp.delay(index * 70).duration(300)}
            style={styles.flashcardWrapper}
          >
            <Flashcard question={card.question} answer={card.answer} index={index} />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  defaultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  defaultHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  headerTitle: {
    flex: 1,
    fontWeight: "800",
    fontSize: 18,
    marginHorizontal: 12,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  profileText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  topicCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicCardPressed: {
    opacity: 0.9,
  },
  textColumn: {
    flex: 1,
  },
  topicCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  topicCardMeta: {
    fontSize: 12,
  },
  flashcardWrapper: {
    marginBottom: 16,
  },
});