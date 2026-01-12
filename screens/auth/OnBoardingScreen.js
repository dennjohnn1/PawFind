import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import CustomText from "../../components/CustomText";
import { useAuth } from "../../context/AuthContext";

const appLogo = require("../../assets/images/app_cover.png");
const { width } = Dimensions.get("window");

const slides = [
  {
    id: 1,
    title: "Welcome to PawFind",
    description: "Your trusted platform for pet safety and community",
    iconSet: MaterialCommunityIcons,
    iconName: "paw",
  },
  {
    id: 2,
    title: "Register & Protect",
    description: "Create official pet registration with certificates",
    iconSet: Ionicons,
    iconName: "document-text-outline",
  },
  {
    id: 3,
    title: "Find Lost Pets",
    description: "Report lost or found pets in your community",
    iconSet: Ionicons,
    iconName: "search-outline",
  },
  {
    id: 4,
    title: "AI-Powered Matching",
    description: "Smart matching helps reunite pets with owners",
    iconSet: MaterialCommunityIcons,
    iconName: "robot-outline",
  },
];

export default function OnBoardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Loading animation refs
  const pawScaleAnim = useRef(new Animated.Value(0)).current;
  const pawRotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { completeOnboarding } = useAuth();

  useEffect(() => {
    checkIfOnboardingCompleted();
  }, []);

  useEffect(() => {
    if (showLoading) {
      startLoadingAnimation();
    }
  }, [showLoading]);

  const startLoadingAnimation = () => {
    // Reset animations
    pawScaleAnim.setValue(0);
    pawRotateAnim.setValue(0);
    bounceAnim.setValue(0);
    fadeAnim.setValue(1);

    // Paw bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pawScaleAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pawRotateAnim, {
            toValue: 0.1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(pawScaleAnim, {
          toValue: 0.9,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pawRotateAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Background bounce
    Animated.loop(
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  };

  const checkIfOnboardingCompleted = async () => {
    try {
      const completed = await AsyncStorage.getItem("onboardingCompleted");
      if (completed === "true") {
        navigation.replace("Main");
      }
    } catch (error) {
      console.log("Error checking onboarding:", error);
    }
  };

  const handleFinishOnboarding = async () => {
    setShowLoading(true);
    // Show loading animation for 2 seconds before completing
    setTimeout(async () => {
      await completeOnboarding();
      navigation.navigate("OnBoardingAction");
    }, 2000);
  };

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentSlide + 1),
        animated: true,
      });
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setCurrentSlide(slideIndex);
  };

  const skipOnboarding = async () => {
    setShowLoading(true);
    // Show loading animation for 2 seconds before completing
    setTimeout(async () => {
      await completeOnboarding();
      navigation.navigate("OnBoardingAction");
    }, 2000);
  };

  // Loading Overlay Component
  const LoadingOverlay = () => (
    <Animated.View
      style={[
        tw`absolute inset-0 z-50 items-center justify-center bg-white`,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Animated Background Dots */}
      <Animated.View
        style={{
          transform: [
            {
              scale: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              }),
            },
          ],
        }}
      >
        <View style={tw`absolute top-20 left-20 w-4 h-4 bg-orange-400 rounded-full opacity-60`} />
        <View style={tw`absolute top-10 left-40 w-3 h-3 bg-pink-400 rounded-full opacity-60`} />
        <View style={tw`absolute bottom-20 right-20 w-4 h-4 bg-yellow-400 rounded-full opacity-60`} />
        <View style={tw`absolute bottom-10 right-40 w-3 h-3 bg-purple-400 rounded-full opacity-60`} />
      </Animated.View>

      {/* Main Paw Loading Animation */}
      <Animated.View
        style={[
          tw`items-center`,
          {
            transform: [
              {
                scale: pawScaleAnim,
              },
              {
                rotate: pawRotateAnim.interpolate({
                  inputRange: [0, 0.1],
                  outputRange: ['0deg', '10deg'],
                }),
              },
            ],
          },
        ]}
      >
        {/* Paw Print */}
        <View style={tw`w-24 h-24 items-center justify-center`}>
          {/* Paw pad */}
          <View style={tw`w-12 h-12 bg-orange-400 rounded-full shadow-lg items-center justify-center mb-2`}>
            <View style={tw`w-3 h-3 bg-white rounded-full shadow-sm`} />
          </View>
          {/* Toes */}
          <View style={tw`flex-row justify-between w-16`}>
            <View style={tw`w-4 h-4 bg-orange-400 rounded-full shadow-sm`} />
            <View style={tw`w-4 h-4 bg-pink-500 rounded-full shadow-sm`} />
            <View style={tw`w-4 h-4 bg-orange-400 rounded-full shadow-sm`} />
            <View style={tw`w-4 h-4 bg-pink-500 rounded-full shadow-sm`} />
          </View>
        </View>
      </Animated.View>

      {/* Loading Text with bounce */}
      <Animated.View
        style={{
          transform: [
            {
              translateY: bounceAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -5, 0],
              }),
            },
          ],
        }}
      >
        <CustomText weight="Bold" style={tw`text-xl text-gray-700 mt-6 mb-2`}>
          Welcome to PawFind!
        </CustomText>
        <CustomText style={tw`text-gray-500 text-sm`}>
          Getting things ready for you
        </CustomText>
      </Animated.View>

      {/* Subtle pulse dots */}
      <View style={tw`flex-row mt-8`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              tw`w-3 h-3 bg-orange-400 rounded-full mx-1`,
              {
                opacity: bounceAnim.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: i === 0 ? [1, 0.3, 0.3, 1] : 
                                i === 1 ? [0.3, 1, 0.3, 0.3] :
                                [0.3, 0.3, 1, 0.3],
                }),
                transform: [{
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 0.33, 0.66, 1],
                    outputRange: i === 0 ? [1, 0.8, 0.8, 1] : 
                                  i === 1 ? [0.8, 1, 0.8, 0.8] :
                                  [0.8, 0.8, 1, 0.8],
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );

  const Slide = ({ item }) => {
    const Icon = item.iconSet;

    return (
      <View
        style={{
          width,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View style={tw`w-24 h-24 mb-8 items-center justify-center`}>
          <View style={tw`bg-orange-100 p-5 rounded-full`}>
            <Icon name={item.iconName} size={48} color="#F59549" />
          </View>
        </View>

        <CustomText weight="SemiBold" style={tw`text-2xl text-center mb-4`}>
          {item.title}
        </CustomText>

        <CustomText style={tw`text-gray-600 text-center text-[14px]`}>
          {item.description}
        </CustomText>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {showLoading && <LoadingOverlay />}
      
      {/* Header Logo */}
      <View style={tw`items-center m--5`}>
        <Image
          source={appLogo}
          style={{ width: 180, height: 180, resizeMode: "contain" }}
        />
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={tw`flex-1`}
      >
        {slides.map((slide) => (
          <Slide key={slide.id} item={slide} />
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      <View style={tw`flex-row justify-center mb-6`}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              tw`w-2 h-2 rounded-full mx-1`,
              index === currentSlide
                ? tw`bg-black w-8`
                : tw`bg-gray-300`,
            ]}
          />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={tw`px-6 pb-6`}>
        <TouchableOpacity
          style={tw`bg-[#F59549] py-4 rounded-lg mb-3 items-center`}
          onPress={handleNextSlide}
        >
          <CustomText weight="SemiBold" style={tw`text-white text-[15px]`}>
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity onPress={skipOnboarding}>
          <CustomText style={tw`text-center text-gray-600 text-[14px]`}>
            Skip
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}