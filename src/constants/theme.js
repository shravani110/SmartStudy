export const lightColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2FF",
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  text: "#1F2937",
  textSoft: "#4B5563",
  muted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export const darkColors = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#334155",
  primary: "#6366F1",
  primaryDark: "#818CF8",
  text: "#F1F5F9",
  textSoft: "#CBD5E1",
  muted: "#94A3B8",
  border: "#334155",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export const colors = lightColors;

export function getColors(isDarkMode = false) {
  return isDarkMode ? darkColors : lightColors;
}

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4,
  },
  tabBar: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 18,
    elevation: 12,
  },
};
