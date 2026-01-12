import React, { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Feather } from "@expo/vector-icons";
import CustomText from "../../components/CustomText";
import FeedbackModal from "../../components/FeedbackModal"; // import modal
import { sendEmailVerification } from "firebase/auth";

// Import your logo
const appLogo = require("../../assets/images/app_cover.png");

export default function VerifyEmailScreen({ navigation, route }) {
  const user = route.params.user;
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");

  const showModal = (message, type = "success") => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const checkVerification = async () => {
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        // Email verified, navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      } else {
        showModal("Email not verified yet. Please check your spam.", "error");
      }
    } catch (error) {
      showModal(error.message || "Failed to check verification", "error");
    }
    setChecking(false);
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await sendEmailVerification(user); // ✅ modular SDK
      showModal("Verification email resent. Check your inbox.", "success");
    } catch (error) {
      showModal(
        error.message || "Failed to resend verification email",
        "error"
      );
    }
    setResending(false);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white px-6 justify-center`}>
      {/* --- APP LOGO AT THE TOP --- */}
      <View style={tw`items-center -top-38`}>
        <Image
          source={appLogo}
          style={{
            width: 180,
            height: 180,
            resizeMode: "contain",
          }}
        />
      </View>

      {/* --- EMAIL ICON ABOVE TEXT --- */}
      <View style={tw`items-center -top-30`}>
        <Feather name="mail" size={40} color="#F59549" style={tw`mb-2`} />
        <CustomText weight="SemiBold" style={tw`text-[18px] text-center`}>
          Verify Your Email
        </CustomText>
      </View>

      <CustomText style={tw`text-center text-[13px] text-gray-500 -top-28`}>
        We have sent a verification email to {user.email}. Please verify your
        email before proceeding.
      </CustomText>

      <TouchableOpacity
        style={tw`bg-[#F59549] py-3 rounded-lg w-full mb-3 items-center -top-23`}
        onPress={checkVerification}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <CustomText weight="SemiBold" style={tw`text-white text-[14px]`}>
            I've Verified
          </CustomText>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={tw`bg-gray-100 py-3 rounded-lg w-full items-center -top-23`}
        onPress={resendVerification}
        disabled={resending}
      >
        {resending ? (
          <ActivityIndicator color="#000" />
        ) : (
          <CustomText weight="SemiBold" style={tw`text-[14px]`}>
            Resend Email Verification
          </CustomText>
        )}
      </TouchableOpacity>

      {/* --- Feedback Modal --- */}
      <FeedbackModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
