import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import CustomText from "./CustomText";
import GeoapifyService from "../service/GeoapifyLocationService";

export default function LocationInputField({
  value,
  coordinates,
  onLocationChange,
  error,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = focused || query.length > 0;
  const borderColor = error ? "#dc2626" : isActive ? "#F59549" : "#ACACAC";
  const contentColor = isActive ? "#000" : "#ACACAC";

  const handleSearch = async (text) => {
    setQuery(text);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await GeoapifyService.searchLocations(text);
      if (res.success) {
        setResults(res.results);
      } else {
        console.error("[LocationInput] Search error:", res.error);
        Alert.alert(
          "Error",
          res.error || "Unable to fetch locations. Please try again."
        );
        setResults([]);
      }
    } catch (err) {
      console.error("[LocationInput] Unexpected error:", err);
      Alert.alert(
        "Network error",
        "Unable to fetch locations. Please try again."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location) => {
    onLocationChange({
      address: location.name || "",
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      street: location.street || "",
      barangay: location.barangay || "",
      city: location.city || "",
      province: location.province || "",
      postalCode: location.postalCode || "",
    });

    setQuery(location.name);
    setModalVisible(false);
  };

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Input Box */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 16,
        }}
      >
        <MaterialIcons
          name="location-on"
          size={18}
          color={contentColor}
          style={{ marginRight: 8 }}
        />

        <CustomText
          style={{
            flex: 1,
            fontSize: 12,
            color: query ? "#000" : "#ACACAC",
            fontFamily: "Poppins",
          }}
        >
          {query || "Select Location"}
        </CustomText>

        <MaterialIcons
          name="keyboard-arrow-right"
          size={20}
          color="#ACACAC"
        />
      </TouchableOpacity>

      {/* Modal Search */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              width: "92%",
              maxHeight: 400,
              borderRadius: 16,
              padding: 16,
            }}
          >
            {/* Search Input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isActive ? "#F59549" : "#ACACAC",
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 10,
              }}
            >
              <MaterialIcons
                name="search"
                size={18}
                color={contentColor}
                style={{ marginRight: 8 }}
              />

              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Search street, barangay, or city..."
                placeholderTextColor="#ACACAC"
                autoFocus
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  flex: 1,
                  fontFamily: "Poppins",
                  fontSize: 12,
                  paddingVertical: 14,
                }}
              />
            </View>

            {loading && (
              <ActivityIndicator
                size="small"
                color="#F59549"
                style={{ marginBottom: 8 }}
              />
            )}

            {!loading && results.length === 0 && query.length >= 2 && (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <MaterialIcons name="error-outline" size={22} color="#888" />
                <CustomText style={{ marginTop: 6, color: "#888" }}>
                  No locations found
                </CustomText>
                <CustomText style={{ color: "#B0B0B0", fontSize: 11 }}>
                  Try searching street, barangay, or city
                </CustomText>
              </View>
            )}

            {results.length > 0 && (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 260 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#E5E7EB",
                    }}
                  >
                    <CustomText>{item.name}</CustomText>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={{
                backgroundColor: "#ddd",
                borderRadius: 10,
                paddingVertical: 10,
                marginTop: 12,
              }}
              onPress={() => setModalVisible(false)}
            >
              <CustomText style={{ textAlign: "center" }}>Cancel</CustomText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
