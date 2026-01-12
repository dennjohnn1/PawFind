import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import CustomText from "../../components/CustomText";
import authService from "../../service/AuthService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const actions = [
  {
    id: "register",
    title: "Register My Pet",
    description: "Create certificates & microchip records",
    iconSet: MaterialCommunityIcons,
    iconName: "paw-print",
    color: "#10B981",
  },
  {
    id: "report",
    title: "Report Pet",
    description: "Find lost pets or report found animals",
    iconSet: Ionicons,
    iconName: "alert-circle-outline",
    color: "#EF4444",
  },
  {
    id: "explore",
    title: "Just Explore",
    description: "Browse community reports & safety info",
    iconSet: Feather,
    iconName: "compass",
    color: "#F59E0B",
  },
];

export default function OnboardingActionScreen({ navigation }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Simplified animations
  const cardScaleAnims = useRef(actions.map(() => new Animated.Value(0.95))).current;
  const cardFadeAnims = useRef(actions.map(() => new Animated.Value(0))).current;
  const titleScaleAnim = useRef(new Animated.Value(0.95)).current;

  const auth = getAuth();

  useEffect(() => {
    // Simplified entrance animations
    Animated.parallel([
      Animated.stagger(150, [
        ...actions.map((_, index) =>
          Animated.parallel([
            Animated.spring(cardScaleAnims[index], {
              toValue: 1,
              tension: 120,
              friction: 6,
              useNativeDriver: true,
            }),
            Animated.timing(cardFadeAnims[index], {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      Animated.spring(titleScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAction = async (action) => {
    setSelectedAction(action);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      navigation.navigate("SignUp", { action });
      return;
    }

    setLoading(false);
    if (action === "register") {
      navigation.navigate("Main", { screen: "PetScreen" });
    } else if (action === "report") {
      navigation.navigate("ReportScreen");
    } else if (action === "explore") {
      markOnboardingComplete();
      navigation.navigate("Main", { screen: "HomeScreen" });
    }
  };

  const markOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
    } catch (error) {
      console.log("Error marking onboarding complete:", error);
    }
  };

  const CompactActionCard = ({ iconSet: IconSet, iconName, title, description, onPress, disabled, index }) => (
    <Animated.View
      style={[
        tw`bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 overflow-hidden`,
        {
          transform: [{ scale: cardScaleAnims[index] }],
          opacity: cardFadeAnims[index],
        },
      ]}
    >
      <TouchableOpacity
        style={tw`flex-1`}
        onPress={() => !disabled && onPress()}
        activeOpacity={0.9}
        disabled={disabled}
      >
        <View style={tw`flex-row items-start`}>
          {/* Compact Icon */}
          <View
            style={[
              tw`w-12 h-12 rounded-xl items-center justify-center mr-4 mt-1 flex-shrink-0`,
              { backgroundColor: actions[index].color + "15" },
            ]}
          >
            <IconSet name={iconName} size={24} color={actions[index].color} />
          </View>

          {/* Compact Content */}
          <View style={tw`flex-1 pt-1`}>
            <CustomText weight="Bold" style={tw`text-lg text-gray-900 mb-1`}>
              {title}
            </CustomText>
            <CustomText style={tw`text-gray-600 text-sm leading-5 flex-shrink-1`} numberOfLines={2}>
              {description}
            </CustomText>
          </View>
        </View>

        {selectedAction === actions[index].id && !loading && (
          <View style={tw`absolute top-4 right-4 w-6 h-6 bg-green-500 rounded-full items-center justify-center`}>
            <Ionicons name="checkmark-sharp" size={14} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={tw`flex-1 bg-gradient-to-b from-orange-50 to-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={tw`flex-1`}>
        {/* Compact Header - HomeScreen style */}
        <View style={tw`px-5 pt-4 pb-6 items-center`}>
          <View style={tw`w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl items-center justify-center shadow-md mb-4`}>
            <MaterialCommunityIcons name="paw" size={24} color="white" />
          </View>

          <Animated.View style={{ transform: [{ scale: titleScaleAnim }] }}>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 text-center mb-1`}>
              What's next?
            </CustomText>
            <CustomText style={tw`text-gray-600 text-base text-center`}>Choose your action</CustomText>
          </Animated.View>
        </View>

        {/* Compact Action Cards - No Scroll needed */}
        <View style={tw`flex-1 px-5 pb-8 justify-center`}>
          {actions.map((action, index) => (
            <CompactActionCard
              key={action.id}
              {...action}
              onPress={() => handleAction(action)}
              disabled={loading}
              index={index}
            />
          ))}
        </View>

        {/* Sign In Button - HomeScreen style */}
        <View style={tw`px-5 pb-6`}>
          <TouchableOpacity
            style={tw`flex-row items-center justify-center py-3 px-4 bg-gray-50 rounded-xl border border-gray-200`}
            onPress={() => {
              markOnboardingComplete();
              navigation.navigate("SignIn", {});
            }}
            activeOpacity={0.7}
          >
            <Feather name="log-in" size={18} color="#F59E0B" style={tw`mr-2`} />
            <CustomText style={tw`text-orange-600 text-base font-semibold`}>
              Already have an account? Sign In
            </CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Compact Loading Overlay */}
      {loading && (
        <View style={tw`absolute inset-0 z-50 items-center justify-center bg-white/95 px-6`}>
          <View style={tw`w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl items-center justify-center shadow-lg mb-4`}>
            <MaterialCommunityIcons name="paw" size={22} color="white" />
          </View>
          <CustomText weight="Bold" style={tw`text-lg text-gray-900 mb-1 text-center`}>
            Getting ready...
          </CustomText>
          <CustomText style={tw`text-gray-600 text-sm text-center`}>
            Preparing your {selectedAction?.title || "experience"}
          </CustomText>
        </View>
      )}
    </View>
  );
}
