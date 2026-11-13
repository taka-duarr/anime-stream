import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { EASE_OUT, glassWebStyle, NATIVE_DRIVER } from "./ui";

const MENU_ITEMS = [
  { name: "HomeTab", label: "Home" },
  { name: "OngoingList", label: "Ongoing" },
  { name: "CompletedList", label: "Completed" },
  { name: "GenreList", label: "Genre" },
  { name: "MyListTab", label: "My List" },
];

interface WebNavbarProps {
  currentRoute: string;
  onNavigate: (name: string) => void;
}

// Module-level: survives the navbar unmounting/remounting between pages.
let navbarHasEntered = false;

const hoverable = (base: any, hovered: any) => ({ hovered }: any) => [base, hovered && hovered];

/**
 * Desktop navigation: a floating glass capsule (logo, search, menu, theme, profile).
 */
export const WebNavbar: React.FC<WebNavbarProps> = ({ currentRoute, onNavigate }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, profilePicture } = useAuth();

  // Drop in from the top only the first time the app shows the navbar. It is
  // unmounted on Search/Episode/Login, and replaying the drop-in every time it
  // comes back made it blink on page changes.
  const enter = useRef(new Animated.Value(navbarHasEntered ? 1 : 0)).current;
  useEffect(() => {
    if (navbarHasEntered) return;
    navbarHasEntered = true;
    Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      delay: 150,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, []);

  // Sliding active-tab pill: each menu item reports its own x/width on layout,
  // and the pill springs to whichever one is active. Layout props (left/width)
  // can't use the native driver, but this is one small element so it's cheap.
  const itemLayouts = useRef<Record<string, { x: number; width: number }>>({}).current;
  const itemRefs = useRef<Record<string, any>>({}).current;
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const pillReady = useRef(false);

  // On web, read the live position from the DOM. onLayout only fires when an
  // item's own size changes, so when the web font loads and the items before it
  // grow, an item's x shifts without any event and a cached x would be stale.
  const measure = (name: string) => {
    const el = itemRefs[name];
    if (el && typeof el.offsetLeft === "number" && el.offsetWidth > 0) {
      return { x: el.offsetLeft, width: el.offsetWidth };
    }
    return itemLayouts[name];
  };

  const movePillTo = (name: string) => {
    const l = measure(name);
    if (!l) return;
    if (!pillReady.current) {
      // First measurement: snap in place instead of sliding in from the corner.
      pillX.setValue(l.x);
      pillW.setValue(l.width);
      pillReady.current = true;
      return;
    }
    Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
    Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
  };

  const routeRef = useRef(currentRoute);
  routeRef.current = currentRoute;

  useEffect(() => {
    movePillTo(currentRoute);
  }, [currentRoute]);

  // Web fonts change text widths after first paint; re-place the pill once they're in.
  useEffect(() => {
    const fonts = (globalThis as any).document?.fonts;
    fonts?.ready?.then(() => movePillTo(routeRef.current));
  }, []);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.navbar,
          { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
          glassWebStyle(30),
        ]}
      >
        {/* Logo */}
        <Pressable style={styles.logoSection} onPress={() => onNavigate("HomeTab")} accessibilityLabel="Home">
          <Image
            source={isDark ? require("../../assets/logogelap.png") : require("../../assets/logo.png")}
            style={styles.logoOne as any}
            contentFit="contain"
          />
          <Image source={require("../../assets/nganime.png")} style={styles.logoTwo as any} contentFit="contain" />
        </Pressable>

        {/* Search pill */}
        <Pressable
          style={hoverable(
            [styles.searchPill, { backgroundColor: colors.searchBg }],
            { backgroundColor: colors.glassHover },
          )}
          onPress={() => onNavigate("Search")}
          accessibilityLabel="Search anime"
        >
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.searchText, { color: colors.textMuted }]}>Search anime...</Text>
        </Pressable>

        {/* Menu */}
        <View style={styles.menuContainer} onLayout={() => movePillTo(routeRef.current)}>
          {/* Pill that slides and resizes to sit behind whichever item is active */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePill,
              {
                backgroundColor: colors.glassHover,
                borderColor: colors.glassBorder,
                left: pillX,
                width: pillW,
                opacity: pillW.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
              },
            ]}
          />
          {MENU_ITEMS.map((item) => {
            const active = currentRoute === item.name;
            return (
              <Pressable
                key={item.name}
                onPress={() => onNavigate(item.name)}
                ref={(el: any) => {
                  itemRefs[item.name] = el;
                }}
                onLayout={(e) => {
                  itemLayouts[item.name] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
                  // Any item resizing can shift the active one, so always re-place the pill
                  movePillTo(currentRoute);
                }}
                style={hoverable([styles.menuItem], !active && { backgroundColor: colors.glass })}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    { color: active ? colors.text : colors.textSecondary, fontWeight: active ? "700" : "500" },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Theme toggle */}
        <Pressable
          style={hoverable(
            [styles.iconButton, { backgroundColor: colors.searchBg }],
            { backgroundColor: colors.glassHover },
          )}
          onPress={toggleTheme}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={colors.text} />
        </Pressable>

        {/* Profile / Login */}
        {isAuthenticated ? (
          <Pressable
            style={[
              styles.profileButton,
              { borderColor: currentRoute === "ProfileTab" ? colors.accent : colors.glassBorder },
            ]}
            onPress={() => onNavigate("ProfileTab")}
            accessibilityLabel="Profile"
          >
            <View style={[styles.avatarContainer, { backgroundColor: colors.searchBg }]}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage as any} contentFit="cover" />
              ) : (
                <Ionicons name="person" size={16} color={colors.text} />
              )}
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={hoverable(
              [styles.loginBtn, { backgroundColor: colors.buttonPrimaryBg }],
              { opacity: 0.86 },
            )}
            onPress={() => onNavigate("Login")}
          >
            <Text style={[styles.loginBtnText, { color: colors.buttonPrimaryText }]}>Login</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    zIndex: 1000,
    alignItems: "center",
    paddingHorizontal: 24,
    ...Platform.select({
      web: { position: "fixed" as any, top: 14, left: 0, right: 0 } as any,
    }),
  } as any,
  navbar: {
    height: 56,
    width: "100%",
    maxWidth: 1480,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 9,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: "0 10px 40px rgba(0,0,0,0.22)" } as any,
    }),
  } as any,
  logoSection: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoOne: { width: 44, height: 30 },
  logoTwo: { width: 92, height: 24, marginTop: 2 },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    width: 220,
    marginLeft: 10,
    ...Platform.select({ web: { transition: "background-color 0.2s ease", cursor: "pointer" } as any }),
  } as any,
  searchText: { fontSize: 13.5 },
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    gap: 2,
    marginRight: 6,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  menuItem: {
    justifyContent: "center",
    paddingHorizontal: 15,
    zIndex: 1,
    height: 38,
    borderRadius: 19,
    ...Platform.select({ web: { transition: "background-color 0.2s ease", cursor: "pointer" } as any }),
  } as any,
  menuItemText: { fontSize: 13.5, letterSpacing: 0.1 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ web: { transition: "background-color 0.2s ease" } as any }),
  } as any,
  profileButton: { borderRadius: 20, borderWidth: 1.5, padding: 2 },
  avatarContainer: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  loginBtn: {
    paddingHorizontal: 20,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({ web: { transition: "opacity 0.2s ease" } as any }),
  } as any,
  loginBtnText: { fontSize: 13.5, fontWeight: "700" },
});
