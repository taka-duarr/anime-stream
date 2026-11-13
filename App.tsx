import React, { useState } from "react";
import {
  View,
  Platform,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  createNavigationContainerRef,
  NavigationState,
  CommonActions,
  DarkTheme,
  DefaultTheme,
  Theme,
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
import { SplashIntro } from "./src/components/SplashIntro";
import { glassWebStyle, NATIVE_DRIVER, PageTransition } from "./src/components/ui";

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        html, body { background: #0B0C0E; }
        * { scrollbar-width: thin; scrollbar-color: rgba(140,144,152,0.35) transparent; }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-thumb { background: rgba(140,144,152,0.35); border-radius: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        ::selection { background: rgba(236,43,85,0.45); color: #fff; }
        @keyframes ng-kenburns {
          0% { transform: scale(1.06) translate3d(0, 0, 0); }
          100% { transform: scale(1.16) translate3d(-1.5%, -1.5%, 0); }
        }
        @keyframes ng-float {
          0%, 100% { transform: translateY(0) rotate(-2.5deg); }
          50% { transform: translateY(-10px) rotate(-1.5deg); }
        }
        @keyframes ng-pop {
          0% { opacity: 0; transform: translateY(26px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ng-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
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

// Navigation theme whose background matches the app. Without this React
// Navigation paints its default light-gray (#F2F2F2) behind every screen, which
// flashes through while a screen fades in during a page transition.
const useNavTheme = (): Theme => {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  return React.useMemo(
    () => ({
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.bg, border: colors.border, primary: colors.accent },
    }),
    [isDark, colors.bg],
  );
};

// Helper: extract active leaf route name from nested nav state
const getActiveRouteName = (state: NavigationState | undefined): string => {
  if (!state || state.index === undefined) return "HomeTab";
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
};

// One icon in the floating dock. The shared pill (rendered once by the dock
// itself) slides underneath whichever icon is active; each icon just pops
// slightly larger and swaps color when it becomes the active one.
const DockIcon = ({ name, focused, label, activeFg, idleFg }: any) => {
  const v = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(v, {
      toValue: focused ? 1 : 0,
      useNativeDriver: NATIVE_DRIVER,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [focused]);
  return (
    <View style={styles.dockIconWrap} accessibilityLabel={label}>
      <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
        <Ionicons name={name as any} size={21} color={focused ? activeFg : idleFg} />
      </Animated.View>
    </View>
  );
};

const DOCK_BUTTON_WIDTH = 56;
const DOCK_ITEM_WIDTH = 60; // 56 button + 4 gap
const DOCK_PILL_SIZE = 46;
const DOCK_PAD = 8;

// Bottom Navbar khusus untuk Mode Mobile: dock kaca mengambang
const ElegantTabBar = ({ state, descriptors, navigation }: any) => {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Sliding pill that moves behind the active tab
  const dockIndex = React.useRef(new Animated.Value(state.index)).current;
  React.useEffect(() => {
    Animated.spring(dockIndex, {
      toValue: state.index,
      useNativeDriver: NATIVE_DRIVER,
      speed: 18,
      bounciness: 9,
    }).start();
  }, [state.index]);

  // Kembalikan kotak kosong jika layer mode WebNavbar sedang mengudara di PC/Desktop
  if (width >= 768) return <View style={{ height: 0 }} />;

  return (
    <View style={{ backgroundColor: colors.bg, paddingBottom: 10 + insets.bottom, paddingTop: 8, alignItems: "center" }}>
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.glassStrong,
          borderColor: colors.glassBorder,
        },
        glassWebStyle(24),
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dockPill,
          {
            backgroundColor: colors.buttonPrimaryBg,
            transform: [
              {
                translateX: Animated.add(
                  DOCK_PAD + (DOCK_BUTTON_WIDTH - DOCK_PILL_SIZE) / 2,
                  Animated.multiply(dockIndex, DOCK_ITEM_WIDTH),
                ),
              },
            ],
          },
        ]}
      />
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
              return focused ? "home" : "home-outline";
            case "GenreTab":
              return focused ? "grid" : "grid-outline";
            case "SearchTab":
              return focused ? "search" : "search-outline";
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
            case "GenreTab":
              return "Genre";
            case "SearchTab":
              return "Search";
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

        const isSearchTab = route.name === "SearchTab";

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
            <DockIcon
              name={iconName}
              focused={isFocused}
              label={label}
              activeFg={colors.buttonPrimaryText}
              idleFg={colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
    </View>
  );
};

// Wraps a screen component so every navigation into it (tab switch or stack
// push) replays the same fade + rise transition — see PageTransition in ui.tsx.
const withTransition = (Component: React.ComponentType<any>) => (props: any) => (
  <PageTransition>
    <Component {...props} />
  </PageTransition>
);

const MainTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <ElegantTabBar {...props} />}
    screenOptions={({ theme }: any) => ({ headerShown: false, sceneStyle: { backgroundColor: theme.colors.background } })}
  >
    <Tab.Screen name="HomeTab">{withTransition(HomeScreen)}</Tab.Screen>
    <Tab.Screen name="GenreTab">{withTransition(GenreListScreen)}</Tab.Screen>
    <Tab.Screen name="SearchTab">{withTransition(SearchScreen)}</Tab.Screen>
    <Tab.Screen name="MyListTab">{withTransition(MyListScreen)}</Tab.Screen>
    <Tab.Screen name="ProfileTab">{withTransition(ProfileScreen)}</Tab.Screen>
  </Tab.Navigator>
);

// The stack navigator (shared between web/mobile)
const AppNavigator = ({ showOnboarding = false }: { showOnboarding?: boolean }) => (
  <Stack.Navigator
    screenOptions={({ theme }: any) => ({
      headerShown: false,
      animation: "fade_from_bottom",
      contentStyle: { backgroundColor: theme.colors.background },
    })}
    initialRouteName={showOnboarding ? "Onboarding" : "Main"}
  >
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Main" component={MainTabNavigator} />
    <Stack.Screen
      name="Login"
      options={{
        presentation: "transparentModal",
        animation: "fade",
      }}
    >
      {withTransition(LoginScreen)}
    </Stack.Screen>
    <Stack.Screen
      name="Register"
      options={{
        presentation: "transparentModal",
        animation: "fade",
      }}
    >
      {withTransition(RegisterScreen)}
    </Stack.Screen>
    <Stack.Screen name="Search">{withTransition(SearchScreen)}</Stack.Screen>
    <Stack.Screen name="AnimeList">{withTransition(AnimeListScreen)}</Stack.Screen>
    <Stack.Screen name="GenreList">{withTransition(GenreListScreen)}</Stack.Screen>
    <Stack.Screen name="GenreAnime">{withTransition(GenreAnimeScreen)}</Stack.Screen>
    <Stack.Screen name="Episode">{withTransition(EpisodeScreen)}</Stack.Screen>
    <Stack.Screen name="Video">{withTransition(VideoScreen)}</Stack.Screen>
  </Stack.Navigator>
);

// Web layout: persistent navbar + content
const WebLayout = () => {
  const { colors } = useTheme();
  const navTheme = useNavTheme();
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
          theme={navTheme}
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
              const tabRoutes = ["HomeTab", "GenreTab", "SearchTab", "MyListTab", "ProfileTab", "GenreList", "CompletedList", "OngoingList", "Search"];
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
  const navTheme = useNavTheme();
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
    <NavigationContainer theme={navTheme}>
      <AppNavigator showOnboarding={showOnboarding} />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          {isWeb ? <WebLayout /> : <MobileLayout />}
          <SplashIntro />
        </View>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 32,
    height: 60,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  tabButton: {
    width: 56,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  dockIconWrap: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  dockPill: {
    position: "absolute",
    left: 0,
    top: (60 - 46) / 2,
    width: 46,
    height: 46,
    borderRadius: 23,
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
  searchTabHighlight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 3.5,
  },
});
