import { useState, useEffect } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import tw from "twrnc"
import * as ImagePicker from "expo-image-picker"
import { Ionicons, Feather } from "@expo/vector-icons"
import CustomText from "../components/CustomText"
import CustomInput from "../components/CustomInput"
import AuthService from "../service/AuthService"
import CloudinaryService from "../service/CloudinaryService"

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userData, setUserData] = useState(null)

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const [street, setStreet] = useState("")
  const [barangay, setBarangay] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("")
  const [postalCode, setPostalCode] = useState("")

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    setLoading(true)
    const result = await AuthService.getUserProfile()
    if (result.success) {
      setUserData(result.data)
      setFirstName(result.data.firstName || "")
      setLastName(result.data.lastName || "")
      setPhone(result.data.phone || "")
      setProfileImage(result.data.profileImage || null)
      setStreet(result.data.location?.street || "")
      setBarangay(result.data.location?.barangay || "")
      setCity(result.data.location?.city || "")
      setProvince(result.data.location?.province || "")
      setPostalCode(result.data.location?.postalCode || "")
    } else {
      Alert.alert("Error", result.error || "Failed to load profile")
    }
    setLoading(false)
  }

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Camera roll permission is required!")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      setUploading(true)
      try {
        const uploadResult = await CloudinaryService.uploadFile(result.assets[0].uri, "image")
        setProfileImage(uploadResult)
      } catch (error) {
        Alert.alert("Error", "Failed to upload image")
      } finally {
        setUploading(false)
      }
    }
  }

  const handleUpdateProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "First name and last name are required")
      return
    }

    setSaving(true)

    try {
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        profileImage: profileImage,
        location: {
          street: street.trim(),
          barangay: barangay.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
          address: `${street.trim()}, ${barangay.trim()}, ${city.trim()}, ${province.trim()}`
            .replace(/, ,/g, ",")
            .trim(),
        },
      }

      const result = await AuthService.updateUserProfile(updateData)

      if (result.success) {
        Alert.alert(
          "Success", 
          "Profile updated successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack()
            }
          ]
        )
      } else {
        Alert.alert("Error", result.error || "Failed to update profile")
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    if (!userData) return false
    return (
      firstName !== (userData.firstName || "") ||
      lastName !== (userData.lastName || "") ||
      phone !== (userData.phone || "") ||
      profileImage !== (userData.profileImage || null) ||
      street !== (userData.location?.street || "") ||
      barangay !== (userData.location?.barangay || "") ||
      city !== (userData.location?.city || "") ||
      province !== (userData.location?.province || "") ||
      postalCode !== (userData.location?.postalCode || "")
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
        <CustomText style={tw`text-gray-500 mt-4 text-sm`}>
          Loading profile...
        </CustomText>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={tw`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={() => {
              if (hasChanges()) {
                Alert.alert(
                  "Unsaved Changes",
                  "You have unsaved changes. Are you sure you want to go back?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: () => navigation.goBack() }
                  ]
                )
              } else {
                navigation.goBack()
              }
            }}
            style={tw`p-2`}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
            Edit Profile
          </CustomText>

          <TouchableOpacity
            onPress={handleUpdateProfile}
            disabled={!hasChanges() || saving}
            style={tw`p-2`}
          >
            <CustomText
              weight="SemiBold"
              style={tw`${hasChanges() && !saving ? 'text-orange-500' : 'text-gray-300'}`}
            >
              {saving ? "Saving..." : "Save"}
            </CustomText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-8`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={tw`items-center py-8 border-b border-gray-100`}>
            <View style={tw`relative`}>
              {uploading ? (
                <View style={tw`w-28 h-28 rounded-full bg-gray-100 items-center justify-center`}>
                  <ActivityIndicator size="large" color="#F59549" />
                </View>
              ) : (
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={tw`w-28 h-28 rounded-full border-4 border-gray-100`}
                    />
                  ) : (
                    <View style={tw`w-28 h-28 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 border-4 border-gray-100 justify-center items-center`}>
                      <Ionicons name="person" size={48} color="#F59549" />
                    </View>
                  )}
                  
                  <View style={tw`absolute bottom-0 right-0 bg-orange-500 w-10 h-10 rounded-full justify-center items-center border-3 border-white shadow-lg`}>
                    <Feather name="camera" size={18} color="white" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            <CustomText style={tw`text-gray-500 text-xs mt-3`}>
              Tap to change profile picture
            </CustomText>
          </View>

          {/* Basic Information */}
          <View style={tw`px-5 py-6 border-b border-gray-100`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-8 h-8 rounded-lg bg-orange-50 items-center justify-center mr-3`}>
                <Ionicons name="person-outline" size={18} color="#F59549" />
              </View>
              <CustomText weight="SemiBold" style={tw`text-gray-900`}>
                Basic Information
              </CustomText>
            </View>

            <CustomInput
              label="First Name"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              required
            />

            <CustomInput
              label="Last Name"
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              required
            />

            <CustomInput
              label="Phone Number"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Email (Read-only) */}
            <View style={tw`mt-4`}>
              <CustomText weight="SemiBold" style={tw`text-gray-700 mb-2 text-sm`}>
                Email Address
              </CustomText>
              <View style={tw`bg-gray-50 rounded-xl px-4 py-4 flex-row items-center justify-between`}>
                <CustomText style={tw`text-gray-600`}>
                  {userData?.email || "No email"}
                </CustomText>
                <View style={tw`bg-green-100 px-2 py-1 rounded`}>
                  <CustomText style={tw`text-green-500 text-xs`}>
                    Verified
                  </CustomText>
                </View>
              </View>
              <CustomText style={tw`text-gray-400 text-xs mt-1 ml-1`}>
                Email cannot be changed
              </CustomText>
            </View>
          </View>

          {/* Address Information */}
          <View style={tw`px-5 py-6`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3`}>
                <Ionicons name="location-outline" size={18} color="#3B82F6" />
              </View>
              <CustomText weight="SemiBold" style={tw`text-gray-900`}>
                Address Information
              </CustomText>
            </View>

            <CustomInput
              label="Street Address"
              placeholder="House/Unit No., Building, Street"
              value={street}
              onChangeText={setStreet}
              multiline
            />

            <CustomInput
              label="Barangay"
              placeholder="Enter barangay"
              value={barangay}
              onChangeText={setBarangay}
            />

            <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                <CustomInput
                  label="City"
                  placeholder="Enter city"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={tw`flex-1`}>
                <CustomInput
                  label="Province"
                  placeholder="Enter province"
                  value={province}
                  onChangeText={setProvince}
                />
              </View>
            </View>

            <CustomInput
              label="Postal Code"
              placeholder="Enter postal code"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* Action Buttons */}
          <View style={tw`px-5 mt-4`}>
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={!hasChanges() || saving}
              style={tw`bg-orange-500 py-4 rounded-xl items-center shadow-md shadow-orange-200 mb-3 ${!hasChanges() || saving ? 'opacity-50' : ''}`}
            >
              <CustomText weight="Bold" style={tw`text-white text-sm`}>
                {saving ? "Saving Changes..." : "Save Changes"}
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (hasChanges()) {
                  Alert.alert(
                    "Discard Changes",
                    "Are you sure you want to discard your changes?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Discard", 
                        style: "destructive", 
                        onPress: () => navigation.goBack() 
                      }
                    ]
                  )
                } else {
                  navigation.goBack()
                }
              }}
              style={tw`bg-gray-100 py-4 rounded-xl items-center`}
            >
              <CustomText weight="SemiBold" style={tw`text-gray-700 text-sm`}>
                Cancel
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Info Note */}
          <View style={tw`mx-5 mt-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex-row`}>
            <Ionicons name="information-circle" size={20} color="#F59549" style={tw`mr-3 mt-0.5`} />
            <View style={tw`flex-1`}>
              <CustomText weight="SemiBold" style={tw`text-orange-900 text-sm mb-1`}>
                Why we need this information
              </CustomText>
              <CustomText style={tw`text-orange-800 text-xs leading-5`}>
                Your profile information helps reunite lost pets with their owners. 
                Contact details are only shared when you report or respond to a pet sighting.
              </CustomText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}