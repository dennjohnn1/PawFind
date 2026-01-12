import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import tw from "twrnc";
import CustomText from "../components/CustomText";

export default function Toast({ visible, message, type = "success", onHide }) {
  // Slide in from top
  const translateY = useRef(new Animated.Value(-100)).current;
  // Pop animation
  const scale = useRef(new Animated.Value(0.8)).current;
  // Fade in
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animation start values
      translateY.setValue(-100);
      scale.setValue(0.8);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => hideToast(), 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onHide && onHide());
  };

  const bgColor = type === "success" ? "#28A745" : "#DC3545";
  const iconName = type === "success" ? "check-circle" : "x-circle";

  return (
    <Animated.View
      style={[
        tw`absolute top-6 left-4 right-4 z-50 p-3 rounded-lg`,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          backgroundColor: bgColor,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
      ]}
    >
      <Feather name={iconName} size={20} color="#fff" style={tw`mr-2`} />
      <View style={{ flex: 1 }}>
        <CustomText weight="Medium" style={tw`text-white text-[12px]`}>
          {message}
        </CustomText>
      </View>
    </Animated.View>
  );
}
