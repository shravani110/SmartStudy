import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getColors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { requestOtp, verifyOtp, pendingVerification } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const canRequestOtp = useMemo(() => name.trim().length >= 2 && phoneDigits.length === 10, [name, phoneDigits]);
  const canVerifyOtp = useMemo(() => otp.trim().length === 6, [otp]);

  async function onRequestOtp() {
    setIsSubmitting(true);
    setError("");
    try {
      await requestOtp({ name, phone });
      setOtp("");
    } catch (err) {
      setError(err.message || "Unable to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onVerifyOtp() {
    setIsSubmitting(true);
    setError("");
    try {
      await verifyOtp(otp);
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.keyboardWrap}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to Smart Study</Text>
          <Text style={[styles.subtitle, { color: colors.textSoft }]}>Login with your phone number and OTP.</Text>

          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />

          <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 10);
              setPhone(digits);
            }}
            keyboardType="number-pad"
            placeholder="10-digit phone number"
            placeholderTextColor={colors.muted}
            maxLength={10}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />

          <Pressable
            disabled={!canRequestOtp || isSubmitting}
            onPress={onRequestOtp}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: canRequestOtp ? colors.primary : colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{pendingVerification ? "Resend OTP" : "Send OTP"}</Text>
            )}
          </Pressable>

          {pendingVerification ? (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="6-digit OTP"
                placeholderTextColor={colors.muted}
                maxLength={6}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              />

              <Pressable
                disabled={!canVerifyOtp || isSubmitting}
                onPress={onVerifyOtp}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: canVerifyOtp ? colors.success : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </Pressable>
            </>
          ) : null}

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
        </View>
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
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    marginTop: 10,
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
  errorText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
});
