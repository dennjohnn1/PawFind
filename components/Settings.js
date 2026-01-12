import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  StatusBar,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "../components/CustomText";
import AuthService from "../service/AuthService";

export default function Settings({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);

  // Settings State
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [nearbyAlerts, setNearbyAlerts] = useState(true);
  const [reportUpdates, setReportUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [autoSaveReports, setAutoSaveReports] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const result = await AuthService.getUserProfile();
    if (result.success) {
      setUserData(result.data);
      
      // Load saved settings if they exist
      const settings = result.data.settings || {};
      setPushNotifications(settings.pushNotifications ?? true);
      setEmailNotifications(settings.emailNotifications ?? true);
      setSmsNotifications(settings.smsNotifications ?? false);
      setNearbyAlerts(settings.nearbyAlerts ?? true);
      setReportUpdates(settings.reportUpdates ?? true);
      setMarketingEmails(settings.marketingEmails ?? false);
      setLocationSharing(settings.locationSharing ?? true);
      setProfileVisibility(settings.profileVisibility ?? true);
      setShowPhone(settings.showPhone ?? false);
      setAutoSaveReports(settings.autoSaveReports ?? true);
      setDarkMode(settings.darkMode ?? false);
    }
    setLoading(false);
  };

  const saveSettings = async (settingName, value) => {
    setSaving(true);
    
    const newSettings = {
      pushNotifications,
      emailNotifications,
      smsNotifications,
      nearbyAlerts,
      reportUpdates,
      marketingEmails,
      locationSharing,
      profileVisibility,
      showPhone,
      autoSaveReports,
      darkMode,
      [settingName]: value,
    };

    const result = await AuthService.updateUserProfile({
      settings: newSettings,
    });

    if (!result.success) {
      Alert.alert("Error", "Failed to update settings");
    }
    
    setSaving(false);
  };

  const handleToggle = (setter, settingName) => (value) => {
    setter(value);
    saveSettings(settingName, value);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear temporary files and may free up storage space. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data, pets, and reports will be deleted. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Type 'DELETE' to confirm account deletion",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm Delete",
                  style: "destructive",
                  onPress: async () => {
                    // Implement actual account deletion logic here
                    Alert.alert("Account Deleted", "Your account has been permanently deleted.");
                    navigation.replace("SignIn");
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const SettingToggle = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon, 
    iconColor, 
    iconBg 
  }) => (
    <View style={tw`flex-row items-center px-4 py-4 border-b border-gray-50`}>
      <View
        style={[
          tw`w-10 h-10 rounded-xl items-center justify-center mr-4`,
          { backgroundColor: iconBg },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={tw`flex-1 mr-3`}>
        <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm mb-0.5`}>
          {title}
        </CustomText>
        <CustomText style={tw`text-gray-500 text-xs`}>
          {subtitle}
        </CustomText>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: "#FED7AA" }}
        thumbColor={value ? "#F59549" : "#F3F4F6"}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );

  const SettingButton = ({ 
    title, 
    subtitle, 
    icon, 
    iconColor, 
    iconBg, 
    onPress,
    danger = false,
    showChevron = true 
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={tw`flex-row items-center px-4 py-4 border-b border-gray-50`}
      activeOpacity={0.7}
    >
      <View
        style={[
          tw`w-10 h-10 rounded-xl items-center justify-center mr-4`,
          { backgroundColor: iconBg },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={tw`flex-1`}>
        <CustomText 
          weight="SemiBold" 
          style={tw`text-sm mb-0.5 ${danger ? 'text-red-600' : 'text-gray-900'}`}
        >
          {title}
        </CustomText>
        {subtitle && (
          <CustomText style={tw`text-gray-500 text-xs`}>
            {subtitle}
          </CustomText>
        )}
      </View>

      {showChevron && (
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={danger ? "#DC2626" : "#D1D5DB"} 
        />
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title, icon }) => (
    <View style={tw`flex-row items-center px-5 py-4 bg-gray-50`}>
      <View style={tw`w-7 h-7 rounded-lg bg-white items-center justify-center mr-3 shadow-sm`}>
        <Ionicons name={icon} size={16} color="#F59549" />
      </View>
      <CustomText weight="SemiBold" style={tw`text-gray-700 text-xs uppercase tracking-wide`}>
        {title}
      </CustomText>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
        <CustomText style={tw`text-gray-500 mt-4 text-sm`}>
          Loading settings...
        </CustomText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={tw`bg-white px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
          Settings
        </CustomText>

        <View style={tw`w-10`}>
          {saving && <ActivityIndicator size="small" color="#F59549" />}
        </View>
      </View>

      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <SectionHeader title="Notifications" icon="notifications-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingToggle
            title="Push Notifications"
            subtitle="Receive alerts on your device"
            value={pushNotifications}
            onValueChange={handleToggle(setPushNotifications, 'pushNotifications')}
            icon="phone-portrait-outline"
            iconColor="#F59549"
            iconBg="#FFF7ED"
          />
          <SettingToggle
            title="Email Notifications"
            subtitle="Get updates via email"
            value={emailNotifications}
            onValueChange={handleToggle(setEmailNotifications, 'emailNotifications')}
            icon="mail-outline"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
          />
          <SettingToggle
            title="SMS Alerts"
            subtitle="Text message notifications"
            value={smsNotifications}
            onValueChange={handleToggle(setSmsNotifications, 'smsNotifications')}
            icon="chatbubble-outline"
            iconColor="#10B981"
            iconBg="#F0FDF4"
          />
        </View>

        {/* Alert Preferences */}
        <SectionHeader title="Alert Preferences" icon="alert-circle-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingToggle
            title="Nearby Pet Alerts"
            subtitle="Get notified of pets near you"
            value={nearbyAlerts}
            onValueChange={handleToggle(setNearbyAlerts, 'nearbyAlerts')}
            icon="location-outline"
            iconColor="#EC4899"
            iconBg="#FDF2F8"
          />
          <SettingToggle
            title="Report Updates"
            subtitle="Updates on your reports"
            value={reportUpdates}
            onValueChange={handleToggle(setReportUpdates, 'reportUpdates')}
            icon="newspaper-outline"
            iconColor="#8B5CF6"
            iconBg="#FAF5FF"
          />
        </View>

        {/* Privacy & Security */}
        <SectionHeader title="Privacy & Security" icon="shield-checkmark-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingToggle
            title="Location Sharing"
            subtitle="Share location for better matches"
            value={locationSharing}
            onValueChange={handleToggle(setLocationSharing, 'locationSharing')}
            icon="map-outline"
            iconColor="#14B8A6"
            iconBg="#F0FDFA"
          />
          <SettingToggle
            title="Profile Visibility"
            subtitle="Let others see your profile"
            value={profileVisibility}
            onValueChange={handleToggle(setProfileVisibility, 'profileVisibility')}
            icon="eye-outline"
            iconColor="#6366F1"
            iconBg="#EEF2FF"
          />
          <SettingButton
            title="Change Password"
            subtitle="Update your password"
            icon="key-outline"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
            onPress={() => navigation.navigate("ChangePassword")}
          />
        </View>

        {/* App Preferences */}
        <SectionHeader title="App Preferences" icon="options-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingToggle
            title="Auto-Save Reports"
            subtitle="Save drafts automatically"
            value={autoSaveReports}
            onValueChange={handleToggle(setAutoSaveReports, 'autoSaveReports')}
            icon="save-outline"
            iconColor="#10B981"
            iconBg="#F0FDF4"
          />
          <SettingToggle
            title="Dark Mode"
            subtitle="Coming soon"
            value={darkMode}
            onValueChange={handleToggle(setDarkMode, 'darkMode')}
            icon="moon-outline"
            iconColor="#6B7280"
            iconBg="#F9FAFB"
          />
          <SettingButton
            title="Language"
            subtitle="English (US)"
            icon="language-outline"
            iconColor="#8B5CF6"
            iconBg="#FAF5FF"
            onPress={() => Alert.alert("Language", "Language settings coming soon")}
          />
        </View>

        {/* Storage & Data */}
        <SectionHeader title="Storage & Data" icon="server-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingButton
            title="Clear Cache"
            subtitle="Free up storage space"
            icon="trash-outline"
            iconColor="#F59E0B"
            iconBg="#FFFBEB"
            onPress={handleClearCache}
          />
          <SettingButton
            title="Download My Data"
            subtitle="Export your information"
            icon="download-outline"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
            onPress={() => Alert.alert("Download Data", "Your data export will be ready shortly")}
          />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" icon="document-text-outline" />
        <View style={tw`bg-white mb-2`}>
          <SettingButton
            title="Terms of Service"
            icon="document-outline"
            iconColor="#6B7280"
            iconBg="#F9FAFB"
            onPress={() => Linking.openURL("https://pawfind.com/terms")}
          />
          <SettingButton
            title="Privacy Policy"
            icon="lock-closed-outline"
            iconColor="#6B7280"
            iconBg="#F9FAFB"
            onPress={() => Linking.openURL("https://pawfind.com/privacy")}
          />
          <SettingButton
            title="Licenses"
            icon="reader-outline"
            iconColor="#6B7280"
            iconBg="#F9FAFB"
            onPress={() => navigation.navigate("Licenses")}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" icon="warning-outline" />
        <View style={tw`bg-white mb-6`}>
          <SettingButton
            title="Delete Account"
            subtitle="Permanently delete your account"
            icon="trash-bin-outline"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            onPress={handleDeleteAccount}
            danger={true}
          />
        </View>

        {/* App Version */}
        <View style={tw`items-center py-6`}>
          <CustomText style={tw`text-gray-400 text-xs mb-1`}>
            PawFind Version 1.0.0
          </CustomText>
          <CustomText style={tw`text-gray-400 text-xs`}>
            © 2024 PawFind. All rights reserved.
          </CustomText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}