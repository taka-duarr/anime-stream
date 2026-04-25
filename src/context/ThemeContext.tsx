import React, { createContext, useContext, useState, ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  sidebar: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDark: string;
  border: string;
  searchBg: string;
  tabBg: string;
  overlay: string;
}

export const DARK_COLORS: ThemeColors = {
  bg: "#121212",
  bgSecondary: "#1A1A1A",
  sidebar: "#202020",
  card: "#2A2A2A",
  text: "#FFFFFF",
  textSecondary: "#A8A8A8",
  textMuted: "#585858",
  accent: "#E63333",
  accentDark: "#B82222",
  border: "#333333",
  searchBg: "#2A2A2A",
  tabBg: "#2A2A2A",
  overlay: "rgba(0,0,0,0.7)",
};

export const LIGHT_COLORS: ThemeColors = {
  bg: "#F0F0F0",
  bgSecondary: "#E8E8E8",
  sidebar: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#555555",
  textMuted: "#999999",
  accent: "#E63333",
  accentDark: "#B82222",
  border: "#E0E0E0",
  searchBg: "#F5F5F5",
  tabBg: "#EEEEEE",
  overlay: "rgba(0,0,0,0.5)",
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  colors: DARK_COLORS,
  toggleTheme: () => {},
  isDark: true,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const toggleTheme = () =>
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  const colors = mode === "dark" ? DARK_COLORS : LIGHT_COLORS;
  return (
    <ThemeContext.Provider
      value={{ mode, colors, toggleTheme, isDark: mode === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
