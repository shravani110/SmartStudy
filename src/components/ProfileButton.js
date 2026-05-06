import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function ProfileButton({ onPress, userName }) {
  const { isDarkMode } = useTheme();
  const themeColors = getColors(isDarkMode);

  const initials = (userName || "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "S";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.button,
      { backgroundColor: themeColors.primary },
      pressed && styles.pressed
    ]}>
      <Text style={styles.label}>{initials}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
