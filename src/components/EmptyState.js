import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function EmptyState({ icon, title, description }) {
  const { isDarkMode } = useTheme();
  const themeColors = getColors(isDarkMode);

  return (
    <View style={[
      styles.card,
      { backgroundColor: themeColors.surface, borderColor: themeColors.border }
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: themeColors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={themeColors.primary} />
      </View>
      <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: themeColors.textSoft }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    ...shadows.card,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
