import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { EASE_OUT, NATIVE_DRIVER } from "./ui";

/**
 * Opening logo animation, shown once per app launch on top of everything.
 * Sequence: glow ring blooms -> winged "N" mark springs in -> wordmark rises ->
 * progress hairline sweeps -> the whole curtain zooms forward and dissolves.
 */
export const SplashIntro: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [gone, setGone] = useState(false);
  const mark = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(ring, { toValue: 1, duration: 1100, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(mark, { toValue: 1, speed: 5, bounciness: 9, useNativeDriver: NATIVE_DRIVER }),
        Animated.sequence([
          Animated.delay(380),
          Animated.timing(word, { toValue: 1, duration: 600, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(line, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIVE_DRIVER }),
        ]),
      ]),
      Animated.delay(160),
      Animated.timing(exit, { toValue: 1, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE_DRIVER }),
    ]).start(() => {
      setGone(true);
      onDone?.();
    });
  }, []);

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFill,
        styles.curtain,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
        },
      ]}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.55, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.3] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.halo,
          { opacity: mark.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) },
        ]}
      />

      {/* Logo mark */}
      <Animated.View
        style={{
          opacity: mark.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
            { translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        }}
      >
        <Image source={require("../../assets/logogelap.png")} style={styles.mark} contentFit="contain" />
      </Animated.View>

      {/* Wordmark */}
      <Animated.View
        style={{
          marginTop: 14,
          opacity: word,
          transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <Image source={require("../../assets/nganime.png")} style={styles.word} contentFit="contain" />
      </Animated.View>

      {/* Progress hairline */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { transform: [{ translateX: line.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] }) }] },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  curtain: {
    backgroundColor: "#0B0C0E",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "#EC2B55",
  },
  halo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(236,43,85,0.16)",
  },
  mark: { width: 190, height: 90 },
  word: { width: 170, height: 38 },
  track: {
    marginTop: 30,
    width: 140,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  fill: { width: 140, height: 2, backgroundColor: "#EC2B55" },
});
