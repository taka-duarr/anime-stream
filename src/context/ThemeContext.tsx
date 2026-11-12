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
  // Glass design tokens
  glass: string; // translucent panel fill
  glassStrong: string; // denser fill for bars/docks sitting over content
  glassBorder: string; // hairline highlight around glass
  glassHover: string;
  star: string;
  ongoingBg: string;
  ongoingText: string;
  completeBg: string;
  completeText: string;
  buttonPrimaryBg: string; // neutral high-contrast pill button
  buttonPrimaryText: string;
}

export const DARK_COLORS: ThemeColors = {
  bg: "#0B0C0E",
  bgSecondary: "#111317",
  sidebar: "#15171B",
  card: "#1A1C21",
  text: "#F4F5F7",
  textSecondary: "#A9ADB6",
  textMuted: "#6B7079",
  accent: "#EC2B55",
  accentDark: "#C01E43",
  border: "rgba(255,255,255,0.09)",
  searchBg: "rgba(255,255,255,0.07)",
  tabBg: "rgba(255,255,255,0.07)",
  overlay: "rgba(5,6,8,0.72)",
  glass: "rgba(255,255,255,0.065)",
  glassStrong: "rgba(24,26,31,0.74)",
  glassBorder: "rgba(255,255,255,0.13)",
  glassHover: "rgba(255,255,255,0.12)",
  star: "#F5B83D",
  ongoingBg: "rgba(214,190,96,0.26)",
  ongoingText: "#EBDC93",
  completeBg: "rgba(92,184,122,0.26)",
  completeText: "#A5E6BB",
  buttonPrimaryBg: "#FFFFFF",
  buttonPrimaryText: "#0B0C0E",
};

export const LIGHT_COLORS: ThemeColors = {
  bg: "#DCDDDF",
  bgSecondary: "#D0D1D4",
  sidebar: "#ECEDEF",
  card: "#F1F2F3",
  text: "#17181B",
  textSecondary: "#4B4F57",
  textMuted: "#7C8088",
  accent: "#E11D48",
  accentDark: "#BE123C",
  border: "rgba(0,0,0,0.09)",
  searchBg: "rgba(0,0,0,0.06)",
  tabBg: "rgba(0,0,0,0.06)",
  overlay: "rgba(15, 23, 42, 0.4)",
  glass: "rgba(255,255,255,0.5)",
  glassStrong: "rgba(238,239,241,0.8)",
  glassBorder: "rgba(255,255,255,0.85)",
  glassHover: "rgba(255,255,255,0.75)",
  star: "#D99712",
  ongoingBg: "rgba(160,132,24,0.2)",
  ongoingText: "#6E5A0C",
  completeBg: "rgba(34,139,74,0.18)",
  completeText: "#1B6B3A",
  buttonPrimaryBg: "#17181B",
  buttonPrimaryText: "#FFFFFF",
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
