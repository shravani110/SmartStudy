import React from "react";
import { ScrollView, StyleSheet, Text, View, Switch, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { getColors, shadows } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";

function StatCard({ label, value, icon, colors }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSoft }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { guides } = useStudyGuides();
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const flashcardCount = guides.reduce((total, guide) => total + guide.flashcards.length, 0);
  const initials = (user?.name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials || "SS"}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || "Smart Study User"}</Text>
          <Text style={[styles.subtitle, { color: colors.textSoft }]}>
            {user?.phone ? `Verified: ${user.phone}` : "Focused learner · Smart Study workspace"}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Study sets" value={guides.length} icon="library-outline" colors={colors} />
          <StatCard label="Flashcards" value={flashcardCount} icon="albums-outline" colors={colors} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>About this app</Text>
          <Text style={[styles.infoText, { color: colors.textSoft }]}>
            Your study guides are saved locally to this device so you can return to them from the Library, Flashcards, and Quiz tabs.
          </Text>

          <View style={[styles.darkModeRow, { borderTopColor: colors.border }]}>
            <View style={styles.darkModeLabel}>
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={16} color={colors.primary} style={styles.darkModeIcon} />
              <Text style={[styles.darkModeText, { color: colors.text }]}>Dark mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryDark }}
              thumbColor={colors.primary}
            />
          </View>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                borderColor: colors.danger,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 30,
    alignItems: "center",
    padding: 24,
    marginBottom: 18,
    ...shadows.card,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    padding: 18,
    ...shadows.card,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  darkModeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  darkModeLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  darkModeIcon: {
    marginRight: 10,
  },
  darkModeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: 16,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
