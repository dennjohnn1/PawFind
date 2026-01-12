import { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import DateTimeSelector from "../../components/CustomDateTimeSelector";
import LocationPicker from "../../components/LocationPicker";
import PetSelector from "../../components/PetSelector";
import { auth } from "../../firebase";
import AuthService from "../../service/AuthService";
import PetService from "../../service/PetService";
import CloudinaryService from "../../service/CloudinaryService";
import * as ImagePicker from "expo-image-picker";

export default function ReportScreen({ route }) {
  const [myPets, setMyPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [contactEditModal, setContactEditModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const authInstance = auth;

  const [form, setForm] = useState({
    // Photo
    photos: [],

    // Pet Information
    petName: "",
    species: "",
    breed: "",
    sex: "",
    color: "",
    distinguishingMarks: "",

    // Location & Time
    dateTime: new Date().toISOString(),
    location: "", // This will now store the address string
    locationData: {
      // New field for complete location data
      address: "",
      coordinates: null,
    },
    additionalNotes: "",

    // Reporter Information
    reporterName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadUserPets();
    slideAnim.setValue(50);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        delay: 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 100,
      }),
    ]).start();
  }, []);

  const loadUserPets = async () => {
    try {
      const pets = await PetService.getMyPets();
      setMyPets(pets);
    } catch (error) {
      console.error("[v0] Error loading user pets:", error);
    }
  };

  useEffect(() => {
    if (route?.params?.prefillData) {
      const { pet, type } = route.params.prefillData;
      if (type === "lost") {
        openModal(type, pet);
      } else {
        openModal(type || "found");
      }
    }
  }, [route?.params]);

  const openModal = async (type, prefillData = null) => {
    try {
      const user = authInstance.currentUser;
      if (!user) throw new Error("User not logged in");

      const profileRes = await AuthService.getUserProfile();
      let reporterName = "";
      let phone = "";

      if (profileRes.success && profileRes.data) {
        const data = profileRes.data;
        reporterName =
          data.fullName ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim();
        phone = data.phone || "";
      }

      setReportType(type);
      setSelectedPetId(prefillData?.id || null);

      if (prefillData && type === "lost") {
        setIsPreFilled(true);
        const photosArray = [];
        if (prefillData.photoUrl) {
          photosArray.push(prefillData.photoUrl);
        } else if (prefillData.photos && Array.isArray(prefillData.photos)) {
          photosArray.push(...prefillData.photos);
        }

        setForm((prev) => ({
          ...prev,
          petName: prefillData.name || "",
          species: prefillData.species || "",
          breed: prefillData.breed || "",
          sex: prefillData.sex || "",
          color: prefillData.color || "",
          distinguishingMarks: prefillData.distinguishingMarks || "",
          photos: photosArray,
          reporterName,
          email: user.email || "",
          phone,
        }));
      } else {
        setIsPreFilled(false);
        setForm((prev) => ({
          ...prev,
          reporterName,
          email: user.email || "",
          phone,
        }));
      }

      setModalVisible(true);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error opening modal:", error);
      Alert.alert("Error", "Unable to fetch user info. Please try again.");
    }
  };

  const handleChange = (key, value) => {
    console.log(`[v0] Changing ${key}:`, value, "Type:", typeof value);
    if (key === "species") {
      setForm({ ...form, species: value, breed: "" });
    } else if (key === "locationData") {
      // Handle location data from LocationPicker
      setForm({
        ...form,
        location: value.address, // Keep string address for display
        locationData: value, // Store complete location data
      });
    } else {
      setForm({ ...form, [key]: value });
    }
  };

  const handlePickImage = async (isMainPhoto = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setLoading(true);
      const photoUri = result.assets[0].uri;

      if (isMainPhoto) {
        const updatedPhotos = [photoUri, ...form.photos.slice(1)];
        setForm({ ...form, photos: updatedPhotos });
      } else {
        if (form.photos.length < 4) {
          setForm({ ...form, photos: [...form.photos, photoUri] });
        } else {
          Alert.alert("Photo Limit", "You can upload up to 4 photos maximum.");
        }
      }
      setLoading(false);
    }
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = form.photos.filter((_, i) => i !== index);
    setForm({ ...form, photos: updatedPhotos });
  };

  const handleSubmit = async () => {
    console.log("[v0] Form state on submit:", {
      petName: form.petName,
      species: form.species,
      photos: form.photos,
      photosLength: form.photos?.length,
      dateTime: form.dateTime,
      dateTimeType: typeof form.dateTime,
      dateTimeValid: !!form.dateTime,
      location: form.location,
      locationData: form.locationData,
      reporterName: form.reporterName,
      email: form.email,
      phone: form.phone,
    });

    const isLostReport = reportType === "lost";
    const isNameValid = isLostReport ? !!form.petName : true;
    const hasPhotos = Array.isArray(form.photos) && form.photos.length > 0;

    const hasDateTime = () => {
      if (!form.dateTime) return false;
      try {
        const date = new Date(form.dateTime);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    };

    // Check for location data
    const hasLocationData =
      !!form.locationData &&
      !!form.locationData.address &&
      !!form.locationData.coordinates;

    console.log("[v0] Validation checks:", {
      isNameValid,
      hasSpecies: !!form.species,
      hasDateTime: hasDateTime(),
      hasLocationAddress: !!form.location,
      hasLocationData: hasLocationData,
      locationData: form.locationData,
      hasReporterName: !!form.reporterName,
      hasEmail: !!form.email,
      hasPhone: !!form.phone,
      hasPhotos,
    });

    if (
      !isNameValid ||
      !form.species ||
      !hasDateTime() ||
      !hasLocationData || // Updated check
      !form.reporterName ||
      !form.email ||
      !form.phone ||
      !hasPhotos
    ) {
      Alert.alert(
        "Missing Information",
        `Please fill in all required fields${
          isLostReport ? " (including Pet Name)" : ""
        } and upload at least one photo. Also make sure to select a location on the map.`
      );
      return;
    }

    try {
      setLoading(true);

      const uploadedPhotoUrls = [];

      for (const photo of form.photos) {
        try {
          if (photo.startsWith("http")) {
            uploadedPhotoUrls.push(photo);
          } else {
            const uploadedUrl = await CloudinaryService.uploadFile(
              photo,
              "image"
            );
            uploadedPhotoUrls.push(uploadedUrl);
          }
        } catch (error) {
          console.error("[v0] Error uploading photo:", error);
          Alert.alert(
            "Error",
            "Failed to upload one or more photos. Please try again."
          );
          setLoading(false);
          return;
        }
      }

      const reportData = {
        petName: form.petName,
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        color: form.color,
        distinguishingMarks: form.distinguishingMarks,
        dateTime: form.dateTime,
        location: form.locationData.address, // Use address from locationData
        coordinates: form.locationData.coordinates, // Add coordinates
        additionalNotes: form.additionalNotes,
        reporterName: form.reporterName,
        email: form.email,
        phone: form.phone,
        reportType: reportType,
        photos: uploadedPhotoUrls,
        petId: selectedPetId || null,
        createdAt: new Date().toISOString(),
      };

      console.log("[v0] Submitting report with coordinates:", reportData);

      await PetService.addReport(reportData);

      Alert.alert(
        "Success",
        `Your ${reportType} pet report has been submitted!`
      );

      setModalVisible(false);
      setReportType(null);
      setCurrentStep(1);
      setSelectedPetId(null);
      setIsPreFilled(false);
      setForm({
        photos: [],
        petName: "",
        species: "",
        breed: "",
        sex: "",
        color: "",
        distinguishingMarks: "",
        dateTime: new Date().toISOString(),
        location: "",
        locationData: {
          address: "",
          coordinates: null,
        },
        additionalNotes: "",
        reporterName: "",
        email: "",
        phone: "",
      });
    } catch (error) {
      console.error("[v0] Error submitting report:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to submit report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyState = () => (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`px-6 pt-2 pb-4`}>
        <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
          Report a Pet
        </CustomText>
        <CustomText style={tw`text-gray-500 text-[12px]`}>
          Help reunite pets with their families
        </CustomText>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`flex-grow`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Animated.View
            style={[
              tw`w-full max-w-sm bg-white p-6`,
              { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
            ]}
          >
            <Animated.View
              style={[
                tw`items-center mb-6`,
                {
                  transform: [
                    {
                      scale: opacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={tw`w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-4`}
              >
                <Ionicons name="alert-circle" size={30} color="#F59549" />
              </View>

              <CustomText weight="Bold" style={tw`text-gray-900 text-lg mb-1`}>
                Help a Pet in Need
              </CustomText>
              <CustomText style={tw`text-gray-500 text-sm text-center`}>
                Choose what you'd like to report
              </CustomText>
            </Animated.View>

            <Animated.View
              style={{
                opacity: opacityAnim,
                transform: [
                  {
                    translateY: opacityAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                onPress={() => openModal("lost")}
                style={tw`bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex-row items-center active:bg-red-100`}
              >
                <View
                  style={tw`w-10 h-10 rounded-lg bg-red-100 items-center justify-center mr-3`}
                >
                  <Ionicons name="search" size={20} color="#EF4444" />
                </View>
                <View style={tw`flex-1`}>
                  <CustomText
                    weight="SemiBold"
                    style={tw`text-red-700 text-sm`}
                  >
                    Report Lost Pet
                  </CustomText>
                  <CustomText style={tw`text-red-600 text-xs mt-0.5`}>
                    My pet is missing
                  </CustomText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openModal("found")}
                style={tw`bg-green-50 border border-green-100 rounded-xl p-4 mb-4 flex-row items-center active:bg-green-100`}
              >
                <View
                  style={tw`w-10 h-10 rounded-lg bg-green-100 items-center justify-center mr-3`}
                >
                  <Ionicons name="hand-left" size={20} color="#10B981" />
                </View>
                <View style={tw`flex-1`}>
                  <CustomText
                    weight="SemiBold"
                    style={tw`text-green-700 text-sm`}
                  >
                    Report Found Pet
                  </CustomText>
                  <CustomText style={tw`text-green-600 text-xs mt-0.5`}>
                    I found a pet
                  </CustomText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={tw`flex-row justify-between mb-8`}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={tw`flex-1 flex-row items-center`}>
          <View
            style={tw`w-8 h-8 rounded-full items-center justify-center ${
              currentStep >= step ? "bg-orange-500" : "bg-gray-100"
            }`}
          >
            <CustomText
              weight="Bold"
              style={tw`text-xs ${
                currentStep >= step ? "text-white" : "text-gray-400"
              }`}
            >
              {step}
            </CustomText>
          </View>
          {step < 3 && (
            <View
              style={tw`flex-1 h-0.5 mx-2 ${
                currentStep > step ? "bg-orange-500" : "bg-gray-100"
              }`}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      {reportType === "lost" && myPets.length > 0 && (
        <PetSelector
          pets={myPets}
          onSelect={handlePetSelect}
          selectedPetId={selectedPetId}
        />
      )}

      <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
        Upload Pet Photos
      </CustomText>
      <CustomText style={tw`text-gray-500 text-sm mb-6`}>
        Help others identify the pet with clear photos
      </CustomText>

      <CustomText weight="SemiBold" style={tw`text-sm mb-2`}>
        Main Photo <CustomText style={tw`text-red-500`}>*</CustomText>
      </CustomText>
      <CustomText style={tw`text-xs text-gray-600 mb-3`}>
        Upload a clear photo of the pet for identification
      </CustomText>

      <TouchableOpacity
        onPress={() => handlePickImage(true)}
        disabled={loading}
        style={tw`w-full rounded-3xl items-center justify-center mb-6 ${
          form.photos.length > 0 ? "bg-white" : "border-2 border-orange-400"
        }`}
      >
        {form.photos.length > 0 ? (
          <View style={tw`w-full relative`}>
            <Image
              source={{ uri: form.photos[0] }}
              style={tw`w-full h-80 rounded-2xl`}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => handleRemovePhoto(0)}
              style={tw`absolute top-2 right-2 bg-red-500 rounded-full p-1`}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Ionicons
              name="camera"
              size={48}
              color="#F59549"
              style={tw`mb-2 pt-8`}
            />
            <CustomText weight="SemiBold" style={tw`text-sm mb-1 ps-8 pe-8`}>
              Upload pet photo
            </CustomText>
            <CustomText style={tw`text-xs text-gray-500 pb-8`}>
              Tap to select from gallery
            </CustomText>
          </>
        )}
      </TouchableOpacity>

      <CustomText weight="SemiBold" style={tw`text-sm mb-2`}>
        Additional Photos{" "}
        <CustomText style={tw`text-gray-500 text-xs font-normal`}>
          (Optional)
        </CustomText>
      </CustomText>
      <CustomText style={tw`text-xs text-gray-600 mb-3`}>
        Add up to 3 more photos to show different angles or distinguishing marks
      </CustomText>

      <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
        {form.photos.slice(1).map((photo, index) => (
          <View key={index + 1} style={tw`relative`}>
            <Image
              source={{ uri: photo }}
              style={tw`w-24 h-24 rounded-2xl`}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => handleRemovePhoto(index + 1)}
              style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {form.photos.length < 4 && (
          <TouchableOpacity
            onPress={() => handlePickImage(false)}
            disabled={loading}
            style={tw`w-24 h-24 border-2 border-dashed border-orange-300 rounded-2xl items-center justify-center`}
          >
            <Ionicons name="add" size={32} color="#F59549" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
        Pet Information
      </CustomText>
      <CustomText style={tw`text-gray-500 text-sm mb-6`}>
        {reportType === "lost"
          ? "Tell us about the lost pet"
          : "Describe the found pet"}
      </CustomText>

      <CustomInput
        label={reportType === "lost" ? "Pet Name *" : "Pet Name (If known)"}
        placeholder={
          reportType === "lost"
            ? "What is their name?"
            : "e.g. 'Buddy' (from tag) or leave blank"
        }
        value={form.petName}
        onChangeText={(text) => handleChange("petName", text)}
      />

      <CustomText weight="SemiBold" style={tw`mt-3 mb-2`}>
        Species *
      </CustomText>
      <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-4`}>
        {["Dog", "Cat"].map((item) => {
          const selected = form.species === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => handleChange("species", item)}
              style={tw`flex-1 py-3 rounded-xl items-center ${
                selected ? "bg-white shadow" : ""
              }`}
            >
              <CustomText
                weight="SemiBold"
                style={tw`text-xs ${
                  selected ? "text-orange-600" : "text-gray-600"
                }`}
              >
                {item}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>

      {form.species && (
        <CustomInput
          label="Breed (Optional)"
          placeholder={`${form.species} breed`}
          value={form.breed}
          onChangeText={(text) => handleChange("breed", text)}
        />
      )}

      <CustomText weight="SemiBold" style={tw`mt-4 mb-2`}>
        Sex
      </CustomText>
      <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-4`}>
        {["Male", "Female", "Unknown"].map((item) => {
          const selected = form.sex === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => handleChange("sex", item)}
              style={tw`flex-1 py-3 rounded-xl items-center ${
                selected ? "bg-white shadow" : ""
              }`}
            >
              <CustomText
                weight="SemiBold"
                style={tw`text-xs ${
                  selected ? "text-orange-600" : "text-gray-600"
                }`}
              >
                {item}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>

      <CustomInput
        label="Color & Markings (Optional)"
        placeholder="e.g., Brown with white spot on chest"
        value={form.color}
        onChangeText={(text) => handleChange("color", text)}
      />

      <CustomInput
        label="Distinguishing Features (Optional)"
        placeholder={
          reportType === "found"
            ? "e.g., Unique markings (you may keep some details private to verify the owner later)"
            : "e.g., Scar, collar, microchip number"
        }
        value={form.distinguishingMarks}
        onChangeText={(text) => handleChange("distinguishingMarks", text)}
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
        {reportType === "lost" ? "Last Seen" : "Found"} Information
      </CustomText>
      <CustomText style={tw`text-gray-500 text-sm mb-6`}>
        {reportType === "lost"
          ? "When and where was the pet last seen?"
          : "When and where did you find the pet?"}
      </CustomText>

      <DateTimeSelector
        label={reportType === "lost" ? "Date & Time Lost" : "Date & Time Found"}
        value={form.dateTime}
        onChange={(dateTime) => {
          console.log("[v0] DateTime changed to:", dateTime);
          handleChange("dateTime", dateTime);
        }}
      />

      <LocationPicker
        label={reportType === "lost" ? "Location Last Seen" : "Location Found"}
        placeholder={
          reportType === "lost"
            ? "Where were they last seen?"
            : "Where did you find them?"
        }
        value={form.location} // This now passes the address string for display
        onChange={(locationData) => handleChange("locationData", locationData)}
      />

      <CustomInput
        label="Additional Notes (Optional)"
        placeholder="Any other information that might help?"
        multiline
        numberOfLines={4}
        value={form.additionalNotes}
        onChangeText={(text) => handleChange("additionalNotes", text)}
      />

      <View style={tw`mt-8 pt-6 border-t border-gray-200`}>
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
            Contact Information
          </CustomText>
          <TouchableOpacity
            onPress={() => setContactEditModal(true)}
            style={tw`flex-row items-center gap-1`}
          >
            <Ionicons name="pencil" size={16} color="#F59549" />
            <CustomText style={tw`text-orange-500 text-sm font-medium`}>
              Edit
            </CustomText>
          </TouchableOpacity>
        </View>

        <View style={tw`bg-gray-50 rounded-2xl p-4 border border-gray-200`}>
          <View style={tw`mb-4`}>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>Name</CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.reporterName || "Not provided"}
            </CustomText>
          </View>

          <View style={tw`mb-4`}>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>
              Email
            </CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.email || "Not provided"}
            </CustomText>
          </View>

          <View>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>
              Phone
            </CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.phone || "Not provided"}
            </CustomText>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const renderContactEditModal = () => (
    <Modal animationType="slide" transparent={false} visible={contactEditModal}>
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header */}
          <View
            style={tw`px-6 pt-4 pb-2 border-b border-gray-100 flex-row justify-between items-center`}
          >
            <TouchableOpacity
              onPress={() => setContactEditModal(false)}
              style={tw`p-2`}
            >
              <Ionicons name="close-outline" size={28} color="#1F2937" />
            </TouchableOpacity>
            <CustomText weight="Bold" style={tw`text-lg`}>
              Edit Contact Info
            </CustomText>
            <View style={tw`w-10`} />
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`px-6 pt-6`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Your Contact Information
            </CustomText>
            <CustomText style={tw`text-gray-500 text-sm mb-6`}>
              {reportType === "lost"
                ? "So people can reach you with leads"
                : "So the owner can contact you"}
            </CustomText>

            <CustomInput
              label="Your Name *"
              placeholder="Full name"
              value={form.reporterName}
              onChangeText={(text) => handleChange("reporterName", text)}
            />

            <CustomInput
              label="Email Address *"
              placeholder="your@email.com"
              value={form.email}
              onChangeText={(text) => handleChange("email", text)}
            />

            <CustomInput
              label="Phone Number *"
              placeholder="Your phone number"
              value={form.phone}
              onChangeText={(text) => handleChange("phone", text)}
            />

            {/* Extra padding for keyboard */}
            <View style={tw`h-40`} />
          </ScrollView>

          {/* Button stays at bottom */}
          <View style={tw`p-6 border-t border-gray-100 bg-white`}>
            <TouchableOpacity
              onPress={() => setContactEditModal(false)}
              style={tw`bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
            >
              <CustomText weight="Bold" style={tw`text-white`}>
                Done
              </CustomText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const handlePetSelect = (pet) => {
    if (selectedPetId === pet.id) {
      setSelectedPetId(null);
      setIsPreFilled(false);
      setForm((prev) => ({
        ...prev,
        petName: "",
        species: "",
        breed: "",
        sex: "",
        color: "",
        distinguishingMarks: "",
        photos: [],
      }));
    } else {
      setSelectedPetId(pet.id);
      setIsPreFilled(true);

      const photosArray = [];
      if (
        pet.photoUrl &&
        typeof pet.photoUrl === "string" &&
        pet.photoUrl.trim()
      ) {
        photosArray.push(pet.photoUrl);
      }
      if (pet.photos && Array.isArray(pet.photos) && pet.photos.length > 0) {
        photosArray.push(...pet.photos.filter((p) => p));
      }

      console.log("[v0] Pet selected:", {
        petId: pet.id,
        petName: pet.name,
        photosArray: photosArray,
        photosLength: photosArray.length,
      });

      setForm((prev) => ({
        ...prev,
        petName: pet.name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        sex: pet.sex || "",
        color: pet.color || "",
        distinguishingMarks: pet.distinguishingMarks || "",
        photos: photosArray,
      }));
      if (currentStep === 1) setCurrentStep(2);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {renderEmptyState()}

      <Modal animationType="slide" transparent={false} visible={modalVisible}>
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <KeyboardAvoidingView
            style={tw`flex-1`}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} // Add this
          >
            {/* Header - Fixed */}
            <View
              style={tw`px-6 pt-4 pb-2 border-b border-gray-100 flex-row justify-between items-center`}
            >
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setReportType(null);
                  setCurrentStep(1);
                }}
                style={tw`p-2`}
              >
                <Ionicons name="close-outline" size={28} color="#1F2937" />
              </TouchableOpacity>
              <CustomText weight="Bold" style={tw`text-lg`}>
                {reportType === "lost" ? "Report Lost Pet" : "Report Found Pet"}
              </CustomText>
              <View style={tw`w-10`} />
            </View>

            {/* Scrollable content */}
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`px-6 pt-6`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" // Add this
            >
              {renderStepIndicator()}
              {renderStepContent()}
              {/* Add extra padding at bottom for keyboard */}
              <View style={tw`h-40`} />
            </ScrollView>

            {/* Buttons - This stays at bottom and moves with keyboard */}
            <View style={tw`p-6 border-t border-gray-100 bg-white`}>
              <View style={tw`flex-row gap-3`}>
                {currentStep > 1 ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setCurrentStep((prev) => prev - 1)}
                      style={tw`flex-1 bg-gray-100 py-4 rounded-2xl items-center`}
                    >
                      <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                        Back
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        currentStep === 3
                          ? handleSubmit()
                          : setCurrentStep((prev) => prev + 1)
                      }
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
                    >
                      <CustomText weight="Bold" style={tw`text-white`}>
                        {currentStep === 3
                          ? loading
                            ? "Submitting..."
                            : "Submit Report"
                          : "Continue"}
                      </CustomText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => setCurrentStep((prev) => prev + 1)}
                    style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
                  >
                    <CustomText weight="Bold" style={tw`text-white`}>
                      Continue
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {renderContactEditModal()}
    </SafeAreaView>
  );
}
