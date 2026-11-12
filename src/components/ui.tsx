import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const isWeb = Platform.OS === "web";
// Native driver is not available on web; using it there only logs warnings.
export const NATIVE_DRIVER = !isWeb;

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// ------------------------------------------------------------------
// Glass: translucent panel. On web it blurs what is behind it; on native
// (no blur library installed) it falls back to a denser translucent fill.
// ------------------------------------------------------------------
export const glassWebStyle = (blur = 28): any =>
  isWeb
    ? {
        backdropFilter: `blur(${blur}px) saturate(150%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(150%)`,
      }
    : null;

export const Glass: React.FC<{
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  blur?: number;
  radius?: number;
  children?: React.ReactNode;
  onLayout?: any;
}> = ({ style, strong, blur = 28, radius = 24, children, onLayout }) => {
  const { colors } = useTheme();
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: strong || !isWeb ? colors.glassStrong : colors.glass,
          borderColor: colors.glassBorder,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderRadius: radius,
          overflow: "hidden",
        },
        glassWebStyle(blur),
        style,
      ]}
    >
      {children}
    </View>
  );
};

// ------------------------------------------------------------------
// FadeIn: fade + rise entrance. Use `delay` to stagger siblings.
// ------------------------------------------------------------------
export const FadeIn: React.FC<{
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  trigger?: any; // re-run the entrance when this value changes
}> = ({ delay = 0, distance = 18, duration = 620, style, children, trigger }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [trigger]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ------------------------------------------------------------------
// Lift: pressable that springs on hover (web) and press (everywhere).
// ------------------------------------------------------------------
export const Lift: React.FC<{
  onPress?: () => void;
  onHoverIn?: () => void;
  style?: StyleProp<ViewStyle>;
  hoverScale?: number;
  pressScale?: number;
  lift?: number;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}> = ({
  onPress,
  onHoverIn,
  style,
  hoverScale = 1.035,
  pressScale = 0.97,
  lift = 4,
  children,
  accessibilityLabel,
  disabled,
}) => {
  const v = useRef(new Animated.Value(0)).current; // -1 pressed, 0 rest, 1 hovered
  const to = (toValue: number) =>
    Animated.spring(v, {
      toValue,
      useNativeDriver: NATIVE_DRIVER,
      speed: 22,
      bounciness: 6,
    }).start();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => to(-1)}
      onPressOut={() => to(0)}
      {...({
        onHoverIn: () => {
          to(1);
          onHoverIn?.();
        },
        onHoverOut: () => to(0),
      } as any)}
      style={style}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [
            { scale: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [pressScale, 1, hoverScale] }) },
            { translateY: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, -lift] }) },
          ],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ------------------------------------------------------------------
// StatusPill: "Ongoing" / "Completed" chips.
// ------------------------------------------------------------------
export const StatusPill: React.FC<{
  kind: "ongoing" | "completed";
  label?: string;
  small?: boolean;
  onDark?: boolean; // force dark-surface colors (e.g. on top of artwork)
}> = ({ kind, label, small, onDark }) => {
  const { colors } = useTheme();
  const dark = {
    ongoingBg: "rgba(214,190,96,0.32)",
    ongoingText: "#F1E3A0",
    completeBg: "rgba(92,184,122,0.32)",
    completeText: "#B4EEC8",
  };
  const c = onDark ? dark : colors;
  const bg = kind === "ongoing" ? c.ongoingBg : c.completeBg;
  const fg = kind === "ongoing" ? c.ongoingText : c.completeText;
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: small ? 9 : 12,
        paddingVertical: small ? 3 : 5,
        borderRadius: 999,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: fg, fontSize: small ? 11 : 12.5, fontWeight: "600" }}>
        {label || (kind === "ongoing" ? "Ongoing" : "Completed")}
      </Text>
    </View>
  );
};

export const Rating: React.FC<{ score?: string | number; size?: number; color?: string }> = ({
  score,
  size = 14,
  color,
}) => {
  const { colors } = useTheme();
  if (!score) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name="star" size={size} color={colors.star} />
      <Text style={{ color: color || colors.text, fontSize: size + 1, fontWeight: "700" }}>{score}</Text>
    </View>
  );
};

// ------------------------------------------------------------------
// Shimmer: pulsing placeholder block for loading states.
// ------------------------------------------------------------------
export const Shimmer: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.9, duration: 800, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0.35, duration: 800, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ backgroundColor: colors.glass, borderRadius: 16, opacity: v }, style]} />;
};

// ------------------------------------------------------------------
// Web-only CSS keyframe animations (react-native-web needs longhand props;
// the `animation` shorthand is rejected). Spread into a style: `webAnim.float`.
// On native these are null and the element simply stays still.
// ------------------------------------------------------------------
const anim = (
  keyframes: Record<string, any>,
  duration: string,
  timing: string,
  iteration: string | number = 1,
  direction = "normal",
): any =>
  isWeb
    ? {
        animationKeyframes: keyframes,
        animationDuration: duration,
        animationTimingFunction: timing,
        animationIterationCount: iteration,
        animationDirection: direction,
        animationFillMode: "both",
      }
    : null;

export const webAnim = {
  kenburns: anim(
    { "0%": { transform: "scale(1.06) translate3d(0,0,0)" }, "100%": { transform: "scale(1.16) translate3d(-1.5%,-1.5%,0)" } },
    "16s",
    "ease-in-out",
    "infinite",
    "alternate",
  ),
  float: anim(
    {
      "0%": { transform: "translateY(0px) rotate(-2.5deg)" },
      "50%": { transform: "translateY(-10px) rotate(-1.5deg)" },
      "100%": { transform: "translateY(0px) rotate(-2.5deg)" },
    },
    "7s",
    "ease-in-out",
    "infinite",
  ),
  pop: anim(
    { "0%": { opacity: 0, transform: "translateY(26px) scale(0.96)" }, "100%": { opacity: 1, transform: "translateY(0px) scale(1)" } },
    "0.55s",
    "cubic-bezier(0.16, 1, 0.3, 1)",
  ),
  fade: anim({ "0%": { opacity: 0 }, "100%": { opacity: 1 } }, "0.3s", "ease"),
};
