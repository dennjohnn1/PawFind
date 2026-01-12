import React from "react";
import { Text } from "react-native";
import tw from "twrnc";

export default function CustomText({ children, style, weight = "Regular", ...props }) {
  let fontFamily = "Poppins";
  if (weight === "Bold") fontFamily = "Poppins-Bold";
  else if (weight === "SemiBold") fontFamily = "Poppins-SemiBold";
  else if (weight === "Medium") fontFamily = "Poppins-Medium";

  return (
    <Text style={[{ fontFamily }, style]} {...props}>
      {children}
    </Text>
  );
}
