import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { FIREBASE_API_KEY, FIREBASE_AUTH_BASE_URL } from "../config/auth";

const AuthContext = createContext();

const AUTH_USER_KEY = "authUser";

function getFirebaseUrl(path) {
  return `${FIREBASE_AUTH_BASE_URL}/${path}?key=${FIREBASE_API_KEY}`;
}

async function parseJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function mapFirebaseError(errorCode) {
  switch (errorCode) {
    case "EMAIL_EXISTS":
      return "This email is already registered. Please sign in instead.";
    case "EMAIL_NOT_FOUND":
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
      return "Invalid email or password.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "Password must be at least 6 characters long.";
    case "USER_DISABLED":
      return "This account has been disabled.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many attempts. Please try again later.";
    case "INVALID_IDP_RESPONSE":
    case "INVALID_ID_TOKEN":
      return "Google sign-in could not be verified. Please try again.";
    default:
      return null;
  }
}

async function firebaseRequest(path, body) {
  const response = await fetch(getFirebaseUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const firebaseCode = data?.error?.message;
    const friendlyMessage = mapFirebaseError(firebaseCode);
    throw new Error(friendlyMessage || "Authentication failed. Please try again.");
  }

  return data;
}

function buildUserSession(data, provider, fallbackProfile = {}) {
  return {
    id: data.localId,
    name: data.displayName || fallbackProfile.name || "Smart Study User",
    email: data.email || fallbackProfile.email,
    avatar: data.photoUrl || fallbackProfile.photo || null,
    token: data.idToken,
    refreshToken: data.refreshToken || null,
    provider,
    signedInAt: Date.now(),
  };
}

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

  async function signUpWithEmail({ name, email, password }) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const signUpData = await firebaseRequest("accounts:signUp", {
        email: normalizedEmail,
        password,
        returnSecureToken: true,
      });

      const updatedProfile = await firebaseRequest("accounts:update", {
        idToken: signUpData.idToken,
        displayName: name.trim(),
        returnSecureToken: true,
      });

      const signedInUser = buildUserSession(updatedProfile, "email", {
        name: name.trim(),
        email: normalizedEmail,
      });

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Sign up failed. Please try again.");
    }
  }

  async function signInWithEmail({ email, password }) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const data = await firebaseRequest("accounts:signInWithPassword", {
        email: normalizedEmail,
        password,
        returnSecureToken: true,
      });

      const signedInUser = buildUserSession(data, "email", {
        email: normalizedEmail,
      });

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Sign in failed. Please try again.");
    }
  }

  async function signInWithGoogle(googleUserData) {
    try {
      if (!googleUserData?.idToken) {
        throw new Error("Google sign-in did not return an ID token.");
      }

      const data = await firebaseRequest("accounts:signInWithIdp", {
        postBody: `id_token=${encodeURIComponent(googleUserData.idToken)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
        returnIdpCredential: true,
      });

      const signedInUser = buildUserSession(data, "google", {
        name: googleUserData.name || googleUserData.displayName,
        email: googleUserData.email,
        photo: googleUserData.photo || googleUserData.photoURL,
      });

      setUser(signedInUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(signedInUser));
      return signedInUser;
    } catch (error) {
      throw new Error(error.message || "Google sign in failed. Please try again.");
    }
  }

  async function signOut() {
    try {
      if (user?.provider === "google") {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.warn("Google sign-out cleanup failed:", error);
    }

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
