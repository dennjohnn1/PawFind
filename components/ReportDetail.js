"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Linking,
  Share,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import tw from "twrnc";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import Toast from "./Toast";
import CustomText from "./CustomText";
import PetService from "../service/PetService";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseApp } from "../firebase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReportDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { reportId } = route.params || {};

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [userData, setUserData] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  
  const mapRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Initialize Firestore
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
      checkLocationPermission();
    }
  }, [reportId]);

  const checkLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(status === 'granted');
    
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setCurrentUserLocation(location.coords);
    }
  };

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch report from Firebase
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      
      if (!reportDoc.exists()) {
        showToast("Report not found", "error");
        navigation.goBack();
        return;
      }

      const reportData = {
        id: reportDoc.id,
        ...reportDoc.data(),
      };

      setReport(reportData);

      // Fetch reporter's user data
      if (reportData.reporterId) {
        try {
          const userDoc = await getDoc(doc(db, "users", reportData.reporterId));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }

      // Set map region if coordinates exist
      if (reportData.coordinates) {
        setMapRegion({
          latitude: reportData.coordinates.latitude,
          longitude: reportData.coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      } else if (reportData.location && typeof reportData.location === 'string') {
        // Try to geocode the address string
        try {
          const geocoded = await geocodeAddress(reportData.location);
          if (geocoded) {
            setMapRegion({
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        } catch (error) {
          console.error("Error geocoding address:", error);
        }
      }

    } catch (error) {
      console.error("Error fetching report details:", error);
      showToast("Failed to load report details", "error");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
        {
          headers: {
            "User-Agent": "PawFind",
          },
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  };

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Unknown date";
    
    try {
      let date;
      if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleCall = () => {
    if (report?.phone) {
      Linking.openURL(`tel:${report.phone}`);
    } else {
      Alert.alert("No Phone Number", "Phone number is not available for this report.");
    }
  };

  const handleMessage = () => {
    navigation.navigate("Messages", {
      userId: report?.reporterId,
      reportId: report?.id,
      userName: report?.reporterName || userData?.fullName,
    });
  };

  const handleShare = async () => {
    if (!report) return;

    try {
      const shareMessage = `Found a ${report.reportType?.toLowerCase()} pet: ${
        report.petName || "Unknown pet"
      } - ${report.location || "Unknown location"}`;

      const result = await Share.share({
        message: shareMessage,
        title: `${report.reportType === "lost" ? "Lost" : "Found"} Pet Report`,
      });

      if (result.action === Share.sharedAction) {
        showToast("Report shared successfully!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      showToast("Failed to share report", "error");
    }
  };

  const handleOpenInMaps = () => {
    if (!mapRegion) {
      showToast("Location not available", "error");
      return;
    }

    const { latitude, longitude } = mapRegion;
    const url = Platform.select({
      ios: `maps://?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };

  const navigateToDirections = () => {
    if (!mapRegion || !currentUserLocation) {
      showToast("Location data not available", "error");
      return;
    }

    const { latitude: destLat, longitude: destLng } = mapRegion;
    const { latitude: userLat, longitude: userLng } = currentUserLocation;

    const url = Platform.select({
      ios: `maps://?saddr=${userLat},${userLng}&daddr=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}`,
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/dir/${userLat},${userLng}/${destLat},${destLng}`);
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#F59549" />
          <CustomText style={tw`mt-4 text-gray-600`}>
            Loading report details...
          </CustomText>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Ionicons name="alert-circle" size={60} color="#D1D5DB" />
          <CustomText weight="Bold" style={tw`text-gray-900 text-lg mt-4`}>
            Report Not Found
          </CustomText>
          <CustomText style={tw`text-gray-500 text-center mt-2`}>
            The report you're looking for doesn't exist or has been removed.
          </CustomText>
          <TouchableOpacity
            style={tw`mt-6 bg-orange-500 px-6 py-3 rounded-xl`}
            onPress={() => navigation.goBack()}
          >
            <CustomText weight="SemiBold" style={tw`text-white`}>
              Go Back
            </CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const photos = report.photos || (report.petImage ? [report.petImage] : []);
  const hasPhotos = photos.length > 0;
  const isLostReport = report.reportType?.toLowerCase() === "lost";

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 py-4 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        
        <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
          Report Details
        </CustomText>
        
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
          onPress={handleShare}
        >
          <Feather name="share-2" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={tw`absolute top-4 left-5 z-10`}>
          <View style={[
            tw`px-3 py-1.5 rounded-xl flex-row items-center`,
            isLostReport ? tw`bg-red-50 border border-red-100` : tw`bg-green-50 border border-green-100`
          ]}>
            <View style={[
              tw`w-2 h-2 rounded-full mr-1.5`,
              isLostReport ? tw`bg-red-500` : tw`bg-green-500`
            ]} />
            <CustomText
              weight="SemiBold"
              style={tw`text-[11px] uppercase ${isLostReport ? 'text-red-700' : 'text-green-700'}`}
            >
              {report.reportType || "Unknown"}
            </CustomText>
          </View>
        </View>

        {/* Photo Gallery */}
        {hasPhotos ? (
          <View style={tw`relative`}>
            <Image
              source={{ uri: photos[activeImageIndex] }}
              style={tw`w-full h-80`}
              resizeMode="cover"
            />
            
            {photos.length > 1 && (
              <>
                {/* Image Indicator */}
                <View style={tw`absolute bottom-4 left-0 right-0 flex-row justify-center`}>
                  {photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        tw`w-2 h-2 rounded-full mx-1`,
                        activeImageIndex === index ? tw`bg-white` : tw`bg-white/50`
                      ]}
                    />
                  ))}
                </View>

                {/* Navigation Arrows */}
                {activeImageIndex > 0 && (
                  <TouchableOpacity
                    style={tw`absolute left-4 top-1/2 -translate-y-6 w-10 h-10 rounded-full bg-black/50 items-center justify-center`}
                    onPress={() => setActiveImageIndex(prev => prev - 1)}
                  >
                    <Feather name="chevron-left" size={24} color="white" />
                  </TouchableOpacity>
                )}
                
                {activeImageIndex < photos.length - 1 && (
                  <TouchableOpacity
                    style={tw`absolute right-4 top-1/2 -translate-y-6 w-10 h-10 rounded-full bg-black/50 items-center justify-center`}
                    onPress={() => setActiveImageIndex(prev => prev + 1)}
                  >
                    <Feather name="chevron-right" size={24} color="white" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={tw`w-full h-80 bg-gray-100 items-center justify-center`}>
            <Ionicons name="paw-outline" size={60} color="#D1D5DB" />
            <CustomText style={tw`text-gray-400 mt-2`}>
              No photos available
            </CustomText>
          </View>
        )}

        {/* Content */}
        <View style={tw`px-5 pt-6`}>
          {/* Pet Name and Info */}
          <View style={tw`mb-6`}>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              {report.petName || "Unknown Pet"}
            </CustomText>
            <View style={tw`flex-row items-center`}>
              <Feather name="clock" size={12} color="#9CA3AF" />
              <CustomText style={tw`text-[11px] text-gray-500 ml-1`}>
                Reported {formatTimeAgo(report.createdAt || report.date)}
              </CustomText>
            </View>
          </View>

          {/* Reporter Info */}
          <View style={tw`flex-row items-center bg-gray-50 rounded-2xl p-4 mb-6`}>
            <Image
              source={{ uri: userData?.profileImage || "https://i.pravatar.cc/150" }}
              style={tw`w-12 h-12 rounded-full`}
            />
            <View style={tw`ml-3 flex-1`}>
              <CustomText weight="SemiBold" style={tw`text-gray-900`}>
                {report.reporterName || userData?.fullName || "Anonymous"}
              </CustomText>
              <CustomText style={tw`text-gray-500 text-[12px]`}>
                Reporter
              </CustomText>
            </View>
            
            {/* Contact Buttons */}
            <View style={tw`flex-row`}>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-full bg-white items-center justify-center mr-2 border border-gray-200`}
                onPress={handleMessage}
              >
                <Feather name="message-circle" size={18} color="#374151" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-full bg-white items-center justify-center border border-gray-200`}
                onPress={handleCall}
              >
                <Feather name="phone" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Report Details Card */}
          <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6`}>
            <CustomText weight="Bold" style={tw`text-lg text-gray-900 mb-4`}>
              Pet Details
            </CustomText>

            <View style={tw`flex-row flex-wrap mb-3`}>
              {report.species && (
                <View style={tw`bg-white px-3 py-2 rounded-xl mr-2 mb-2 border border-gray-100`}>
                  <CustomText style={tw`text-[12px] text-gray-700`}>
                    {report.species}
                  </CustomText>
                </View>
              )}
              {report.breed && (
                <View style={tw`bg-white px-3 py-2 rounded-xl mr-2 mb-2 border border-gray-100`}>
                  <CustomText style={tw`text-[12px] text-gray-700`}>
                    {report.breed}
                  </CustomText>
                </View>
              )}
              {report.color && (
                <View style={tw`bg-white px-3 py-2 rounded-xl mr-2 mb-2 border border-gray-100`}>
                  <CustomText style={tw`text-[12px] text-gray-700`}>
                    {report.color}
                  </CustomText>
                </View>
              )}
              {report.sex && (
                <View style={tw`bg-white px-3 py-2 rounded-xl mr-2 mb-2 border border-gray-100`}>
                  <CustomText style={tw`text-[12px] text-gray-700`}>
                    {report.sex === "Male" ? "Male" : "Female"}
                  </CustomText>
                </View>
              )}
            </View>

            {report.distinguishingMarks && (
              <View style={tw`mb-3`}>
                <CustomText weight="SemiBold" style={tw`text-gray-700 mb-1`}>
                  Distinguishing Marks:
                </CustomText>
                <CustomText style={tw`text-gray-600 text-sm`}>
                  {report.distinguishingMarks}
                </CustomText>
              </View>
            )}

            {report.description && (
              <View style={tw`mb-3`}>
                <CustomText weight="SemiBold" style={tw`text-gray-700 mb-1`}>
                  Description:
                </CustomText>
                <CustomText style={tw`text-gray-600 text-sm`}>
                  {report.description}
                </CustomText>
              </View>
            )}

            {/* Date & Time */}
            <View style={tw`flex-row items-center mt-2`}>
              <Feather name="calendar" size={14} color="#6B7280" />
              <CustomText style={tw`text-gray-600 text-sm ml-2`}>
                {formatDateTime(report.dateTime || report.date)}
              </CustomText>
            </View>
          </View>

          {/* Location Card */}
          <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
                Location
              </CustomText>
              {mapRegion && (
                <TouchableOpacity
                  style={tw`flex-row items-center`}
                  onPress={handleOpenInMaps}
                >
                  <Feather name="external-link" size={14} color="#F59549" />
                  <CustomText style={tw`text-orange-500 text-sm ml-1`}>
                    Open in Maps
                  </CustomText>
                </TouchableOpacity>
              )}
            </View>

            <View style={tw`flex-row items-start mb-4`}>
              <View style={tw`w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3`}>
                <Feather name="map-pin" size={18} color="#F59549" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText style={tw`text-gray-900 text-sm`}>
                  {report.location || "Location not specified"}
                </CustomText>
              </View>
            </View>

            {/* Map Preview */}
            {mapRegion && (
              <View style={tw`w-full h-48 rounded-xl overflow-hidden border border-gray-200`}>
                <MapView
                  ref={mapRef}
                  style={tw`flex-1`}
                  region={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: mapRegion.latitude,
                      longitude: mapRegion.longitude,
                    }}
                    title="Report Location"
                  >
                    <View style={tw`items-center justify-center`}>
                      <Ionicons name="location" size={32} color="#F59549" />
                    </View>
                  </Marker>
                </MapView>
                
                {/* Get Directions Button */}
                {hasLocationPermission && currentUserLocation && (
                  <TouchableOpacity
                    style={tw`absolute bottom-3 left-3 right-3 bg-orange-500 py-3 rounded-lg items-center shadow-lg`}
                    onPress={navigateToDirections}
                  >
                    <View style={tw`flex-row items-center`}>
                      <Feather name="navigation" size={16} color="white" style={tw`mr-2`} />
                      <CustomText weight="SemiBold" style={tw`text-white text-sm`}>
                        Get Directions
                      </CustomText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Additional Information */}
          {report.additionalNotes && (
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6`}>
              <CustomText weight="Bold" style={tw`text-lg text-gray-900 mb-2`}>
                Additional Notes
              </CustomText>
              <CustomText style={tw`text-gray-600 text-sm`}>
                {report.additionalNotes}
              </CustomText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={tw`px-5 pb-6 pt-4 border-t border-gray-200 bg-white`}>
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity
            style={tw`flex-1 bg-gray-100 py-4 rounded-2xl items-center`}
            onPress={handleMessage}
          >
            <View style={tw`flex-row items-center`}>
              <Feather name="message-circle" size={18} color="#374151" style={tw`mr-2`} />
              <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                Message
              </CustomText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
            onPress={() => {
              // You can add "Mark as Resolved" or "I Found This Pet" functionality here
              Alert.alert(
                "Help Out",
                "Would you like to help with this case?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "I Have Information",
                    onPress: () => handleMessage(),
                  },
                  {
                    text: "I Found This Pet",
                    onPress: () => {
                      // Navigate to report found screen
                      navigation.navigate("ReportScreen", {
                        prefillData: {
                          pet: {
                            name: report.petName,
                            species: report.species,
                            breed: report.breed,
                            color: report.color,
                          },
                          type: "found",
                        },
                      });
                    },
                  },
                ]
              );
            }}
          >
            <View style={tw`flex-row items-center`}>
              <Feather name="heart" size={18} color="white" style={tw`mr-2`} />
              <CustomText weight="SemiBold" style={tw`text-white`}>
                Help Out
              </CustomText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}