"use client"

// components/FeedbackModal.js
import { useEffect, useRef } from "react"
import { View, Modal, TouchableOpacity, Animated } from "react-native"
import { Feather } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

export default function FeedbackModal({ visible, type = "success", message, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Reset scale and opacity before starting
      scaleAnim.setValue(0)
      opacityAnim.setValue(0)

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const iconColor = type === "success" ? "#28A745" : "#DC3545"
  const iconName = type === "success" ? "check-circle" : "x-circle"

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={tw`flex-1 bg-black bg-opacity-30 justify-center items-center`}>
        <Animated.View
          style={[
            tw`bg-white p-6 rounded-xl w-4/5 items-center`,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Feather name={iconName} size={38} color={iconColor} style={tw`mb-2`} />
          <CustomText weight="Regular" style={tw`text-[13px] text-center mb-4`}>
            {message}
          </CustomText>
          <TouchableOpacity style={tw`bg-black px-6 py-2 rounded-lg`} onPress={onClose}>
            <CustomText weight="SemiBold" style={tw`text-white text-center w-[40] text-base`}>
              OK
            </CustomText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}
