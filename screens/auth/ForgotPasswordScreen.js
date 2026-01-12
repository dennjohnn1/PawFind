import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import Toast from "../../components/Toast";

// Firebase
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const appLogo = require("../../assets/images/app_cover.png");

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleResetPassword = async () => {
    if (!email) {
      showToast("Please enter your email.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast("Please enter a valid email.");
      return;
    }

    setIsLoading(true);
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset email sent!", "success");
    } catch (error) {
      showToast(error.message || "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={tw`flex-1 justify-center px-6`}
          keyboardShouldPersistTaps="handled"
        >
          {/* App Logo */}
          <View style={tw`items-center mb-6`}>
            <Image
              source={appLogo}
              style={{ width: 180, height: 180, resizeMode: "contain" }}
            />
          </View>

          {/* Main Content */}
          <View style={tw`flex-1 justify-center -top-28`}>
            <CustomText weight="SemiBold" style={tw`text-[22px] mb-2`}>
              Forgot Password
            </CustomText>
            <CustomText style={tw`text-[13px] mb-4 text-gray-500`}>
              Enter your email to receive password reset instructions.
            </CustomText>

            <CustomInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              iconLeft="email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={tw`bg-[#F59549] py-3 rounded-lg mt-4 items-center`}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size={25} color="#fff" />
              ) : (
                <CustomText weight="SemiBold" style={tw`text-white text-[15px]`}>
                  Reset Password
                </CustomText>
              )}
            </TouchableOpacity>

            <View style={tw`mt-4 flex-row justify-center`}>
              <CustomText style={tw`mr-1 text-[13px]`}>
                Remembered your password?
              </CustomText>
              <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                <CustomText weight="SemiBold" style={tw`text-black text-[13px]`}>
                  Sign In
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast */}
          <Toast
            visible={toastVisible}
            message={toastMessage}
            type={toastType}
            onHide={() => setToastVisible(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
