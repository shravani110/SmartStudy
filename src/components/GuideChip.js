import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function GuideChip({ active, label, onPress }) {
  const { isDarkMode } = useTheme();
  const themeColors = getColors(isDarkMode);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? themeColors.primary : themeColors.surface,
          borderColor: active ? themeColors.primary : themeColors.border,
        },
        pressed ? styles.chipPressed : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? "#FFFFFF" : themeColors.textSoft }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.92,
  },
  label: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 160,
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
