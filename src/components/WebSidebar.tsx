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

const SIDEBAR_WIDTH = 220;

const MENU_ITEMS = [
  {
    name: "HomeTab",
    iconActive: "film" as const,
    iconInactive: "film-outline" as const,
    label: "Home",
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
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.sidebar,
          borderRightColor: colors.border,
        },
      ]}
    >
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoOne} // Style khusus logo 1
            contentFit="contain"
          />
          <Image
            source={require("../../assets/logo2.png")}
            style={styles.logoTwo} // Style khusus logo 2
            contentFit="contain"
          />
        </View>
      </View>

      {/* Menu Label */}
      <Text style={[styles.menuLabel, { color: colors.textMuted }]}>Menu</Text>

      {/* Menu Items */}
      <View style={styles.menuList}>
        {MENU_ITEMS.map((item) => {
          const active = currentRoute === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.menuItem,
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
                style={styles.menuIcon}
              />
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
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom: Theme Toggle + Profile */}
      <View
        style={[styles.sidebarBottom, { borderTopColor: colors.border }]}
      >
        {/* Theme Toggle */}
        <TouchableOpacity
          style={styles.bottomItem}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={colors.textSecondary}
            style={styles.menuIcon}
          />
          <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
            {isDark ? "Light Mode" : "Dark Mode"}
          </Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={[styles.profileItem, { borderTopColor: colors.border }]}
          onPress={() => onNavigate("ProfileTab")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.profileAvatar,
              { backgroundColor: isDark ? "#2C2C2C" : "#EEE" },
            ]}
          >
            <Ionicons name="person" size={16} color={colors.accent} />
          </View>
          <Text
            style={[
              styles.menuItemText,
              { color: currentRoute === "ProfileTab" ? colors.text : colors.textSecondary },
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const SIDEBAR_W = SIDEBAR_WIDTH;

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    paddingTop: 24,
    paddingBottom: 0,
    // Full height via flex stretch (parent is flexDirection: row with flex: 1)
  },
  
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    // alignItems: 'center', // Aktifkan ini jika ingin semua logo di tengah sidebar
  },
  logoContainer: {
    flexDirection: "row",    // Berjejer ke samping
    alignItems: "center",    // Sejajar secara vertikal (tengah)
    // justifyContent: "space-between", // Aktifkan jika ingin logo 1 di kiri & logo 2 di kanan
  },
  logoOne: {
    width: 40,               // Atur lebar logo pertama
    height: 40,              // Atur tinggi logo pertama
    marginRight: 12,         // Jarak spesifik ke logo kedua
    // opacity: 0.9,         // Contoh pengaturan tambahan
  },
  logoTwo: {
    width: 100,              // Logo kedua bisa lebih lebar (misal: tulisan merk)
    height: 35,              // Tinggi bisa berbeda
    borderRadius: 4,         // Jika ingin ada sedikit lengkungan
    // marginTop: 5,         // Geser sedikit ke bawah jika tidak sejajar
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
    borderRadius: 0,
  },
  menuIcon: {
    marginRight: 12,
    width: 20,
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
