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

const MENU_ITEMS = [
  {
    name: "HomeTab",
    label: "Home",
  },
  {
    name: "OngoingList",
    label: "Ongoing",
  },
  {
    name: "CompletedList",
    label: "Completed",
  },
  {
    name: "GenreList",
    label: "Genre",
  },
  {
    name: "MyListTab",
    label: "My List",
  },
];

interface WebNavbarProps {
  currentRoute: string;
  onNavigate: (name: string) => void;
}

export const WebNavbar: React.FC<WebNavbarProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, profilePicture } = useAuth();

  return (
    <View
      {...({ className: "web-navbar" } as any)}
      style={[
        styles.navbar,
        {
          backgroundColor: isDark ? "rgba(32, 32, 32, 0.9)" : "rgba(255, 255, 255, 0.75)",
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* 1. Left Section: Logo & Brand Name */}
      <TouchableOpacity
        style={styles.logoSection}
        onPress={() => onNavigate("HomeTab")}
        activeOpacity={0.7}
      >
        <Image
          source={isDark ? require("../../assets/logogelap.png") : require("../../assets/logo.png")}
          style={styles.logoOne as any}
          contentFit="contain"
        />
        <Image
          source={require("../../assets/nganime.png")}
          style={styles.logoTwo as any}
          contentFit="contain"
        />
      </TouchableOpacity>

      {/* 2. Search Pill (Now next to logo brand) */}
      <TouchableOpacity
        {...({ className: "web-search-pill" } as any)}
        style={[
          styles.searchPill,
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
          },
        ]}
        onPress={() => onNavigate("Search")}
        activeOpacity={0.75}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <Text style={[styles.searchText, { color: colors.textMuted }]}>
          Search anime...
        </Text>
      </TouchableOpacity>

      {/* 3. Middle/Right Section: Navigation Menu Items (aligned to the right) */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item) => {
          const active = currentRoute === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.menuItem}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: active ? colors.text : colors.textSecondary,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {item.label}
              </Text>

              {/* Bottom active indicator */}
              {active && (
                <View
                  style={[styles.activeBar, { backgroundColor: colors.accent }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vertical Divider separating menus from controls */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* 4. Far Right Section: Theme Toggle & Profile / Login Button */}
      <View style={styles.rightSection}>
        {/* Theme Toggle Mode */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.searchBg }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Profile / Login */}
        {isAuthenticated ? (
          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                borderColor: currentRoute === "ProfileTab" ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onNavigate("ProfileTab")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: isDark ? "#2C2C2C" : "#EEE" },
              ]}
            >
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.avatarImage as any}
                  contentFit="cover"
                />
              ) : (
                <Ionicons
                  name="person"
                  size={18}
                  color={colors.accent}
                />
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.loginBtn, { borderColor: colors.accent }]}
            onPress={() => onNavigate("Login")}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginBtnText, { color: colors.accent }]}>
              Login
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    zIndex: 10,
    ...Platform.select({
      web: {
        position: "fixed" as any,
        top: 0,
        left: 0,
        right: 0,
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
        backdropFilter: "blur(5px)",
        webkitBackdropFilter: "blur(5px)",
      } as any,
    }),
  } as any,
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  logoOne: {
    width: 48,
    height: 48,
  },
  logoTwo: {
    width: 110,
    height: 38,
    marginTop: 2,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    width: 200,
    marginLeft: 16,
    ...Platform.select({
      web: {
        backdropFilter: "blur(0px)",
        webkitBackdropFilter: "blur(0px)",
      } as any,
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchText: {
    fontSize: 13.5,
  },
  menuContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    height: "100%",
    justifyContent: "flex-end",
    flex: 1,
    marginRight: 16,
  },
  menuItem: {
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
    height: "100%",
  },
  menuItemText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  activeBar: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 3.5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  loginBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
