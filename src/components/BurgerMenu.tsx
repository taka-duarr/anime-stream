import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { CommonActions } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(width * 0.78, 290);

// BurgerMenu only appears on mobile — web uses WebSidebar
if (Platform.OS === "web") {
  // On web: export a no-op component
  // (each screen conditionally hides it anyway via isWeb check)
}

const MENU_ITEMS = [
  {
    name: "HomeTab",
    iconActive: "film" as const,
    iconInactive: "film-outline" as const,
    label: "Server 1",
  },
  {
    name: "HomeScreen2",
    iconActive: "play-circle" as const,
    iconInactive: "play-circle-outline" as const,
    label: "Server 2",
  },
  {
    name: "MyListTab",
    iconActive: "bookmark" as const,
    iconInactive: "bookmark-outline" as const,
    label: "My List",
  },
  {
    name: "ProfileTab",
    iconActive: "person" as const,
    iconInactive: "person-outline" as const,
    label: "Profile",
  },
];

interface BurgerMenuProps {
  navigation: any;
  currentRouteName: string;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  navigation,
  currentRouteName,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const open = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        bounciness: 4,
        speed: 14,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -DRAWER_WIDTH,
        bounciness: 0,
        speed: 18,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  const navigate = (name: string) => {
    close();
    setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main", params: { screen: name } }],
        })
      );
    }, 220);
  };

  return (
    <>
      {/* ☰ Burger Button */}
      <TouchableOpacity
        onPress={open}
        style={[styles.burgerBtn, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}
        activeOpacity={0.7}
      >
        <Ionicons name="menu-outline" size={26} color={colors.accent} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: colors.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Side Panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.sidebar,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Panel Header */}
          <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.appName, { color: colors.text }]}>MyDrama</Text>
              <Text style={[styles.appTagline, { color: colors.textMuted }]}>
                Nonton drama kapan saja
              </Text>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => {
              const active = currentRouteName === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.menuItem,
                    active && { backgroundColor: isDark ? "#2C2C2C" : "#F5F0F0" },
                  ]}
                  onPress={() => navigate(item.name)}
                  activeOpacity={0.75}
                >
                  {active && (
                    <View style={[styles.activeBar, { backgroundColor: colors.accent }]} />
                  )}
                  <View style={[styles.menuIconBox, { backgroundColor: active ? colors.accent : (isDark ? "#2A2A2A" : "#EEE") }]}>
                    <Ionicons
                      name={active ? item.iconActive : item.iconInactive}
                      size={18}
                      color={active ? "#FFF" : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.menuLabel, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? "700" : "500" }]}>
                    {item.label}
                  </Text>
                  {active && (
                    <View style={[styles.activeChip, { backgroundColor: colors.accent }]}>
                      <Text style={styles.activeChipText}>Aktif</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Theme Toggle */}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.themeToggle, { borderTopColor: colors.border, borderTopWidth: 1 }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.themeText, { color: colors.textSecondary }]}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={[styles.panelFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              MyDrama v1.0 · by taka
            </Text>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  appTagline: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  menuList: {
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    position: "relative",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
  },
  activeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeChipText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  themeText: {
    fontSize: 13,
  },
  panelFooter: {
    borderTopWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
  },
});
