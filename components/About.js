import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import CustomText from "./CustomText";

export default function AboutPawFindScreen({ navigation }) {
  const appVersion = "1.0.0";
  const buildNumber = "100";

  // Team members
  const teamMembers = [
    {
      id: 1,
      name: "Your Name",
      role: "Founder & Developer",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    },
    // Add more team members as needed
  ];

  // Features list
  const features = [
    {
      icon: "search-outline",
      title: "Smart Search",
      description: "Advanced algorithms to match lost and found pets",
      color: "#F59549",
      bgColor: "#FFF7ED",
    },
    {
      icon: "notifications-outline",
      title: "Real-time Alerts",
      description: "Get instant notifications for nearby matches",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
    },
    {
      icon: "map-outline",
      title: "Location Tracking",
      description: "GPS-powered location services for accurate reporting",
      color: "#10B981",
      bgColor: "#F0FDF4",
    },
    {
      icon: "people-outline",
      title: "Community Driven",
      description: "Join thousands helping reunite pets with families",
      color: "#EC4899",
      bgColor: "#FDF2F8",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Safe & Secure",
      description: "Your privacy and security are our top priority",
      color: "#8B5CF6",
      bgColor: "#FAF5FF",
    },
    {
      icon: "heart-outline",
      title: "Free Forever",
      description: "No hidden fees, completely free to use",
      color: "#EF4444",
      bgColor: "#FEF2F2",
    },
  ];

  // Stats
  const stats = [
    { label: "Pets Reunited", value: "1,250+", icon: "heart" },
    { label: "Active Users", value: "5,000+", icon: "people" },
    { label: "Reports Created", value: "3,500+", icon: "newspaper" },
    { label: "Success Rate", value: "87%", icon: "trophy" },
  ];

  // Links
  const socialLinks = [
    {
      id: "website",
      title: "Website",
      url: "https://pawfind.com",
      icon: "globe-outline",
      color: "#3B82F6",
    },
    {
      id: "facebook",
      title: "Facebook",
      url: "https://facebook.com/pawfind",
      icon: "logo-facebook",
      color: "#1877F2",
    },
    {
      id: "twitter",
      title: "Twitter",
      url: "https://twitter.com/pawfind",
      icon: "logo-twitter",
      color: "#1DA1F2",
    },
    {
      id: "instagram",
      title: "Instagram",
      url: "https://instagram.com/pawfind",
      icon: "logo-instagram",
      color: "#E4405F",
    },
  ];

  const FeatureCard = ({ item }) => (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 shadow-sm`}>
      <View style={tw`flex-row items-start`}>
        <View
          style={[
            tw`w-12 h-12 rounded-xl items-center justify-center mr-4`,
            { backgroundColor: item.bgColor },
          ]}
        >
          <Ionicons name={item.icon} size={24} color={item.color} />
        </View>
        <View style={tw`flex-1`}>
          <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm mb-1`}>
            {item.title}
          </CustomText>
          <CustomText style={tw`text-gray-600 text-xs leading-5`}>
            {item.description}
          </CustomText>
        </View>
      </View>
    </View>
  );

  const StatCard = ({ item }) => (
    <View
      style={tw`flex-1 bg-white rounded-2xl p-4 items-center mx-1 shadow-sm`}
    >
      <View
        style={tw`w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-3`}
      >
        <Ionicons name={item.icon} size={20} color="#F59549" />
      </View>
      <CustomText weight="Bold" style={tw`text-gray-900 text-lg mb-1`}>
        {item.value}
      </CustomText>
      <CustomText style={tw`text-gray-500 text-xs text-center`}>
        {item.label}
      </CustomText>
    </View>
  );

  const SocialButton = ({ item }) => (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.url)}
      style={tw`flex-1 bg-white rounded-xl p-4 items-center mx-1 shadow-sm`}
      activeOpacity={0.7}
    >
      <Ionicons name={item.icon} size={28} color={item.color} />
      <CustomText style={tw`text-gray-700 text-xs mt-2`}>
        {item.title}
      </CustomText>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title, icon }) => (
    <View style={tw`flex-row items-center mb-4`}>
      <View
        style={tw`w-8 h-8 rounded-lg bg-orange-50 items-center justify-center mr-3`}
      >
        <Ionicons name={icon} size={18} color="#F59549" />
      </View>
      <CustomText weight="SemiBold" style={tw`text-gray-900 text-base`}>
        {title}
      </CustomText>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View
        style={tw`bg-white px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
          About PawFind
        </CustomText>

        <View style={tw`w-10`} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        {/* Hero Section */}
        <View style={tw`bg-orange-500 px-6 py-8 items-center`}>
          <View
            style={tw`w-20 h-20 rounded-3xl bg-white items-center justify-center mb-4 shadow-lg overflow-hidden`}
          >
            <Image
              source={require("../assets/images/app_symbol.png")}
              style={tw`w-20 h-20`}
              resizeMode="contain"
            />
          </View>
          <CustomText weight="Bold" style={tw`text-white text-2xl mb-2`}>
            PawFind
          </CustomText>
          <CustomText style={tw`text-white/90 text-sm mb-1`}>
            Reuniting Pets with Their Families
          </CustomText>
          <View style={tw`bg-white/20 px-3 py-1 rounded-full mt-2`}>
            <CustomText style={tw`text-white text-xs`}>
              Version {appVersion} (Build {buildNumber})
            </CustomText>
          </View>
        </View>

        {/* Mission Statement */}
        <View style={tw`px-6 py-6`}>
          <View
            style={tw`bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100`}
          >
            <View style={tw`flex-row items-center mb-3`}>
              <Ionicons name="heart" size={20} color="#F59549" />
              <CustomText
                weight="SemiBold"
                style={tw`text-gray-900 text-base ml-2`}
              >
                Our Mission
              </CustomText>
            </View>
            <CustomText style={tw`text-gray-700 text-sm leading-6`}>
              PawFind is dedicated to reuniting lost pets with their families
              through the power of community and technology. We believe every
              pet deserves to come home, and every owner deserves peace of mind.
            </CustomText>
          </View>
        </View>

        {/* Stats Section */}
        <View style={tw`px-6 py-6 border-b border-gray-100`}>
          <SectionHeader title="Our Impact" icon="trophy-outline" />
          <View style={tw`flex-row flex-wrap -mx-1`}>
            {stats.map((stat, index) => (
              <View key={index} style={tw`w-1/2 mb-2`}>
                <StatCard item={stat} />
              </View>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={tw`px-6 py-6 border-b border-gray-100`}>
          <SectionHeader title="Key Features" icon="star-outline" />
          {features.map((feature) => (
            <FeatureCard key={feature.title} item={feature} />
          ))}
        </View>

        {/* How It Works */}
        <View style={tw`px-6 py-6 border-b border-gray-100`}>
          <SectionHeader title="How It Works" icon="help-circle-outline" />
          <View style={tw`bg-white rounded-2xl p-5 shadow-sm`}>
            <View style={tw`flex-row items-start mb-4`}>
              <View
                style={tw`w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-3`}
              >
                <CustomText weight="Bold" style={tw`text-white text-sm`}>
                  1
                </CustomText>
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-1`}
                >
                  Report Your Pet
                </CustomText>
                <CustomText style={tw`text-gray-600 text-xs leading-5`}>
                  Create a detailed report with photos and location information
                </CustomText>
              </View>
            </View>

            <View style={tw`flex-row items-start mb-4`}>
              <View
                style={tw`w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-3`}
              >
                <CustomText weight="Bold" style={tw`text-white text-sm`}>
                  2
                </CustomText>
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-1`}
                >
                  Community Helps Search
                </CustomText>
                <CustomText style={tw`text-gray-600 text-xs leading-5`}>
                  Your report reaches thousands of caring pet lovers nearby
                </CustomText>
              </View>
            </View>

            <View style={tw`flex-row items-start`}>
              <View
                style={tw`w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-3`}
              >
                <CustomText weight="Bold" style={tw`text-white text-sm`}>
                  3
                </CustomText>
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-1`}
                >
                  Reunite & Celebrate
                </CustomText>
                <CustomText style={tw`text-gray-600 text-xs leading-5`}>
                  Connect with finders and bring your beloved pet home
                </CustomText>
              </View>
            </View>
          </View>
        </View>

        {/* Connect With Us */}
        <View style={tw`px-6 py-6 border-b border-gray-100`}>
          <SectionHeader title="Connect With Us" icon="share-social-outline" />
          <View style={tw`flex-row flex-wrap -mx-1`}>
            {socialLinks.map((link) => (
              <View key={link.id} style={tw`w-1/2 mb-2`}>
                <SocialButton item={link} />
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={tw`px-6 py-6 border-b border-gray-100`}>
          <SectionHeader title="Get in Touch" icon="mail-outline" />
          <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@pawfind.com")}
              style={tw`flex-row items-center px-4 py-4 border-b border-gray-50`}
              activeOpacity={0.7}
            >
              <View
                style={tw`w-11 h-11 rounded-xl bg-orange-50 items-center justify-center mr-4`}
              >
                <Ionicons name="mail-outline" size={22} color="#F59549" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-0.5`}
                >
                  Email Support
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs`}>
                  support@pawfind.com
                </CustomText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL("tel:+63123456789")}
              style={tw`flex-row items-center px-4 py-4`}
              activeOpacity={0.7}
            >
              <View
                style={tw`w-11 h-11 rounded-xl bg-green-50 items-center justify-center mr-4`}
              >
                <Ionicons name="call-outline" size={22} color="#10B981" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-0.5`}
                >
                  Call Us
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs`}>
                  +63 123 456 7890
                </CustomText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Links */}
        <View style={tw`px-6 py-6`}>
          <SectionHeader title="Legal" icon="document-text-outline" />
          <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://pawfind.com/terms")}
              style={tw`flex-row items-center px-4 py-4 border-b border-gray-50`}
              activeOpacity={0.7}
            >
              <View
                style={tw`w-11 h-11 rounded-xl bg-gray-50 items-center justify-center mr-4`}
              >
                <Ionicons name="document-outline" size={22} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-0.5`}
                >
                  Terms of Service
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs`}>
                  Read our terms and conditions
                </CustomText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL("https://pawfind.com/privacy")}
              style={tw`flex-row items-center px-4 py-4 border-b border-gray-50`}
              activeOpacity={0.7}
            >
              <View
                style={tw`w-11 h-11 rounded-xl bg-gray-50 items-center justify-center mr-4`}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#6B7280"
                />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-0.5`}
                >
                  Privacy Policy
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs`}>
                  How we protect your data
                </CustomText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Licenses")}
              style={tw`flex-row items-center px-4 py-4`}
              activeOpacity={0.7}
            >
              <View
                style={tw`w-11 h-11 rounded-xl bg-gray-50 items-center justify-center mr-4`}
              >
                <Ionicons name="reader-outline" size={22} color="#6B7280" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-900 text-sm mb-0.5`}
                >
                  Open Source Licenses
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs`}>
                  Third-party libraries and attributions
                </CustomText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={tw`px-6 py-6 items-center`}>
          <CustomText style={tw`text-gray-500 text-xs text-center mb-2`}>
            Made with ❤️ for pets and their families
          </CustomText>
          <CustomText style={tw`text-gray-400 text-xs text-center`}>
            © 2024 PawFind. All rights reserved.
          </CustomText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
