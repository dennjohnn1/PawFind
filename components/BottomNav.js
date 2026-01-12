import React, { useRef, useEffect, memo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, TouchableOpacity, Animated } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import tw from "twrnc";

// SCREENS
import HomeScreen from "../screens/main/HomeScreen";
import PetScreen from "../screens/main/PetScreen";
import ReportScreen from "../screens/main/ReportScreen";
import AISearchScreen from "../screens/main/AISearchScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator();

// ---- Floating Tab Button ----
const FloatingTabButton = memo(({ children, onPress, focused }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        top: -20,
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
      }}
    >
      <Animated.View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#F59549",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 4,
          borderColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 5,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ---- Animated Icon Component ----
const AnimatedTabIcon = memo(({ name, focused, IconComponent = Ionicons, size = 22 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <IconComponent name={name} size={size} color="#000" />
    </Animated.View>
  );
});

export default function BottomNav() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        lazy: true, // only mount screens when they’re accessed
        tabBarStyle: {
          height: 66,
          backgroundColor: "white",
          borderTopWidth: 0,
          elevation: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarIconStyle: { marginTop: 10 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name={focused ? "home" : "home-outline"} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Pets"
        component={PetScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name={focused ? "paw" : "paw-outline"} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarButton: (props) => {
            const focused = props.accessibilityState?.selected ?? false;
            return (
              <FloatingTabButton {...props} focused={focused}>
                <MaterialIcons name="campaign" size={26} color="white" />
              </FloatingTabButton>
            );
          },
        }}
      />

      <Tab.Screen
        name="AI Search"
        component={AISearchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name={focused ? "flash" : "flash-outline"} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name={focused ? "person" : "person-outline"} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
