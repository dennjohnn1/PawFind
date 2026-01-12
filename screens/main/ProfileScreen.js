"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  StatusBar,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import * as ImagePicker from "expo-image-picker";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import AuthService from "../../service/AuthService";
import PetService from "../../service/PetService";
import CloudinaryService from "../../service/CloudinaryService";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import CustomText from "../../components/CustomText";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState({
    pets: 0,
    lostReports: 0,
    foundReports: 0,
    certificates: 0,
    reunions: 0,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [showPremiumBadge, setShowPremiumBadge] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      loadUserProfile();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  const loadUserProfile = async () => {
    setLoading(true);

    const result = await AuthService.getUserProfile();
    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to load profile");
      setLoading(false);
      return;
    }

    setUserData(result.data);
    setProfileImage(result.data.profileImage || null);

    // 🔥 FETCH PETS PROPERLY
    const petsList = await PetService.getMyPets();
    const pets = petsList.length;

    // 🔥 Fetch user's reports from Firestore
    const myReports = await PetService.getMyReports();
    const lostReports = myReports.filter((r) => r.reportType === "lost").length;
    const foundReports = myReports.filter(
      (r) => r.reportType === "found"
    ).length;

    const reunions = result.data.reunitedPets?.length || 0;

    setShowPremiumBadge(pets > 0);

    setUserStats({
      pets,
      lostReports,
      foundReports,
      certificates: pets,
      reunions,
    });

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Camera roll permission is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImageUri = result.assets[0].uri;
      setProfileImage(newImageUri);

      // Upload and update profile
      try {
        const uploadResult = await CloudinaryService.uploadFile(
          newImageUri,
          "image"
        );
        await AuthService.updateUserProfile({ profileImage: uploadResult });
        Alert.alert("Success", "Profile picture updated!");
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      }
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const result = await AuthService.signOut();
          if (result.success) {
            navigation.replace("SignIn");
          } else {
            Alert.alert(
              "Logout Failed",
              result.error || "Something went wrong."
            );
          }
        },
      },
    ]);
  };

  // Header animation based on scroll
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [330, 220],
    extrapolate: "clamp",
  });

  const profileImageSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 60],
    extrapolate: "clamp",
  });

  const profileImageBorder = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [6, 3],
    extrapolate: "clamp",
  });

  const nameOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Menu sections with improved organization
  const accountMenuItems = [
    {
      id: "editProfile",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      icon: "person-outline",
      iconLib: "Ionicons",
      iconColor: "#F59549",
      backgroundColor: "#FFF7ED",
      onPress: () => navigation.navigate("EditProfile"),
    },
  ];

  const activityMenuItems = [
    {
      id: "reports",
      title: "My Reports",
      subtitle: `${
        userStats.lostReports + userStats.foundReports
      } total report${
        userStats.lostReports + userStats.foundReports !== 1 ? "s" : ""
      }`,
      icon: "newspaper-outline",
      iconLib: "Ionicons",
      iconColor: "#10B981",
      backgroundColor: "#F0FDF4",
      onPress: () => navigation.navigate("MyReports"),
      badge:
        userStats.lostReports + userStats.foundReports > 0
          ? (userStats.lostReports + userStats.foundReports).toString()
          : null,
    },
    {
      id: "reunions",
      title: "Reunions",
      subtitle: "Successful pet reunions",
      icon: "heart-outline",
      iconLib: "Ionicons",
      iconColor: "#EC4899",
      backgroundColor: "#FDF2F8",
      onPress: () => navigation.navigate("Reunions"),
      badge: userStats.reunions > 0 ? userStats.reunions.toString() : null,
    },
  ];

  const settingsMenuItems = [
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "Manage notification preferences",
      icon: "notifications-outline",
      iconLib: "Ionicons",
      iconColor: "#F59549",
      backgroundColor: "#FFF7ED",
      onPress: () => navigation.navigate("Notifications"),
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "App preferences and privacy",
      icon: "settings-outline",
      iconLib: "Ionicons",
      iconColor: "#6B7280",
      backgroundColor: "#F9FAFB",
      onPress: () => navigation.navigate("Settings"),
    },
  ];

  const supportMenuItems = [
    {
      id: "help",
      title: "Help & Support",
      subtitle: "Get help and contact support",
      icon: "help-circle-outline",
      iconLib: "Ionicons",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      onPress: () => navigation.navigate("HelpSupport"),
    },
    {
      id: "about",
      title: "About PawFind",
      subtitle: "Version 1.0.0",
      icon: "information-circle-outline",
      iconLib: "Ionicons",
      iconColor: "#8B5CF6",
      backgroundColor: "#FAF5FF",
      onPress: () => navigation.navigate("About"),
    },
  ];

  const MenuItem = ({ item, isLast = false }) => (
    <TouchableOpacity
      onPress={item.onPress}
      style={tw`flex-row items-center px-4 py-4 ${
        !isLast ? "border-b border-gray-50" : ""
      }`}
      activeOpacity={0.7}
    >
      <View
        style={[
          tw`w-11 h-11 rounded-xl items-center justify-center mr-4`,
          { backgroundColor: item.backgroundColor },
        ]}
      >
        <Ionicons name={item.icon} size={22} color={item.iconColor} />
      </View>

      <View style={tw`flex-1`}>
        <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm mb-0.5`}>
          {item.title}
        </CustomText>
        <CustomText style={tw`text-gray-500 text-xs`}>
          {item.subtitle}
        </CustomText>
      </View>

      <View style={tw`flex-row items-center`}>
        {item.badge && (
          <View style={tw`bg-orange-500 px-2 py-0.5 rounded-full mr-2`}>
            <CustomText style={tw`text-white text-xs`}>{item.badge}</CustomText>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({ label, value, icon, color = "#F59549" }) => (
    <View style={tw`items-center flex-1`}>
      <View
        style={[
          tw`w-12 h-12 rounded-full items-center justify-center mb-2`,
          { backgroundColor: `${color}15` },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-0.5`}>
        {value}
      </CustomText>
      <CustomText style={tw`text-gray-500 text-xs text-center`}>
        {label}
      </CustomText>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
        <CustomText style={tw`text-gray-500 mt-4 text-sm`}>
          Loading profile...
        </CustomText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#F59549" />

      <Animated.ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#F59549"]}
            tintColor="#F59549"
          />
        }
      >
        {/* Header Section with Gradient Background */}
        <Animated.View
          style={[tw`bg-orange-500 px-6 pb-6`, { height: headerHeight }]}
        >
          {/* Top Bar */}
          <View style={tw`flex-row justify-between items-center pt-3 pb-6`}>
            <CustomText weight="Bold" style={tw`text-white text-xl`}>
              Profile
            </CustomText>
            <TouchableOpacity
              onPress={handleLogout}
              style={tw`flex-row items-center bg-white/20 px-3 py-2 rounded-xl`}
            >
              <Ionicons name="log-out-outline" size={16} color="white" />
              <CustomText
                weight="SemiBold"
                style={tw`text-white text-sm ml-1.5`}
              >
                Logout
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={tw`items-center`}>
            <TouchableOpacity onPress={pickImage} style={tw`relative mb-4`}>
              <Animated.View
                style={{
                  width: profileImageSize,
                  height: profileImageSize,
                  borderRadius: 100,
                  borderWidth: profileImageBorder,
                  borderColor: "white",
                  overflow: "hidden",
                  backgroundColor: "white",
                }}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={tw`w-full h-full bg-white items-center justify-center`}
                  >
                    <Ionicons name="person" size={40} color="#F59549" />
                  </View>
                )}
              </Animated.View>
              <View
                style={tw`absolute bottom-0 right-0 bg-white w-8 h-8 rounded-full justify-center items-center shadow-lg`}
              >
                <Feather name="camera" size={14} color="#F59549" />
              </View>
            </TouchableOpacity>

            <Animated.View style={[tw`items-center`, { opacity: nameOpacity }]}>
              <View style={tw`flex-row items-center`}>
                <CustomText weight="Bold" style={tw`text-white text-lg`}>
                  {userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData?.fullName || "Pet Owner"}
                </CustomText>
                {showPremiumBadge && (
                  <View
                    style={tw`ml-2 bg-white/20 flex-row items-center px-2 py-1 rounded-full`}
                  >
                    <FontAwesome5 name="crown" size={10} color="white" />
                    <CustomText style={tw`text-white text-xs ml-1`}>
                      Verified
                    </CustomText>
                  </View>
                )}
              </View>

              <CustomText style={tw`text-white/80 text-xs mb-1`}>
                {userData?.email || "No email"}
              </CustomText>

              <View
                style={tw`flex-row items-center bg-white/10 px-3 py-1 rounded-full`}
              >
                <Ionicons name="calendar-outline" size={12} color="white" />
                <CustomText style={tw`text-white/70 text-xs ml-1.5`}>
                  Member since{" "}
                  {userData?.createdAt?.seconds
                    ? new Date(userData.createdAt.seconds * 1000).getFullYear()
                    : "Recently"}
                </CustomText>
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Stats Cards - Overlapping Header */}
        <View style={tw`px-6 -mt-10 mb-6`}>
          <View style={tw`bg-white rounded-2xl shadow-sm p-6`}>
            <View style={tw`flex-row justify-around`}>
              <StatCard
                label="Pets"
                value={userStats.pets}
                icon="paw"
                color="#F59549"
              />
              <View style={tw`w-px bg-gray-100`} />
              <StatCard
                label="Reports"
                value={userStats.lostReports + userStats.foundReports}
                icon="newspaper"
                color="#3B82F6"
              />
              <View style={tw`w-px bg-gray-100`} />
              <StatCard
                label="Reunions"
                value={userStats.reunions}
                icon="heart"
                color="#EC4899"
              />
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={tw`px-6`}>
          {/* Account Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              style={tw`text-gray-400 text-xs uppercase mb-3 px-1`}
            >
              Account
            </CustomText>
            <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
              {accountMenuItems.map((item, index) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isLast={index === accountMenuItems.length - 1}
                />
              ))}
            </View>
          </View>

          {/* Activity Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              style={tw`text-gray-400 text-xs uppercase mb-3 px-1`}
            >
              Activity
            </CustomText>
            <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
              {activityMenuItems.map((item, index) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isLast={index === activityMenuItems.length - 1}
                />
              ))}
            </View>
          </View>

          {/* Settings Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              style={tw`text-gray-400 text-xs uppercase mb-3 px-1`}
            >
              Settings
            </CustomText>
            <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
              {settingsMenuItems.map((item, index) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isLast={index === settingsMenuItems.length - 1}
                />
              ))}
            </View>
          </View>

          {/* Support Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              style={tw`text-gray-400 text-xs uppercase mb-3 px-1`}
            >
              Support
            </CustomText>
            <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
              {supportMenuItems.map((item, index) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isLast={index === supportMenuItems.length - 1}
                />
              ))}
            </View>
          </View>

          {/* Footer Info */}
          <View
            style={tw`bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100 mb-8`}
          >
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={tw`w-12 h-12 rounded-xl bg-white items-center justify-center shadow-sm mr-4`}
              >
                <FontAwesome5 name="paw" size={20} color="#F59549" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText weight="Bold" style={tw`text-gray-900 text-sm`}>
                  PawFind
                </CustomText>
                <CustomText style={tw`text-gray-600 text-xs`}>
                  Reuniting pets with families
                </CustomText>
              </View>
            </View>

            <View
              style={tw`flex-row justify-between pt-3 border-t border-orange-100`}
            >
              <TouchableOpacity
                style={tw`flex-1 items-center py-2`}
                onPress={() => Linking.openURL("https://pawfind.com/terms")}
              >
                <CustomText style={tw`text-gray-600 text-xs`}>Terms</CustomText>
              </TouchableOpacity>

              <View style={tw`w-px bg-orange-200`} />

              <TouchableOpacity
                style={tw`flex-1 items-center py-2`}
                onPress={() => Linking.openURL("https://pawfind.com/privacy")}
              >
                <CustomText style={tw`text-gray-600 text-xs`}>
                  Privacy
                </CustomText>
              </TouchableOpacity>

              <View style={tw`w-px bg-orange-200`} />

              <TouchableOpacity
                style={tw`flex-1 items-center py-2`}
                onPress={() => Linking.openURL("mailto:support@pawfind.com")}
              >
                <CustomText style={tw`text-gray-600 text-xs`}>
                  Contact
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
