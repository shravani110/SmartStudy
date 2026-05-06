import "react-native-gesture-handler";

import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import ProfileButton from "./src/components/ProfileButton";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { StudyGuidesProvider } from "./src/context/StudyGuidesContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import FlashcardsScreen from "./src/screens/FlashcardsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import QuizScreen from "./src/screens/QuizScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import { getColors, shadows } from "./src/constants/theme";

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON_MAP = {
  Home: "home-outline",
  Library: "library-outline",
  Flashcards: "albums-outline",
  Quiz: "help-circle-outline",
};

function createProfileButton(navigation) {
  const { user } = useAuth();
  return (
    <View style={{ marginRight: 16 }}>
      <ProfileButton
        userName={user?.name}
        onPress={() => {
          const parentNavigation = navigation.getParent();

          if (parentNavigation) {
            parentNavigation.navigate("Profile");
            return;
          }

          navigation.navigate("Profile");
        }}
      />
    </View>
  );
}

function MainTabs() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const insets = useSafeAreaInsets();

  const getTabIcon = ({ color, size, focused, routeName }) => {
    const baseIcon = TAB_ICON_MAP[routeName];
    const iconName = focused ? baseIcon.replace("-outline", "") : baseIcon;
    return <Ionicons name={iconName} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
        },
        headerTintColor: colors.primary,
        headerRight: () => createProfileButton(navigation),
        // Global Tab Bar Styling
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 5,
          backgroundColor: colors.background,
          borderTopWidth: 0,
          borderTopColor: "transparent",
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        // Consistent label styling for all tabs
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        // Standardized icon rendering - NO hardcoded colors
        tabBarIcon: ({ color, size, focused }) =>
          getTabIcon({
            color,
            size,
            focused,
            routeName: route.name,
          }),
        sceneStyle: {
          backgroundColor: colors.background,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Smart Study",
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: "Library",
        }}
      />
      <Tab.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{
          title: "Flashcards",
          tabBarLabel: "Flashcards",
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          title: "Quiz",
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isDarkMode } = useTheme();
  const { user, isAuthLoading } = useAuth();
  const colors = getColors(isDarkMode);

  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.background,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
      notification: colors.primary,
    },
  };

  if (isAuthLoading) {
    return (
      <NavigationContainer theme={appTheme}>
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <RootStack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: "800",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {user ? (
          <>
            <RootStack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                headerShown: false,
              }}
            />
            <RootStack.Screen
              name="GuideDetail"
              component={ResultsScreen}
              options={({ route, navigation }) => ({
                title: route.params?.title || "Study Guide",
                headerRight: () => createProfileButton(navigation),
              })}
            />
            <RootStack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                title: "Profile",
                presentation: "modal",
              }}
            />
          </>
        ) : (
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <StudyGuidesProvider>
              <AppNavigator />
            </StudyGuidesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
