import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { statusCodes } from "@react-native-google-signin/google-signin";

import { GOOGLE_WEB_CLIENT_ID } from "../config/auth";
import { getColors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setError("");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        return;
      }

      const tokens = response.data.idToken ? null : await GoogleSignin.getTokens();
      const idToken = response.data.idToken || tokens?.idToken;

      if (!idToken) {
        throw new Error("Google sign-in did not return an ID token.");
      }

      await signInWithGoogle({
        email: response.data.user.email,
        name: response.data.user.name,
        photo: response.data.user.photo,
        idToken,
      });
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError("Sign in is already in progress");
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services not available");
      } else if (err.code === "DEVELOPER_ERROR") {
        setError(
          "Google Sign-In is not configured for the certificate currently signing this Android build. Verify that the app is being signed with the same keystore registered in Firebase, then rebuild."
        );
      } else {
        setError(err.message || "Google sign-in failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardWrap}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome to Smart Study</Text>
            <Text style={[styles.subtitle, { color: colors.textSoft }]}>
              Sign in with Google to continue
            </Text>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.button,
                styles.googleButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed || isSubmitting ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </Pressable>

            {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  googleButton: {
    borderWidth: 1,
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
