import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

const AUTH_USER_KEY = "authUser";

// Backend API URL - uses local network IP for mobile testing
// Change this to your actual backend URL when deployed
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.36:5000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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

  // Email/Password Sign Up
  async function signUpWithEmail({ name, email, password }) {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Sign up failed");
      }

      const signedInUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        token: data.token,
        provider: "email",
        signedInAt: Date.now(),
      };

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Sign up failed. Please try again.");
    }
  }

  // Email/Password Sign In
  async function signInWithEmail({ email, password }) {
    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      const signedInUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        token: data.token,
        provider: "email",
        signedInAt: Date.now(),
      };

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Sign in failed. Please try again.");
    }
  }

  // Google Sign In - uses backend to verify Google token
  async function signInWithGoogle(googleUserData) {
    try {
      // Send Google user data to backend for verification/storage
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleUserData.email,
          name: googleUserData.name || googleUserData.displayName,
          photo: googleUserData.photo || googleUserData.photoURL,
          idToken: googleUserData.idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google sign in failed");
      }

      const signedInUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.photo || googleUserData.photo,
        token: data.token,
        provider: "google",
        signedInAt: Date.now(),
      };

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Google sign in failed. Please try again.");
    }
  }

  async function signOut() {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [user, isAuthLoading]
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
