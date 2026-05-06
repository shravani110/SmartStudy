import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update Android navigation bar button style based on theme
  useEffect(() => {
    const updateNavigationBar = async () => {
      try {
        // "light" = white buttons for dark mode, "dark" = black buttons for light mode
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
      } catch (error) {
        // NavigationBar native module not available, skip
      }
    };
    updateNavigationBar();
  }, [isDarkMode]);

  async function loadThemePreference() {
    try {
      const saved = await AsyncStorage.getItem("darkMode");
      if (saved !== null) {
        setIsDarkMode(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load theme preference:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleDarkMode() {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem("darkMode", JSON.stringify(newValue));
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
