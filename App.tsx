import React, { useEffect, useState, useRef } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MenuProvider } from "react-native-popup-menu";
import {
  View,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AuthProvider, useAuth } from "./src/firebase/AuthContext";
import TabNavigator from "./src/navigation/TabNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import { theme } from "./src/styles/theme";
import Toast from "react-native-toast-message";
import "react-native-reanimated";
import { TermsScreen } from "./src/screens/TermsScreen";
import { useCurrentUser } from "./src/hooks/useCurrentUser";
import LoadingScreen from "./src/components/LoadingScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import mobileAds from "react-native-google-mobile-ads";

const { height } = Dimensions.get("window");

// Set up notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Terms: undefined;
  Loading: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const FIRST_OPEN_KEY = "@app_first_open";

interface RankedText {
  id: number;
  y: Animated.Value;
  opacity: Animated.Value;
}

const FirstTimeAnimation: React.FC<{ onComplete: () => void }> = ({
  onComplete,
}) => {
  const [texts, setTexts] = useState<RankedText[]>([]);
  const finalTextOpacity = useRef(new Animated.Value(0)).current;
  const finalTextY = useRef(new Animated.Value(height / 2)).current;

  const addText = async (index: number, duration: number) => {
    const newText = {
      id: index,
      y: new Animated.Value(height),
      opacity: new Animated.Value(0),
    };

    setTexts((prev) => [...prev, newText]);

    Animated.timing(newText.y, {
      toValue: -height,
      duration: duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    Animated.timing(newText.opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });
  };

  useEffect(() => {
    const animate = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      await addText(1, 4000);
      await new Promise<void>((resolve) => setTimeout(resolve, 1300));

      await addText(2, 3500);
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));

      await addText(3, 3000);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      await addText(4, 3000);
      await new Promise<void>((resolve) => setTimeout(resolve, 700));

      await addText(5, 3000);
      await new Promise<void>((resolve) => setTimeout(resolve, 300));

      for (let i = 6; i <= 80; i++) {
        const progress = (i - 6) / (70 - 6);
        const waitTime = 300 * Math.pow(15 / 300, progress);
        const duration = 3000 * Math.pow(200 / 3000, progress);

        await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
        await addText(i, duration);
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      Animated.parallel([
        Animated.timing(finalTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(finalTextY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      onComplete();
    };

    animate();
  }, []);

  return (
    <View style={styles.animationContainer}>
      {texts.map((text) => (
        <Animated.Text
          key={text.id}
          style={[
            styles.rankedText,
            {
              opacity: text.opacity,
              transform: [{ translateY: text.y }],
            },
          ]}
        >
          {text.id}. ranked
        </Animated.Text>
      ))}
      <Animated.Text
        style={[
          styles.finalRankedText,
          {
            opacity: finalTextOpacity,
            transform: [{ translateY: finalTextY }],
            color: "black",
          },
        ]}
      >
        Ranked
      </Animated.Text>
    </View>
  );
};

const AppContent = () => {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { user, loading: userLoading } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);
  const [showFirstAnimation, setShowFirstAnimation] = useState(true);
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        // Initialization complete!
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !userLoading) {
      setIsReady(true);
    }
  }, [authLoading, userLoading]);

  useEffect(() => {
    const checkFirstOpen = async () => {
      try {
        const value = await AsyncStorage.getItem(FIRST_OPEN_KEY);
        if (value !== null) {
          setShowFirstAnimation(false);
        }
      } catch (error) {
        console.error("Error checking first open:", error);
        setShowFirstAnimation(false);
      }
    };
    checkFirstOpen();
  }, []);

  const handleAnimationComplete = async () => {
    setShowFirstAnimation(false);
    try {
      await AsyncStorage.setItem(FIRST_OPEN_KEY, "opened");
    } catch (error) {
      console.error("Error storing first open:", error);
    }
  };

  if (!isReady || authLoading || userLoading) {
    return <LoadingScreen />;
  }

  if (showFirstAnimation) {
    return <FirstTimeAnimation onComplete={handleAnimationComplete} />;
  }

  return (
    <MenuProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={{
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.divider,
            notification: theme.colors.primary,
          },
          dark: false,
        }}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!firebaseUser ? (
            <RootStack.Screen name="Login" component={LoginScreen} />
          ) : !user ? (
            <RootStack.Screen name="Loading" component={LoadingScreen} />
          ) : !user.acceptedTerms ? (
            <RootStack.Screen name="Terms" component={TermsScreen} />
          ) : (
            <RootStack.Screen name="Main" component={TabNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </MenuProvider>
  );
};

const styles = StyleSheet.create({
  animationContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  rankedText: {
    position: "absolute",
    fontSize: 24,
    fontFamily: theme.fonts.default,
    color: theme.colors.text,
    fontWeight: "500",
    alignSelf: "center",
  },
  finalRankedText: {
    position: "absolute",
    fontSize: 48,
    fontFamily: theme.fonts.default,
    fontWeight: "bold",
    alignSelf: "center",
    top: height / 2 - 24,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppContent />
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
