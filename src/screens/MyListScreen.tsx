import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";

const isWeb = Platform.OS === "web";

const MyListScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.sidebar} />

      {/* CONTENT */}
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]}>My List</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Fitur ini sedang dalam pengembangan
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  text: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});

export default MyListScreen;
