import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const SIDEBAR_WIDTH = 220;
const COLLAPSED_SIDEBAR_WIDTH = 70;

const MENU_ITEMS = [
  {
    name: "HomeTab",
    iconActive: "film" as const,
    iconInactive: "film-outline" as const,
    label: "Home",
  },
  {
    name: "GenreList",
    iconActive: "list" as const,
    iconInactive: "list-outline" as const,
    label: "Genre",
  },
  {
    name: "MyListTab",
    iconActive: "bookmark" as const,
    iconInactive: "bookmark-outline" as const,
    label: "My List",
  },
];

interface WebSidebarProps {
  currentRoute: string;
  onNavigate: (name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  currentRoute,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  const width = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  return (
    <View
      style={[
        styles.sidebar,
        {
          width,
          backgroundColor: colors.sidebar,
          borderRightColor: colors.border,
        },
      ]}
    >
      {/* Logo Section */}
      <View style={[styles.logoSection, isCollapsed && { paddingHorizontal: 0, alignItems: "center" }]}>
        <View style={[styles.logoContainer, isCollapsed && { flexDirection: "column", gap: 12 }]}>
          <Image
            source={require("../../assets/logo.png")}
            style={[styles.logoOne, isCollapsed && { marginRight: 0 }]}
            contentFit="contain"
          />
          {!isCollapsed && (
            <Image
              source={require("../../assets/nganime.png")}
              style={styles.logoTwo}
              contentFit="contain"
            />
          )}

          {/* Toggle Button */}
          <TouchableOpacity
            onPress={onToggleCollapse}
            style={[styles.toggleBtn, isCollapsed && { marginTop: 4 }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isCollapsed ? "chevron-forward-outline" : "chevron-back-outline"}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Label */}
      {!isCollapsed && (
        <Text style={[styles.menuLabel, { color: colors.textMuted }]}>Menu</Text>
      )}

      {/* Menu Items */}
      <View style={styles.menuList}>
        {MENU_ITEMS.map((item) => {
          const active = currentRoute === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.menuItem,
                isCollapsed && { justifyContent: "center" },
                active && { backgroundColor: isDark ? "#2C2C2C" : "#F0F0F0" },
              ]}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.75}
            >
              {/* Left active bar */}
              {active && (
                <View
                  style={[styles.activeBar, { backgroundColor: colors.accent }]}
                />
              )}

              <Ionicons
                name={active ? item.iconActive : item.iconInactive}
                size={18}
                color={active ? colors.text : colors.textSecondary}
                style={[styles.menuIcon, isCollapsed && { marginRight: 0 }]}
              />

              {!isCollapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: active ? colors.text : colors.textSecondary,
                      fontWeight: active ? "600" : "400",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom: Theme Toggle + Profile/Login */}
      <View
        style={[styles.sidebarBottom, { borderTopColor: colors.border }]}
      >
        {/* Theme Toggle */}
        <TouchableOpacity
          style={[styles.bottomItem, isCollapsed && { justifyContent: "center" }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={colors.textSecondary}
            style={[styles.menuIcon, isCollapsed && { marginRight: 0 }]}
          />
          {!isCollapsed && (
            <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Profile / Login */}
        <TouchableOpacity
          style={[styles.profileItem, isCollapsed && { justifyContent: "center" }, { borderTopColor: colors.border }]}
          onPress={() => onNavigate(isAuthenticated ? "ProfileTab" : "Login")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.profileAvatar,
              isCollapsed && { marginRight: 0 },
              { backgroundColor: isDark ? "#2C2C2C" : "#EEE" },
            ]}
          >
            <Ionicons
              name={isAuthenticated ? "person" : "log-in"}
              size={16}
              color={colors.accent}
            />
          </View>
          {!isCollapsed && (
            <Text
              style={[
                styles.menuItemText,
                { color: currentRoute === (isAuthenticated ? "ProfileTab" : "Login") ? colors.text : colors.textSecondary },
              ]}
            >
              {isAuthenticated ? "Profile" : "Login"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const SIDEBAR_W = SIDEBAR_WIDTH;

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    paddingTop: 24,
    paddingBottom: 0,
  },
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoOne: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoTwo: {
    width: 100,
    height: 35,
    borderRadius: 4,
    marginRight: 10,
  },
  toggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  menuList: {},
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    position: "relative",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  menuIcon: {
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  menuItemText: {
    fontSize: 14,
  },
  sidebarBottom: {
    borderTopWidth: 1,
  },
  bottomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
});
