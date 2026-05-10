import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// 1. YOUR FIREBASE CONFIGURATION
// REPLACE this placeholder object with the real config from your Firebase Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyD5MuLEZrDiqRd-oR4EV4s2pf-BwWpM51c",
  authDomain: "smartstudy-60a73.firebaseapp.com",
  projectId: "smartstudy-60a73",
  storageBucket: "smartstudy-60a73.firebasestorage.app",
  messagingSenderId: "385864340445",
  appId: "1:385864340445:web:bff36a24f1e696ddce1c34",
  measurementId: "G-JDV15D0RCS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // 2. GOOGLE SIGN-IN CONFIGURATION (Your ID is successfully injected here!)
    GoogleSignin.configure({
      webClientId: '385864340445-hvmsu5fno111jl9ahp6ea1lubhvhc4sp.apps.googleusercontent.com', 
    });
  }, []);

  // --- Email / Password Handlers ---
  const handleEmailSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Success", "Signed in successfully!");
      // Navigate to your Home Screen here
    } catch (error) {
      // If user doesn't exist, let's create them!
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
         handleCreateAccount();
      } else {
         Alert.alert("Sign In Error", error.message);
      }
    }
  };

  const handleCreateAccount = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert("Welcome!", "Account created successfully!");
    } catch (error) {
      Alert.alert("Sign Up Error", error.message);
    }
  };

  // --- Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;

      // Pass the token to Firebase
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);

      Alert.alert("Success", "Signed in with Google!");
    } catch (error) {
      Alert.alert("Google Sign-In Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SmartStudy</Text>
      <Text style={styles.subtitle}>Create an account to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleEmailSignIn}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => Alert.alert("Navigate", "Go to Sign In Screen")}>
          <Text style={styles.switchText}>Already have an account? Sign In</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fafafa' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#1a1a24' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchText: { color: '#4f46e5', textAlign: 'center', marginTop: 15, fontSize: 14 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  orText: { marginHorizontal: 10, color: '#666', fontSize: 12 },
  googleButton: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  googleButtonText: { color: '#1a1a24', fontSize: 16, fontWeight: 'bold' },
});
