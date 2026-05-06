import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { formatStudyDate, truncateText } from "../utils/formatters";

export default function GuideCard({ guide, onPress, onDelete }) {
  const { isDarkMode } = useTheme();
  const themeColors = getColors(isDarkMode);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.card,
      { backgroundColor: themeColors.surface, borderColor: themeColors.border },
      pressed && styles.pressed
    ]}>
      <View style={[styles.cover, { backgroundColor: themeColors.primary }]}>
        <Ionicons name="sparkles-outline" size={26} color="#FFFFFF" />
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: themeColors.text }]}>{guide.title}</Text>
        <Text style={[styles.meta, { color: themeColors.muted }]}>
          {formatStudyDate(guide.createdAt)} · {guide.flashcards.length} flashcards
        </Text>
        <Text style={[styles.preview, { color: themeColors.textSoft }]}>{truncateText(guide.simplified_notes, 110)}</Text>

        <View style={styles.footer}>
          <Ionicons name="arrow-forward" size={18} color={themeColors.primary} />
        </View>
      </View>

      {onDelete && (
        <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={themeColors.danger} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...shadows.card,
    alignItems: "flex-start",
  },
  pressed: {
    opacity: 0.96,
  },
  cover: {
    width: 74,
    height: 104,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  preview: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  deleteButton: {
    marginLeft: 8,
    padding: 8,
  },
});
