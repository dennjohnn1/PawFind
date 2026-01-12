// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import tw from "twrnc";

import { AuthProvider, useAuth } from "./context/AuthContext";

// Screens
import OnBoardingScreen from "./screens/auth/OnBoardingScreen";
import OnBoardingActionScreen from "./screens/auth/OnBoardingActionScreen";
import SignInScreen from "./screens/auth/SignInScreen";
import SignUpScreen from "./screens/auth/SignUpScreen";
import ForgotPasswordScreen from "./screens/auth/ForgotPasswordScreen";
import VerifyEmailScreen from "./screens/auth/VerifyEmailScreen";
import BottomNav from "./components/BottomNav";
import MyReports from "./components/MyReports";
import EditProfileScreen from "./components/EditProfile";
import Settings from "./components/Settings";
import Notifications from "./components/Notifications";
import HelpSupport from "./components/HelpSupport";
import About from "./components/About";
import ReportDetail from "./components/ReportDetail";

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, initializing, hasCompletedOnboarding } = useAuth();
  const [fontsLoaded] = useFonts({
    Poppins: require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
  });

  if (initializing || !fontsLoaded) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <>
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
            <Stack.Screen
              name="OnBoardingAction"
              component={OnBoardingActionScreen}
            />
          </>
        ) : !user ? (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : !user.emailVerified ? (
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
            initialParams={{ user }}
          />
        ) : (
          <>
            {/* MAIN APP */}
            <Stack.Screen name="Main" component={BottomNav} />

            {/* STACK SCREENS ABOVE TABS */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="MyReports" component={MyReports} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="HelpSupport" component={HelpSupport} />
            <Stack.Screen name="About" component={About} />
            <Stack.Screen name="ReportDetail" component={ReportDetail} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
