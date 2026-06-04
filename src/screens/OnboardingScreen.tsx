import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";

interface OnboardingScreenProps {
  navigation: any;
}

interface SlideItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.prototype.placeholder | string;
  gradientColors: [string, string];
}

const slides: SlideItem[] = [
  {
    id: "1",
    title: "Tonton Anime",
    description: "Tonton anime dengan mudah dimana saja kapan saja",
    icon: "play-circle-outline",
    gradientColors: ["#FF4757", "#E63333"],
  },
  {
    id: "2",
    title: "Update Tercepat",
    description: "Temukan anime terbaru dan terlengkap dengan cepat dan mudah",
    icon: "flash-outline",
    gradientColors: ["#3B82F6", "#1D4ED8"],
  },
  {
    id: "3",
    title: "Simpan Favorit",
    description: "Simpan daftar anime favoritmu untuk ditonton kembali nanti",
    icon: "bookmark-outline",
    gradientColors: ["#10B981", "#047857"],
  },
  {
    id: "4",
    title: "Siap Menonton",
    description: "Mulai petualangan streaming animemu sekarang juga!",
    icon: "rocket-outline",
    gradientColors: ["#8B5CF6", "#6D28D9"],
  },
];

// Floating Animation Container
const FloatingContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = () => {
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]).start(() => float());
    };
    float();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // Custom anims for background transitions
  const bgFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bgFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@has_seen_onboarding", "true");
      navigation.replace("Main");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      navigation.replace("Main");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: SlideItem }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.artworkContainer}>
          <FloatingContainer>
            <View style={styles.glowOuter}>
              <LinearGradient
                colors={[item.gradientColors[0] + "40", "transparent"]}
                style={styles.glowBg}
              />
              <LinearGradient
                colors={item.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name={item.icon as any} size={70} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </FloatingContainer>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Lewati
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.accent : colors.border,
                    width: isActive ? 24 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionBtnWrap}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              currentIndex === slides.length - 1
                ? [colors.accent, colors.accentDark || colors.accent]
                : [colors.card, colors.bgSecondary]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.actionButton,
              currentIndex !== slides.length - 1 && {
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                {
                  color:
                    currentIndex === slides.length - 1
                      ? "#FFFFFF"
                      : colors.text,
                },
              ]}
            >
              {currentIndex === slides.length - 1 ? "Mulai Sekarang" : "Lanjut"}
            </Text>
            <Ionicons
              name={
                currentIndex === slides.length - 1
                  ? "rocket-sharp"
                  : "arrow-forward-sharp"
              }
              size={18}
              color={
                currentIndex === slides.length - 1 ? "#FFFFFF" : colors.text
              }
              style={styles.actionButtonIcon}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 20 : 10,
    right: 24,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  artworkContainer: {
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  glowOuter: {
    justifyContent: "center",
    alignItems: "center",
    width: 200,
    height: 200,
  },
  glowBg: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  textContainer: {
    height: "25%",
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  bottomContainer: {
    height: "25%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actionBtnWrap: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  actionButton: {
    flexDirection: "row",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonIcon: {
    marginLeft: 8,
  },
});

export default OnboardingScreen;
