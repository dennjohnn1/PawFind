"use client";

import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import tw from "twrnc";
import CustomText from "./CustomText";
import CustomInput from "./CustomInput";

const { width, height } = Dimensions.get("window");

export default function LocationPicker({
  value,
  onChange,
  label,
  placeholder,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  
  const [locationData, setLocationData] = useState({
    address: value || "",
    coordinates: null,
  });

  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const mapRef = useRef(null);
  const markerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      getUserLocation();
    }
  }, [modalVisible]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      // Fetch address for current location
      fetchAddress(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log("Error getting location:", error);
    }
  };

  const fetchAddress = async (lat, lon) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "PawFind",
          },
        }
      );

      const data = await response.json();

      setLocationData({
        address: data?.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`,
        coordinates: {
          latitude: lat,
          longitude: lon,
        },
      });
    } catch (error) {
      console.log("Reverse geocoding error:", error);
      setLocationData({
        address: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`,
        coordinates: {
          latitude: lat,
          longitude: lon,
        },
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const onRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    fetchAddress(newRegion.latitude, newRegion.longitude);
  };

  const handleConfirm = () => {
    // Pass the complete location data object
    onChange(locationData);
    setModalVisible(false);
  };

  const handleAddressChange = (text) => {
    setLocationData(prev => ({
      ...prev,
      address: text,
    }));
  };

  // Helper function to display address in the input field
  const displayValue = () => {
    if (typeof value === 'string') {
      return value; // For backward compatibility
    }
    if (value && value.address) {
      return value.address;
    }
    return "";
  };

  return (
    <View style={tw`mb-4`}>
      <CustomText weight="SemiBold" style={tw`mb-2 text-gray-700`}>
        {label}
      </CustomText>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={tw`flex-row items-center border border-orange-200 rounded-2xl px-4 py-4`}
      >
        <View
          style={tw`w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3`}
        >
          <Ionicons name="location" size={18} color="#F59549" />
        </View>
        <View style={tw`flex-1`}>
          <CustomText
            style={tw`${displayValue() ? "text-gray-900" : "text-gray-400"} text-[13px]`}
            numberOfLines={2}
          >
            {displayValue() || placeholder || "Tap to select location"}
          </CustomText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={tw`flex-1 bg-white`}>
          {/* Map */}
          <View style={tw`flex-1 relative`}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={region}
              onRegionChangeComplete={onRegionChangeComplete}
              onMapReady={() => console.log("Map loaded")}
              onError={(e) => console.log("Map error:", e)}
              loadingEnabled={true}
            />

            {/* Close button */}
            <View style={tw`absolute top-6 left-5 z-50`}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={tw`bg-white w-12 h-12 rounded-full items-center justify-center shadow-lg`}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Center pin */}
            <View
              style={tw`absolute top-1/2 left-1/2 -mt-10 -ml-5`}
              pointerEvents="none"
            >
              <Animated.View
                style={{ transform: [{ translateY: markerAnim }] }}
              >
                <View style={tw`items-center`}>
                  <View style={tw`bg-gray-900 px-3 py-1.5 rounded-lg mb-1`}>
                    <CustomText
                      weight="Bold"
                      style={tw`text-white text-[10px]`}
                    >
                      PIN LOCATION
                    </CustomText>
                  </View>
                  <Ionicons name="location" size={40} color="#F59549" />
                  <View
                    style={tw`w-2 h-2 rounded-full bg-black/20 mt-[-4px]`}
                  />
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Bottom sheet */}
          <View
            style={tw`bg-white rounded-t-[32px] mt-[-32px] px-6 pt-8 pb-10 shadow-2xl`}
          >
            <View
              style={tw`w-12 h-1.5 bg-gray-100 rounded-full self-center mb-4`}
            />

            <View style={tw`flex-row items-start mb-4`}>
              <View
                style={tw`w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center mr-4`}
              >
                {isReverseGeocoding ? (
                  <ActivityIndicator color="#F59549" />
                ) : (
                  <Ionicons name="create-outline" size={22} color="#F59549" />
                )}
              </View>

              <View style={tw`flex-1`}>
                <CustomText
                  weight="Bold"
                  style={tw`text-gray-900 text-lg mb-1`}
                >
                  Location details
                </CustomText>
                <CustomText style={tw`text-gray-500 text-sm mb-2`}>
                  Edit the location if the address isn't exact
                </CustomText>

                <CustomInput
                  value={locationData.address}
                  onChangeText={handleAddressChange}
                  multiline
                  placeholder="Add landmarks or nearby places"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleConfirm}
              style={tw`bg-orange-500 py-4.5 rounded-2xl items-center shadow-lg shadow-orange-300`}
            >
              <CustomText weight="Bold" style={tw`text-white text-sm`}>
                Confirm Location
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}