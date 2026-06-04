import React, { useState } from "react";
import {
  View,
  Platform,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  createNavigationContainerRef,
  NavigationState,
  CommonActions,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./src/screens/HomeScreen";
import MyListScreen from "./src/screens/MyListScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import EpisodeScreen from "./src/screens/EpisodeScreen";
import VideoScreen from "./src/screens/VideoScreenWebView";
import SearchScreen from "./src/screens/SearchScreen";
import AnimeListScreen from "./src/screens/AnimeListScreen";
import GenreListScreen from "./src/screens/GenreListScreen";
import GenreAnimeScreen from "./src/screens/GenreAnimeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { WebNavbar } from "./src/components/WebNavbar";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

const isWeb = Platform.OS === "web";

if (isWeb) {
  const doc = (globalThis as any).document;
  if (doc) {
    const style = doc.createElement("style");
    style.type = "text/css";
    style.appendChild(
      doc.createTextNode(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
        body, input, select, textarea, button {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .r-fontFamily-1qd0xha {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .web-navbar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 1000 !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03) !important;
          transition: background-color 0.3s ease, border-color 0.3s ease !important;
        }
        .web-search-pill {
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
        }
        .web-card-hover {
          transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .web-card-hover:hover {
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18) !important;
        }
        .web-genre-tag-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .web-genre-tag-hover:hover {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06) !important;
          opacity: 0.95 !important;
        }
      `)
    );
    doc.head.appendChild(style);
  }
}

// Helper: extract active leaf route name from nested nav state
const getActiveRouteName = (state: NavigationState | undefined): string => {
  if (!state || state.index === undefined) return "HomeTab";
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
};

// Bottom Navbar khusus untuk Mode Mobile (Elegan)
const ElegantTabBar = ({ state, descriptors, navigation }: any) => {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Kembalikan kotak kosong jika layer mode WebNavbar sedang mengudara di PC/Desktop
  if (width >= 768) return <View style={{ height: 0 }} />;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.sidebar,
          borderTopColor: colors.border,
          paddingBottom: (Platform.OS === "ios" ? 12 : 6) + insets.bottom,
          height: 64 + insets.bottom,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (route.name === "ProfileTab" && !isAuthenticated) {
              navigation.navigate("Login");
            } else {
              navigation.navigate(route.name, route.params);
            }
          }
        };

        const getIconName = (routeName: string, focused: boolean) => {
          switch (routeName) {
            case "HomeTab":
              return focused ? "film" : "film-outline";
            case "MyListTab":
              return focused ? "bookmark" : "bookmark-outline";
            case "ProfileTab":
              if (!isAuthenticated) return focused ? "log-in" : "log-in-outline";
              return focused ? "person" : "person-outline";
            default:
              return "help-circle-outline";
          }
        };

        const getLabel = (routeName: string) => {
          switch (routeName) {
            case "HomeTab":
              return "Home";
            case "MyListTab":
              return "My List";
            case "ProfileTab":
              return isAuthenticated ? "Profile" : "Login";
            default:
              return "";
          }
        };

        const iconName = getIconName(route.name, isFocused);
        const label = getLabel(route.name);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrap,
                isFocused && {
                  backgroundColor: isDark
                    ? "rgba(255,71,87,0.18)"
                    : "rgba(255,71,87,0.12)",
                },
              ]}
            >
              <Ionicons
                name={iconName as any}
                size={22}
                color={isFocused ? colors.accent : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.accent : colors.textSecondary,
                  fontWeight: isFocused ? "bold" : "normal",
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const MainTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <ElegantTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} />
    <Tab.Screen name="MyListTab" component={MyListScreen} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} />
  </Tab.Navigator>
);

// The stack navigator (shared between web/mobile)
const AppNavigator = ({ showOnboarding = false }: { showOnboarding?: boolean }) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName={showOnboarding ? "Onboarding" : "Main"}
  >
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Main" component={MainTabNavigator} />
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{
        presentation: "transparentModal",
        animation: "fade",
      }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{
        presentation: "transparentModal",
        animation: "fade",
      }}
    />
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen name="AnimeList" component={AnimeListScreen} />
    <Stack.Screen name="GenreList" component={GenreListScreen} />
    <Stack.Screen name="GenreAnime" component={GenreAnimeScreen} />
    <Stack.Screen name="Episode" component={EpisodeScreen} />
    <Stack.Screen name="Video" component={VideoScreen} />
  </Stack.Navigator>
);

// Web layout: persistent navbar + content
const WebLayout = () => {
  const { colors } = useTheme();
  const [currentRoute, setCurrentRoute] = useState("HomeTab");
  const [activeRoute, setActiveRoute] = useState("HomeTab");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleNavigate = (name: string) => {
    if (navigationRef.isReady()) {
      if (name === "OngoingList") {
        (navigationRef as any).navigate("AnimeList", { type: "ongoing", title: "Anime Ongoing" });
      } else if (name === "CompletedList") {
        (navigationRef as any).navigate("AnimeList", { type: "completed", title: "Anime Completed" });
      } else if (name === "GenreList" || name === "Login" || name === "Search") {
        (navigationRef as any).navigate(name);
      } else {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main", params: { screen: name } }],
          }),
        );
      }
      setCurrentRoute(name);
    }
  };

  const isNavbarHidden = activeRoute === "Login" || activeRoute === "Register" || activeRoute === "Episode" || activeRoute === "Search";

  return (
    <View style={{ flex: 1, flexDirection: "column", backgroundColor: colors.bg }}>
      {/* Persistent Navbar (hidden on Login, Register & Episode screens) */}
      {isDesktop && !isNavbarHidden && (
        <WebNavbar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Content Area */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            if (navigationRef.isReady()) {
              const state = navigationRef.getRootState();
              setActiveRoute(getActiveRouteName(state));
            }
          }}
          onStateChange={(state) => {
            const name = getActiveRouteName(state as NavigationState);
            setActiveRoute(name);

            if (name === "AnimeList") {
              const params = navigationRef.isReady() ? (navigationRef.getCurrentRoute()?.params as any) : null;
              if (params?.type === "completed") {
                setCurrentRoute("CompletedList");
              } else if (params?.type === "ongoing") {
                setCurrentRoute("OngoingList");
              }
            } else {
              const tabRoutes = ["HomeTab", "MyListTab", "ProfileTab", "GenreList", "CompletedList", "OngoingList"];
              if (tabRoutes.includes(name)) {
                setCurrentRoute(name);
              }
            }
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      </View>
    </View>
  );
};

// Mobile layout: normal NavigationContainer (BurgerMenu inside screens)
const MobileLayout = () => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  React.useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem("@has_seen_onboarding");
        if (hasSeen !== "true") {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Error reading onboarding status:", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator showOnboarding={showOnboarding} />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>{isWeb ? <WebLayout /> : <MobileLayout />}</AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
  },
});
