import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

const AUTH_USER_KEY = "authUser";

function normalizePhone(phone) {
  return phone.replace(/[^0-9+]/g, "").trim();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null);

  useEffect(() => {
    loadSavedUser();
  }, []);

  async function loadSavedUser() {
    try {
      const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Failed to load auth session:", error);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function requestOtp({ name, phone }) {
    const normalizedPhone = normalizePhone(phone);
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error("Please enter a valid name.");
    }

    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new Error("Please enter a valid phone number.");
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    setPendingVerification({
      name: trimmedName,
      phone: normalizedPhone,
      code,
      expiresAt,
    });

    // Demo OTP for local/dev use. Replace with real SMS provider in production.
    Alert.alert("OTP sent", `Your verification code is ${code}`);
  }

  async function verifyOtp(inputOtp) {
    const normalizedOtp = String(inputOtp).trim();

    if (!pendingVerification) {
      throw new Error("Please request an OTP first.");
    }

    if (Date.now() > pendingVerification.expiresAt) {
      setPendingVerification(null);
      throw new Error("OTP expired. Please request a new code.");
    }

    if (normalizedOtp !== pendingVerification.code) {
      throw new Error("Invalid OTP. Please try again.");
    }

    const signedInUser = {
      name: pendingVerification.name,
      phone: pendingVerification.phone,
      verifiedAt: Date.now(),
    };

    setUser(signedInUser);
    setPendingVerification(null);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
  }

  async function signOut() {
    setUser(null);
    setPendingVerification(null);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      pendingVerification,
      requestOtp,
      verifyOtp,
      signOut,
    }),
    [user, isAuthLoading, pendingVerification]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
