import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import AsyncStorage from "@react-native-async-storage/async-storage";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import Toast from "../../components/Toast";
import AuthService from "../../service/AuthService";

const appLogo = require("../../assets/images/app_cover.png");

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Toast States
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  // Load saved credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("email");
        const savedPassword = await AsyncStorage.getItem("password");
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");

        if (savedRememberMe === "true") {
          setEmail(savedEmail || "");
          setPassword(savedPassword || "");
          setRememberMe(true);
        }
      } catch (error) {
        console.log("Failed to load credentials:", error);
      }
    };

    loadCredentials();
  }, []);

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (!email || !password) {
      showToast("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await AuthService.signIn(email, password);

      if (!response.success) {
        // Handle email not verified case
        if (response.needsVerification) {
          showToast("Please verify your email first.", "error");
          setTimeout(() => {
            navigation.navigate("VerifyEmail", { user: response.user });
          }, 1000);
          setIsLoading(false);
          return;
        }

        showToast(response.error, "error");
        setIsLoading(false);
        return;
      }

      // Remember Me logic
      if (rememberMe) {
        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("password", password);
        await AsyncStorage.setItem("rememberMe", "true");
      } else {
        await AsyncStorage.removeItem("email");
        await AsyncStorage.removeItem("password");
        await AsyncStorage.setItem("rememberMe", "false");
      }

      showToast("Login successful!", "success");

      setTimeout(() => {
        navigation.navigate("Main", { screen: "Home" });
      }, 800);
    } catch (error) {
      showToast(error.message || "Login failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1 px-6`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={tw`items-center mb-8`}>
          <Image
            source={appLogo}
            style={{ width: 180, height: 180, resizeMode: "contain" }}
          />
        </View>

        <CustomText weight="SemiBold" style={tw`text-[22px] text-left`}>
          Sign In
        </CustomText>
        <CustomText style={tw`text-left text-[13px] mb-2 text-gray-500`}>
          Enter your email and password
        </CustomText>

        <CustomInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          iconLeft="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <CustomInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          iconLeft="lock"
          iconRight="eye"
        />

        {/* Remember Me */}
        <View style={tw`flex-row items-center justify-between -mt-1`}>
          <View style={tw`flex-row items-center`}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: "#ccc", true: "#F59549" }}
              thumbColor="#fff"
            />
            <CustomText style={tw`ml-2 text-[12px]`}>Remember Me</CustomText>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <CustomText style={tw`text-[12px] text-right`}>Forgot Password?</CustomText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={tw`bg-[#F59549] py-3 rounded-lg mt-2 items-center`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size={25} color="#fff" />
          ) : (
            <CustomText weight="SemiBold" style={tw`text-white text-[15px]`}>
              Sign In
            </CustomText>
          )}
        </TouchableOpacity>

        <View style={tw`mt-4 flex-row justify-center`}>
          <CustomText style={tw`mr-1 text-[13px]`}>
            Don't have an account?
          </CustomText>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <CustomText weight="SemiBold" style={tw`text-black text-[13px]`}>
              Sign Up
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}