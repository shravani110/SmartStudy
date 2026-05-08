import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { getColors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Web Client ID from google-services.json
const WEB_CLIENT_ID = "385864340445-hvmsu5fno111jl9ahp6ea1lubhvhc4sp.apps.googleusercontent.com";

export default function LoginScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailAuth() {
    setIsSubmitting(true);
    setError("");
    try {
      if (isLogin) {
        await signInWithEmail({ email, password });
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your name");
        }
        await signUpWithEmail({ name: name.trim(), email, password });
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setError("");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      // Get tokens
      const tokens = await GoogleSignin.getTokens();
      
      // Call the auth context with Google user data
      await signInWithGoogle({
        email: userInfo.data?.user.email,
        name: userInfo.data?.user.name,
        photo: userInfo.data?.user.photo,
        idToken: tokens.idToken,
      });
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "SIGN_IN_CANCELLED") {
        // User cancelled - no error needed
      } else if (err.code === "IN_PROGRESS") {
        setError("Sign in is already in progress");
      } else if (err.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        setError("Google Play Services not available");
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
              {isLogin ? "Sign in to continue" : "Create an account to get started"}
            </Text>

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSoft}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSoft}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              onPress={handleEmailAuth}
              disabled={isSubmitting || !email.trim() || !password.trim()}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || isSubmitting || !email.trim() || !password.trim() ? 0.7 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? "Sign In" : "Sign Up"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => { setIsLogin(!isLogin); setError(""); }} style={styles.toggleBtn}>
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSoft }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

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
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    marginTop: 20,
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
    marginTop: 10,
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
