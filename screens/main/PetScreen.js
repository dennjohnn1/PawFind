import { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import DateOfBirthPicker from "../../components/CustomDatePicker";
import PetDetailsModal from "../../components/PetDetailsModal";

import PetService from "../../service/PetService";
import CloudinaryService from "../../service/CloudinaryService";
import CertificateService from "../../service/CertificateService";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import AuthService from "../../service/AuthService";

export default function PetScreen() {
  const [pets, setPets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPet, setSelectedPet] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const auth = getAuth();

  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    sex: "",
    dateOfBirth: null,
    color: "",
    photoUrl: "",
    distinguishingMarks: "",

    ownerId: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    ownerAddress: "", // ADDED: Owner address field

    vaccinations: [],
    allergies: "",
    medicalNotes: "",

    certificate: {
      number: "",
      url: "",
      issuedAt: null,
      issuedBy: "PawFind",
      status: "not_generated",
    },
  });

  // Reset form when modal closes
  const resetForm = () => {
    setForm({
      name: "",
      species: "",
      breed: "",
      sex: "",
      dateOfBirth: null,
      color: "",
      photoUrl: "",
      distinguishingMarks: "",

      ownerId: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      ownerAddress: "", // ADDED: Reset owner address

      vaccinations: [],
      allergies: "",
      medicalNotes: "",

      certificate: {
        number: "",
        url: "",
        issuedAt: null,
        issuedBy: "PawFind",
        status: "not_generated",
      },
    });
    setCurrentStep(1);
    setIsEditMode(false);
    setEditingPetId(null);
  };

  const SkeletonShimmer = ({ style }) => {
    const shimmerAnim = useRef(new Animated.Value(-400)).current;

    useEffect(() => {
      const loopAnim = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 400,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loopAnim.start();
      return () => loopAnim.stop();
    }, []);

    const shimmerTranslateX = shimmerAnim.interpolate({
      inputRange: [-400, 400],
      outputRange: [-400, 400],
    });

    return (
      <View style={[style, tw`overflow-hidden bg-gray-100 relative`]}>
        <Animated.View
          style={[
            tw`absolute top-0 left-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/50 to-transparent`,
            {
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        />
      </View>
    );
  };

  useEffect(() => {
    fetchPets();

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Animate empty state when it becomes visible
  useEffect(() => {
    if (!initialLoading && pets.length === 0) {
      // Reset animation values
      slideAnim.setValue(50);
      opacityAnim.setValue(0);

      // Animate in sequence
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
    }
  }, [initialLoading, pets.length]);

  const fetchPets = async () => {
    try {
      const data = await PetService.getMyPets();
      setPets(data);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
  };

  const openModal = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      // Fetch user profile from Firestore
      const profileRes = await AuthService.getUserProfile();
      let ownerName = "";
      let ownerPhone = "";
      let ownerAddress = "";

      if (profileRes.success && profileRes.data) {
        const data = profileRes.data;
        ownerName =
          data.fullName ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim();
        ownerPhone = data.phone || "";
        // Get address from location object
        ownerAddress = data.location?.address || "";
        
        // If address is not in location.address, try to build it from location components
        if (!ownerAddress && data.location) {
          const loc = data.location;
          ownerAddress = [
            loc.street,
            loc.barangay,
            loc.city,
            loc.province,
            loc.postalCode
          ]
            .filter(Boolean)
            .join(", ");
        }
      }

      setForm((prev) => ({
        ...prev,
        ownerId: user.uid,
        ownerName,
        ownerEmail: user.email || "",
        ownerPhone,
        ownerAddress,
      }));

      setModalVisible(true);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      Alert.alert("Error", "Unable to fetch user info. Please try again.");
    }
  };

  // Open edit modal with existing pet data
  const openEditModal = async (pet) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      // Format date for the picker - handle different date formats
      let formattedDateOfBirth = null;

      if (pet.dateOfBirth) {
        if (pet.dateOfBirth.seconds) {
          // Firebase timestamp
          const date = new Date(pet.dateOfBirth.seconds * 1000);
          formattedDateOfBirth = {
            year: date.getFullYear(),
            month: date.getMonth() + 1, // months are 0-indexed in JS Date
            day: date.getDate(),
          };
        } else if (pet.dateOfBirth instanceof Date) {
          // JavaScript Date object
          formattedDateOfBirth = {
            year: pet.dateOfBirth.getFullYear(),
            month: pet.dateOfBirth.getMonth() + 1,
            day: pet.dateOfBirth.getDate(),
          };
        } else if (
          pet.dateOfBirth.year &&
          pet.dateOfBirth.month &&
          pet.dateOfBirth.day
        ) {
          // Already in {year, month, day} format
          formattedDateOfBirth = {
            year: pet.dateOfBirth.year,
            month: pet.dateOfBirth.month,
            day: pet.dateOfBirth.day,
          };
        } else if (typeof pet.dateOfBirth === "string") {
          // Try to parse string date
          const date = new Date(pet.dateOfBirth);
          if (!isNaN(date.getTime())) {
            formattedDateOfBirth = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            };
          }
        }
      }

      console.log("Pet dateOfBirth:", pet.dateOfBirth);
      console.log("Formatted date for picker:", formattedDateOfBirth);

      // Format vaccinations array to string for the input
      const vaccinationsString = Array.isArray(pet.vaccinations)
        ? pet.vaccinations.join(", ")
        : pet.vaccinations || "";

      setForm({
        name: pet.name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        sex: pet.sex || "",
        dateOfBirth: formattedDateOfBirth,
        color: pet.color || "",
        photoUrl: pet.photoUrl || "",
        distinguishingMarks: pet.distinguishingMarks || "",

        ownerId: pet.ownerId || user.uid,
        ownerName: pet.ownerName || "",
        ownerEmail: pet.ownerEmail || user.email || "",
        ownerPhone: pet.ownerPhone || "",
        ownerAddress: pet.ownerAddress || "", // Use pet's existing address

        vaccinations: pet.vaccinations || [],
        allergies: pet.allergies || "",
        medicalNotes: pet.medicalNotes || "",

        certificate: pet.certificate || {
          number: "",
          url: "",
          issuedAt: null,
          issuedBy: "PawFind",
          status: "not_generated",
        },
      });

      setEditingPetId(pet.id);
      setIsEditMode(true);
      setModalVisible(true);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error opening edit modal:", error);
      Alert.alert("Error", "Unable to load pet data. Please try again.");
    }
  };

  const handleChange = (key, value) => {
    if (key === "species") {
      setForm({ ...form, species: value, breed: "" });
    } else if (key === "vaccinations") {
      // Handle vaccinations specially if it's a string
      if (typeof value === "string") {
        setForm({
          ...form,
          vaccinations: value.split(",").map((v) => v.trim()),
        });
      } else {
        setForm({ ...form, [key]: value });
      }
    } else {
      setForm({ ...form, [key]: value });
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setLoading(true);
      const url = await CloudinaryService.uploadFile(
        result.assets[0].uri,
        "image"
      );
      setForm({ ...form, photoUrl: url });
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.species || !form.sex || !form.dateOfBirth) {
      Alert.alert("Missing information", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      // Prepare the data for saving
      const saveData = {
        name: form.name,
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        color: form.color,
        photoUrl: form.photoUrl,
        distinguishingMarks: form.distinguishingMarks,
        ownerId: form.ownerId,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        ownerEmail: form.ownerEmail,
        ownerAddress: form.ownerAddress, // Include owner address
        vaccinations: form.vaccinations,
        allergies: form.allergies,
        medicalNotes: form.medicalNotes,
      };

      // Format date properly for Firestore
      if (form.dateOfBirth) {
        if (
          form.dateOfBirth.year &&
          form.dateOfBirth.month &&
          form.dateOfBirth.day
        ) {
          // Date is already in {year, month, day} format from the picker
          saveData.dateOfBirth = form.dateOfBirth;
        } else if (form.dateOfBirth instanceof Date) {
          // Convert Date object to {year, month, day} format
          saveData.dateOfBirth = {
            year: form.dateOfBirth.getFullYear(),
            month: form.dateOfBirth.getMonth() + 1,
            day: form.dateOfBirth.getDate(),
          };
        }
      }

      if (isEditMode && editingPetId) {
        // Update existing pet
        await PetService.updatePet(editingPetId, saveData);
      } else {
        // Create new pet
        const petId = await PetService.addPet(saveData);

        // Generate certificate for new pets only
        const certificateNumber =
          CertificateService.generateCertificateNumber(petId);
        const pdfUri = await CertificateService.generateCertificatePDF(
          saveData,
          certificateNumber
        );
        const certificateUrl = await CertificateService.uploadCertificate(
          pdfUri
        );

        await PetService.updatePet(petId, {
          certificate: {
            number: certificateNumber,
            url: certificateUrl,
            issuedAt: new Date(),
            issuedBy: "PawFind",
            status: "generated",
          },
        });
      }

      setModalVisible(false);
      resetForm();
      fetchPets();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePetUpdated = (pet, action) => {
    if (action === "edit") {
      openEditModal(pet);
    } else if (action === "delete") {
      fetchPets();
    }
  };

  // Card-style minimal empty state with animation
  const renderEmptyState = () => (
    <View style={tw`flex-1 bg-white`}>
      {/* Consistent header */}
      <View style={tw`flex-row justify-between items-center px-6 pt-2 pb-4`}>
        <View>
          <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
            My Pets
          </CustomText>
          <CustomText style={tw`text-gray-500 text-[12px]`}>
            Manage your pet family
          </CustomText>
        </View>
      </View>

      {/* Empty state as a card that matches pet card style */}
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`flex-grow`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Animated.View
            style={[
              tw`w-full max-w-sm bg-white p-6`,
              {
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Icon with subtle bounce animation */}
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
                style={tw`w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4`}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={30}
                  color="#9CA3AF"
                />
              </View>

              <CustomText weight="Bold" style={tw`text-gray-900 text-lg mb-1`}>
                Your pet list is empty
              </CustomText>
              <CustomText style={tw`text-gray-500 text-sm text-center`}>
                Register a pet to see it here
              </CustomText>
            </Animated.View>

            {/* Benefits list with staggered animation */}
            <View style={tw`space-y-4 mb-8`}>
              <Animated.View
                style={[
                  tw`flex-row items-center mb-2`,
                  {
                    opacity: opacityAnim,
                    transform: [
                      {
                        translateX: opacityAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={tw`w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-3`}
                >
                  <Ionicons name="checkmark" size={14} color="#F59549" />
                </View>
                <CustomText style={tw`text-gray-700 text-sm`}>
                  Create digital pet profile
                </CustomText>
              </Animated.View>

              <Animated.View
                style={[
                  tw`flex-row items-center`,
                  {
                    opacity: opacityAnim,
                    transform: [
                      {
                        translateX: opacityAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={tw`w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-3`}
                >
                  <Ionicons name="checkmark" size={14} color="#F59549" />
                </View>
                <CustomText style={tw`text-gray-700 text-sm`}>
                  Generate official certificate
                </CustomText>
              </Animated.View>
            </View>

            {/* Register Pet button with fade animation */}
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
                onPress={openModal}
                style={tw`bg-[#F59549] w-full py-4 rounded-xl active:bg-[#E58539]`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`text-white text-center text-[14px]`}
                >
                  Register Pet
                </CustomText>
              </TouchableOpacity>
            </Animated.View>

            {/* Optional small hint */}
            <Animated.View
              style={{
                opacity: opacityAnim,
              }}
            >
              <CustomText style={tw`text-gray-400 text-xs text-center mt-4`}>
                Takes less than 2 minutes
              </CustomText>
            </Animated.View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );

  const renderPetList = () => (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`flex-row justify-between items-center px-6 pt-2 pb-4`}>
        <View>
          <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
            My Pets
          </CustomText>
          <CustomText style={tw`text-gray-500 text-[12px]`}>
            Manage your pet family
          </CustomText>
        </View>
        <TouchableOpacity
          onPress={openModal}
          style={tw`bg-orange-500 p-2 rounded-full shadow-lg shadow-orange-200`}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1 px-6`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pets.map((pet) => (
          <TouchableOpacity
            key={pet.id}
            activeOpacity={0.9}
            onPress={() => {
              setSelectedPet(pet);
              setDetailsModalVisible(true);
            }}
            style={tw`bg-white border border-gray-100 rounded-[24px] p-4 mb-4 flex-row items-center shadow-sm`}
          >
            {pet.photoUrl ? (
              <Image
                source={{ uri: pet.photoUrl }}
                style={tw`w-24 h-24 rounded-2xl`}
              />
            ) : (
              <View
                style={tw`w-24 h-24 rounded-2xl bg-gray-300 items-center justify-center`}
              >
                <Ionicons name="paw" size={32} color="#9CA3AF" />
              </View>
            )}
            <View style={tw`flex-1 ml-4`}>
              <View style={tw`flex-row items-center`}>
                <CustomText
                  weight="Bold"
                  style={tw`text-lg text-gray-900 mr-2`}
                >
                  {pet.name}
                </CustomText>
                <View style={tw`bg-orange-50 rounded-full px-2 py-0.5`}>
                  <CustomText
                    weight="SemiBold"
                    style={tw`text-orange-600 text-[10px] uppercase`}
                  >
                    {pet.species}
                  </CustomText>
                </View>
              </View>
              <CustomText style={tw`text-gray-500 text-xs mt-0.5`}>
                {pet.breed || "Unknown Breed"}
              </CustomText>

              <View style={tw`flex-row mt-3`}>
                <View
                  style={tw`flex-row items-center bg-gray-50 rounded-lg px-2 py-1 mr-2`}
                >
                  <Ionicons
                    name={pet.sex === "Male" ? "male" : "female"}
                    size={12}
                    color="#6B7280"
                    style={tw`mr-1`}
                  />
                  <CustomText style={tw`text-gray-600 text-[11px]`}>
                    {pet.sex}
                  </CustomText>
                </View>
                {pet.weight && (
                  <View
                    style={tw`flex-row items-center bg-gray-50 rounded-lg px-2 py-1`}
                  >
                    <Ionicons
                      name="fitness"
                      size={12}
                      color="#6B7280"
                      style={tw`mr-1`}
                    />
                    <CustomText style={tw`text-gray-600 text-[11px]`}>
                      {pet.weight} kg
                    </CustomText>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
        <View style={tw`h-10`} />
      </ScrollView>

      <PetDetailsModal
        visible={detailsModalVisible}
        pet={selectedPet}
        onClose={() => setDetailsModalVisible(false)}
        onPetUpdated={handlePetUpdated}
      />
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {initialLoading ? (
        <SafeAreaView style={tw`flex-1 bg-white`}>
          {/* Header skeleton */}
          <View
            style={tw`flex-row justify-between items-center px-6 pt-2 pb-4`}
          >
            <View>
              <SkeletonShimmer style={tw`h-7 w-40 mb-1`} />
              <SkeletonShimmer style={tw`h-3 w-24`} />
            </View>
            <SkeletonShimmer style={tw`w-12 h-12 rounded-full`} />
          </View>

          {/* Skeleton pet cards */}
          <ScrollView
            style={tw`flex-1 px-6`}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((key) => (
              <View
                key={key}
                style={tw`bg-white border border-gray-100 rounded-[24px] p-4 mb-4 flex-row items-center shadow-sm`}
              >
                {/* Pet image skeleton */}
                <SkeletonShimmer style={tw`w-24 h-24 rounded-2xl`} />

                <View style={tw`flex-1 ml-4`}>
                  {/* Name and species skeleton */}
                  <View style={tw`flex-row items-center mb-2`}>
                    <SkeletonShimmer style={tw`h-5 w-28 mr-2`} />
                    <SkeletonShimmer style={tw`h-5 w-16 rounded-full`} />
                  </View>

                  {/* Breed skeleton */}
                  <SkeletonShimmer style={tw`h-3 w-20 mb-3`} />

                  {/* Tags skeleton */}
                  <View style={tw`flex-row`}>
                    <SkeletonShimmer style={tw`w-16 h-7 rounded-lg mr-2`} />
                    <SkeletonShimmer style={tw`w-16 h-7 rounded-lg`} />
                  </View>
                </View>

                {/* Chevron skeleton */}
                <SkeletonShimmer style={tw`w-5 h-5 rounded`} />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      ) : pets.length === 0 ? (
        renderEmptyState()
      ) : (
        renderPetList()
      )}

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        statusBarTranslucent={false}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <KeyboardAvoidingView
            style={tw`flex-1`}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            {/* Modal Header - Fixed at top */}
            <View
              style={tw`px-6 py-4 border-b border-gray-100 flex-row justify-between items-center`}
            >
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                style={tw`p-2`}
              >
                <Ionicons name="close-outline" size={28} color="#1F2937" />
              </TouchableOpacity>
              <CustomText weight="Bold" style={tw`text-lg`}>
                {isEditMode ? "Edit Pet" : "Registration"}
              </CustomText>
              <View style={tw`w-10`} />
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`px-6 pt-6 pb-32`} // Increased bottom padding
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {renderStepIndicator()}
              {renderStepContent()}
            </ScrollView>

            {/* Footer Buttons - Will move up with keyboard on iOS */}
            <View
              style={[
                tw`p-6 border-t border-gray-100 bg-white`,
                // Apply padding only on iOS since Android handles it differently
                Platform.OS === "ios" && isKeyboardVisible
                  ? { paddingBottom: keyboardHeight }
                  : {},
              ]}
            >
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
                        currentStep === 4
                          ? handleSubmit()
                          : setCurrentStep((prev) => prev + 1)
                      }
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
                    >
                      <CustomText weight="Bold" style={tw`text-white`}>
                        {currentStep === 4
                          ? loading
                            ? "Saving..."
                            : isEditMode
                            ? "Update"
                            : "Register"
                          : "Continue"}
                      </CustomText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        resetForm();
                      }}
                      style={tw`flex-1 bg-gray-100 py-4 rounded-2xl items-center`}
                    >
                      <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                        Cancel
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCurrentStep((prev) => prev + 1)}
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200`}
                    >
                      <CustomText weight="Bold" style={tw`text-white`}>
                        Continue
                      </CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );

  function renderStepIndicator() {
    return (
      <View style={tw`flex-row justify-between mb-8`}>
        {[1, 2, 3, 4].map((step) => (
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
            {step < 4 && (
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
  }

  function renderStepContent() {
    const renderPhotoStep = () => (
      <View>
        <CustomText weight="SemiBold" style={tw`text-sm mb-3`}>
          Photo of the Pet
        </CustomText>
        <TouchableOpacity
          onPress={handlePickImage}
          style={tw`border-2 border-orange-400 rounded-3xl items-center justify-center mb-6 ${
            form.photoUrl ? "border-0" : ""
          }`}
        >
          {form.photoUrl ? (
            <Image
              source={{ uri: form.photoUrl }}
              style={tw`w-full h-58 rounded-2xl`}
              resizeMode="cover"
            />
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
              <CustomText style={tw`text-red-500 text-xs ps-8 pe-8 pb-8`}>
                Required
              </CustomText>
            </>
          )}
        </TouchableOpacity>
      </View>
    );

    switch (currentStep) {
      case 1:
        return (
          <View>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Identity & Photo
            </CustomText>
            <CustomText style={tw`text-gray-500 text-sm mb-6`}>
              Let's start with the basics
            </CustomText>
            {renderPhotoStep()}
            <CustomInput
              label="Pet Name *"
              placeholder="What do you call them?"
              value={form.name}
              onChangeText={(text) => handleChange("name", text)}
            />
          </View>
        );
      case 2:
        return (
          <View>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Physical Traits
            </CustomText>
            <CustomText style={tw`text-gray-500 text-sm mb-6`}>
              Details about their appearance
            </CustomText>

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
                      style={tw`${
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
                label="Breed"
                placeholder={`Enter ${form.species} breed`}
                value={form.breed}
                onChangeText={(text) => handleChange("breed", text)}
              />
            )}

            <CustomText weight="SemiBold" style={tw`mt-4 mb-2`}>
              Sex
            </CustomText>
            <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-4`}>
              {["Male", "Female"].map((item) => {
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

            <DateOfBirthPicker
              value={form.dateOfBirth}
              onDateChange={(dob) => handleChange("dateOfBirth", dob)}
            />

            <CustomInput
              label="Color"
              placeholder="Enter color"
              value={form.color}
              onChangeText={(text) => handleChange("color", text)}
            />
            <CustomInput
              label="Distinguishing Marks"
              placeholder="e.g. White spot on left ear"
              value={form.distinguishingMarks}
              onChangeText={(text) => handleChange("distinguishingMarks", text)}
            />
          </View>
        );
      case 3:
        return (
          <View>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Health Profile
            </CustomText>
            <CustomText style={tw`text-gray-500 text-sm mb-6`}>
              Important medical information
            </CustomText>
            <CustomInput
              label="Vaccinations"
              placeholder="Enter vaccinations (comma separated)"
              value={
                Array.isArray(form.vaccinations)
                  ? form.vaccinations.join(", ")
                  : form.vaccinations
              }
              onChangeText={(text) => handleChange("vaccinations", text)}
            />
            <CustomInput
              label="Allergies"
              placeholder="Any allergies"
              value={form.allergies}
              onChangeText={(text) => handleChange("allergies", text)}
            />
            <CustomInput
              label="Medical Notes"
              placeholder="Additional medical notes"
              value={form.medicalNotes}
              onChangeText={(text) => handleChange("medicalNotes", text)}
            />
          </View>
        );
      case 4:
        return (
          <View>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Owner Info
            </CustomText>
            <CustomText style={tw`text-gray-500 text-sm mb-6`}>
              Confirm your contact details
            </CustomText>
            <CustomInput
              label="Owner Name"
              value={form.ownerName}
              editable={false}
            />
            <CustomInput
              label="Email Address"
              value={form.ownerEmail}
              editable={false}
            />
            <CustomInput
              label="Phone Number"
              placeholder="Enter phone"
              value={form.ownerPhone}
              onChangeText={(text) => handleChange("ownerPhone", text)}
            />
            <CustomInput
              label="Address"
              placeholder="Enter your address"
              value={form.ownerAddress}
              onChangeText={(text) => handleChange("ownerAddress", text)}
            />
          </View>
        );
      default:
        return null;
    }
  }
}