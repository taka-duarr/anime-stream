import React, { useState } from "react";
import {
  View,
  Platform,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  createNavigationContainerRef,
  NavigationState,
  CommonActions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./src/screens/HomeScreen";
import MyListScreen from "./src/screens/MyListScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EpisodeScreen from "./src/screens/EpisodeScreen";
import VideoScreen from "./src/screens/VideoScreenWebView";
import SearchScreen from "./src/screens/SearchScreen";
import AnimeListScreen from "./src/screens/AnimeListScreen";
import GenreListScreen from "./src/screens/GenreListScreen";
import GenreAnimeScreen from "./src/screens/GenreAnimeScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { WebSidebar } from "./src/components/WebSidebar";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

const isWeb = Platform.OS === "web";

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

  // Kembalikan kotak kosong jika layer mode WebSidebar sedang mengudara di PC/Desktop
  if (width >= 768) return <View style={{ height: 0 }} />;

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: colors.sidebar, borderTopColor: colors.border },
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
            navigation.navigate(route.name, route.params);
          }
        };

        const getIconName = (routeName: string, focused: boolean) => {
          switch (routeName) {
            case "HomeTab":
              return focused ? "film" : "film-outline";
            case "MyListTab":
              return focused ? "bookmark" : "bookmark-outline";
            case "ProfileTab":
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
              return "Profile";
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
                  fontWeight: isFocused ? "700" : "500",
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
const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={MainTabNavigator} />
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen name="AnimeList" component={AnimeListScreen} />
    <Stack.Screen name="GenreList" component={GenreListScreen} />
    <Stack.Screen name="GenreAnime" component={GenreAnimeScreen} />
    <Stack.Screen name="Episode" component={EpisodeScreen} />
    <Stack.Screen name="Video" component={VideoScreen} />
  </Stack.Navigator>
);

// Web layout: persistent sidebar + content
const WebLayout = () => {
  const { colors } = useTheme();
  const [currentRoute, setCurrentRoute] = useState("HomeTab");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleNavigate = (name: string) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main", params: { screen: name } }],
        }),
      );
      setCurrentRoute(name);
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg }}>
      {/* Persistent Sidebar */}
      {isDesktop && (
        <WebSidebar currentRoute={currentRoute} onNavigate={handleNavigate} />
      )}

      {/* Main Content Area */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={(state) => {
            const name = getActiveRouteName(state as NavigationState);
            // Only update if it's a tab-level route (sidebar items)
            const tabRoutes = ["HomeTab", "MyListTab", "ProfileTab"];
            if (tabRoutes.includes(name)) {
              setCurrentRoute(name);
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
const MobileLayout = () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);

export default function App() {
  return (
    <ThemeProvider>{isWeb ? <WebLayout /> : <MobileLayout />}</ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    height: 64,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 12 : 6,
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
