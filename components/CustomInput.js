import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import CustomText from "./CustomText";
import { Feather, MaterialIcons } from "@expo/vector-icons";

/**
 * CustomInput with persistent active styling and optional icons
 * Props:
 *  - label: optional label (above input)
 *  - placeholder, value, onChangeText
 *  - iconLeft: name of left icon (MaterialIcons)
 *  - iconRight: "eye" for password toggle
 *  - secureTextEntry: boolean
 *  - style: additional TextInput style
 */
export default function CustomInput({
  label,
  placeholder,
  value,
  onChangeText,
  iconLeft,
  iconRight,
  secureTextEntry = false,
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Active if focused OR has text
  const isActive = focused || (value && value.length > 0);

  const contentColor = isActive ? "#000" : "#ACACAC";
  const borderColor = isActive ? "#F59549" : "#ACACAC";

  return (
    <View style={{ marginVertical: 8 }}>
      {label && (
        <CustomText weight="SemiBold" style={{ marginBottom: 4 }}>
          {label}
        </CustomText>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 12,
          paddingHorizontal: 14,
        }}
      >
        {iconLeft && (
          <MaterialIcons
            name={iconLeft}
            size={18}
            color={contentColor}
            style={{ marginRight: 8 }}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#ACACAC"
          secureTextEntry={secureTextEntry && !passwordVisible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            {
              flex: 1,
              fontFamily: "Poppins",
              fontSize: 12,
              color: contentColor,
              paddingVertical: 15,
            },
            style,
          ]}
          {...props}
        />

        {iconRight === "eye" && secureTextEntry && (
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Feather
              name={passwordVisible ? "eye" : "eye-off"}
              size={18}
              color={contentColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
