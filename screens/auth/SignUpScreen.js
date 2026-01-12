import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Feather } from "@expo/vector-icons";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import LocationInputField from "../../components/LocationInputField";
import Toast from "../../components/Toast";

import authService from "../../service/AuthService";

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [phone, setPhone] = useState("");
  const [locationData, setLocationData] = useState({
    street: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    address: "",
    coordinates: null,
  });

  // Step 3
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const [prevStep, setPrevStep] = useState(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Toast States
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (prevStep === step) return;

    const direction = step > prevStep ? 1 : -1;
    translateX.setValue(50 * direction);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();

    setPrevStep(step);
  }, [step]);

  const handleNext = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Step 1 Validation
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        showToast("Please fill in all fields.");
        setIsLoading(false);
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        showToast("Please enter a valid email.");
        setIsLoading(false);
        return;
      }
    }

    // Step 2 Validation
    if (step === 2) {
      if (!phone.trim() || !locationData.address) {
        showToast("Please provide phone and location.");
        setIsLoading(false);
        return;
      }

      // Validate phone number format (basic check)
      if (phone.trim().length < 10) {
        showToast("Please enter a valid phone number.");
        setIsLoading(false);
        return;
      }
    }

    // Step 3 Validation + Sign Up
    if (step === 3) {
      if (!password || !confirmPassword) {
        showToast("Please fill in both password fields.");
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters.");
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        showToast("Passwords do not match.");
        setIsLoading(false);
        return;
      }

      try {
        // Prepare location data with proper structure
        const locationDetails = {
          street: locationData.street || "",
          barangay: locationData.barangay || "",
          city: locationData.city || "",
          province: locationData.province || "",
          postalCode: locationData.postalCode || "",
          address: locationData.address || "",
          coordinates: locationData.coordinates || {
            latitude: 0,
            longitude: 0,
          },
        };

        const userCredential = await authService.signUp(
          email.trim(),
          password,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
          },
          locationDetails
        );

        if (!userCredential.success) {
          throw new Error(userCredential.error);
        }

        showToast("Account created! Please verify your email.", "success");

        setTimeout(() => {
          navigation.navigate("VerifyEmail", { user: userCredential.user });
        }, 1200);
      } catch (error) {
        console.error("Sign up error:", error);
        showToast(error.message || "Sign up failed");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Move to next step
    setStep(step + 1);
    setIsLoading(false);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const Stepper = () => (
    <View style={{ flexDirection: "row", width: "40%", marginBottom: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 8,
            marginRight: i < 3 ? 6 : 0,
            borderRadius: 4,
            backgroundColor: step >= i ? "#000" : "#D9D9D9",
          }}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1 px-6 justify-center`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={{ opacity, transform: [{ translateX }] }}>
          {/* Steps */}
          {step === 1 && (
            <>
              <Stepper />
              <CustomText weight="SemiBold" style={tw`text-[22px]`}>
                Let's get started!
              </CustomText>
              <CustomText style={tw`text-[13px] mb-3 text-gray-500`}>
                Enter your basic details
              </CustomText>

              <CustomInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                iconLeft="person"
              />
              <CustomInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                iconLeft="person"
              />
              <CustomInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                iconLeft="email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          {step === 2 && (
            <>
              <Stepper />
              <CustomText weight="SemiBold" style={tw`text-[22px]`}>
                Almost there!
              </CustomText>
              <CustomText style={tw`text-[13px] mb-3 text-gray-500`}>
                Provide your contact and location info.
              </CustomText>

              <CustomInput
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                iconLeft="phone"
                keyboardType="phone-pad"
              />

              <LocationInputField
                value={locationData.address}
                coordinates={locationData.coordinates}
                onLocationChange={(data) => setLocationData(data)}
                error={!locationData.address && "Location is required"}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Stepper />
              <CustomText weight="SemiBold" style={tw`text-[22px]`}>
                Secure your account!
              </CustomText>
              <CustomText style={tw`text-[12px] mb-3 text-gray-500`}>
                Set up a strong password.
              </CustomText>

              <CustomInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                iconLeft="lock"
                iconRight="eye"
              />

              <View style={tw`flex-row items-center mb-2`}>
                <Feather name="info" size={14} color="#F59549" style={tw`mr-1`} />
                <CustomText style={tw`text-[11px] text-gray-500`}>
                  Minimum 6 characters required
                </CustomText>
              </View>

              <CustomInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                iconLeft="lock"
                iconRight="eye"
              />
            </>
          )}
        </Animated.View>

        {/* Navigation Buttons */}
        {step === 1 ? (
          <TouchableOpacity
            style={tw`bg-[#F59549] py-3 rounded-lg mt-4 items-center`}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size={25} color="#fff" />
            ) : (
              <CustomText weight="SemiBold" style={tw`text-white text-[15px]`}>
                Next
              </CustomText>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[tw`flex-row mt-4`, { width: "100%" }]}>
            <TouchableOpacity
              style={[
                tw`flex justify-center items-center`,
                {
                  flex: 0.2,
                  backgroundColor: "#F4F4F4",
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginRight: 10,
                },
              ]}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Feather name="arrow-left" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex justify-center items-center`,
                {
                  flex: 0.8,
                  backgroundColor: "#F59549",
                  paddingVertical: 12,
                  borderRadius: 12,
                },
              ]}
              onPress={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size={25} color="#fff" />
              ) : (
                <CustomText weight="SemiBold" style={tw`text-white text-[15px]`}>
                  {step === 3 ? "Sign Up" : "Next"}
                </CustomText>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`mt-4 flex-row justify-center`}>
          <CustomText style={tw`mr-1 text-[13px]`}>
            Already have an account?
          </CustomText>
          <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
            <CustomText weight="SemiBold" style={tw`text-black text-[13px]`}>
              Sign In
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