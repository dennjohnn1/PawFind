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
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import tw from "twrnc";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import DateTimeSelector from "../../components/CustomDateTimeSelector";
import LocationPicker from "../../components/LocationPicker";
import PetSelector from "../../components/PetSelector";
import PotentialMatchesModal from "../../components/PotentialMatchesModal";
import FeedbackModal from "../../components/FeedbackModal";
import { auth } from "../../firebase";
import AuthService from "../../service/AuthService";
import PetService from "../../service/PetService";
import CloudinaryService from "../../service/CloudinaryService";
import MatchingService from "../../service/MatchingService";
import DraftService from "../../service/DraftService";
import PetImageAnalysisService from "../../service/PetImageAnalysisService"; // Import AI service
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

export default function ReportScreen({ route }) {
  const navigation = useNavigation();
  const [myPets, setMyPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [contactEditModal, setContactEditModal] = useState(false);

  // Draft states
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  // Validation states
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback modal states
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState("success");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Matching system states
  const [matchesModalVisible, setMatchesModalVisible] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState(null);

  // AI Image Analysis states
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [aiValidationResult, setAiValidationResult] = useState(null);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState({
    photos: [],
    petName: "",
    species: "",
    breed: "",
    sex: "",
    color: "",
    distinguishingMarks: "",
    dateTime: new Date().toISOString(),
    location: "",
    locationData: { address: "", coordinates: null },
    additionalNotes: "",
    reporterName: "",
    email: "",
    phone: "",
  });

  // Validation helper functions
  const validatePhotos = (photos) => {
    if (!photos || photos.length === 0) {
      return "At least one photo is required";
    }

    if (photos.length > 4) {
      return "Maximum 4 photos allowed";
    }

    // Check if any photo is invalid (optional - could add file type/size validation)
    return null;
  };

  const validateRequiredField = (value, fieldName) => {
    if (!value || value.trim() === "") {
      return `${fieldName} is required`;
    }
    return null;
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return "Phone number is required";

    const trimmedPhone = phone.trim();
    const digitsOnly = trimmedPhone.replace(/[\s\-\(\)]/g, "");

    if (digitsOnly.length < 10) {
      return "Phone number must be at least 10 digits";
    }

    if (digitsOnly.length > 15) {
      return "Phone number must not exceed 15 digits";
    }

    if (!/^\+?[\d\s\-\(\)]+$/.test(trimmedPhone)) {
      return "Phone number contains invalid characters";
    }

    return null;
  };

  const validateEmail = (email) => {
    if (!email) return "Email is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return "Please enter a valid email address";
    }

    return null;
  };

  const validateLocation = (locationData) => {
    if (!locationData || !locationData.coordinates) {
      return "Please select a location on the map";
    }

    if (!locationData.address || locationData.address.trim() === "") {
      return "Please enter location details";
    }

    return null;
  };

  const validateDateTime = (dateTime) => {
    if (!dateTime) return "Date and time are required";

    const selectedDate = new Date(dateTime);
    const now = new Date();

    if (selectedDate > now) {
      return "Date and time cannot be in the future";
    }

    // Allow reports up to 30 days in the past (adjustable)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (selectedDate < thirtyDaysAgo) {
      return "Date cannot be more than 30 days in the past";
    }

    return null;
  };

  const validateCurrentStep = () => {
    const errors = {};

    switch (currentStep) {
      case 1: // PHOTOS
        const photoError = validatePhotos(form.photos);
        if (photoError) errors.photos = photoError;
        break;

      case 2: // PET DETAILS
        // Species is required for both lost and found
        if (!form.species) {
          errors.species = "Please select the species (Dog/Cat)";
        }

        // Sex is required for both lost and found
        if (!form.sex) {
          errors.sex = "Please select the sex";
        }

        // Pet Name is required ONLY for 'Lost' reports
        if (reportType === "lost") {
          const nameError = validateRequiredField(form.petName, "Pet Name");
          if (nameError) errors.petName = nameError;
        }
        break;

      case 3: // LOCATION & CONTACT
        // Location and dateTime are required for BOTH lost and found
        const locationError = validateLocation(form.locationData);
        if (locationError) errors.location = locationError;

        const dateTimeError = validateDateTime(form.dateTime);
        if (dateTimeError) errors.dateTime = dateTimeError;

        // Contact info is required ONLY for lost reports
        if (reportType === "lost") {
          const nameError = validateRequiredField(
            form.reporterName,
            "Your name"
          );
          if (nameError) errors.reporterName = nameError;

          const emailError = validateEmail(form.email);
          if (emailError) errors.email = emailError;

          const phoneError = validatePhoneNumber(form.phone);
          if (phoneError) errors.phone = phoneError;
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showFeedback = (type, message) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackVisible(true);
  };

  // AI Image Analysis function
  const analyzeImageWithAI = async (imageUri, isMainPhoto = false) => {
    try {
      setIsAnalyzingImage(true);

      // Upload image to get URL for analysis
      const imageUrl = await CloudinaryService.uploadFile(imageUri, "image");

      // Analyze the image using the same service as pet registration
      const analysis = await PetImageAnalysisService.analyzePetImage(imageUrl);
      console.log("AI Analysis Result:", analysis);

      // Check if the image is actually a pet (dog or cat)
      if (
        analysis.species &&
        (analysis.species === "Dog" || analysis.species === "Cat")
      ) {
        setAiValidationResult({
          isValid: true,
          species: analysis.species,
          breed: analysis.breed,
          confidence: analysis.confidence?.species || "medium",
          message: `Great! This appears to be a ${analysis.species}${
            analysis.breed && analysis.breed !== "Unknown"
              ? ` (likely ${analysis.breed})`
              : ""
          }`,
        });

        // If this is the main photo and we have valid species, auto-fill species field
        if (isMainPhoto && analysis.species && !form.species) {
          setForm((prev) => ({ ...prev, species: analysis.species }));
        }

        // Show success feedback
        showFeedback("success", "Valid pet image detected!");

        return {
          isValid: true,
          species: analysis.species,
          analysis: analysis,
        };
      } else {
        // Not a valid pet image
        setAiValidationResult({
          isValid: false,
          species: analysis.species || "Unknown",
          message:
            "This doesn't appear to be a dog or cat. Please upload a clear photo of a pet.",
        });

        showFeedback("error", "Please upload a clear photo of a dog or cat.");
        return {
          isValid: false,
          species: analysis.species,
          message: "Not a valid pet image",
        };
      }
    } catch (error) {
      console.error("AI Analysis error:", error);
      showFeedback(
        "error",
        "AI validation failed. Please ensure it's a clear pet photo."
      );
      return {
        isValid: false,
        error: error.message,
      };
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  useEffect(() => {
    loadUserPets();
    checkForDraft();
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

  useEffect(() => {
    loadUserPets();
    checkForDraft();
    // Animation logic
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

  // Add useEffect for back button handling
  useEffect(() => {
    const backAction = () => {
      if (modalVisible && (form.photos.length > 0 || form.species)) {
        handleCancel();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [modalVisible, form]);

  const checkForDraft = async () => {
    const draftExists = await DraftService.hasReportDraft();
    setHasDraft(draftExists);
  };

  const loadUserPets = async () => {
    try {
      const pets = await PetService.getMyPets();
      setMyPets(pets);
    } catch (error) {
      console.error("Error loading user pets:", error);
      showFeedback("error", "Failed to load your pets");
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
      // Check for existing draft first
      const existingDraft = await DraftService.getReportDraft();

      if (existingDraft && existingDraft.reportType === type) {
        setShowDraftPrompt(true);
        return;
      }

      const user = auth.currentUser;
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
      setFieldErrors({}); // Clear any previous errors

      if (prefillData && type === "lost") {
        setIsPreFilled(true);
        const photosArray = prefillData.photoUrl
          ? [prefillData.photoUrl]
          : prefillData.photos || [];
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
          email: user.email,
          phone,
        }));
      } else {
        setIsPreFilled(false);
        setForm((prev) => ({
          ...prev,
          reporterName,
          email: user.email,
          phone,
        }));
      }
      setModalVisible(true);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error opening modal:", error);
      showFeedback("error", "Unable to open report form");
    }
  };

  const handleCancel = async () => {
    setModalVisible(false);
    resetForm();
    return Promise.resolve(true);
  };

  const resetForm = () => {
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
      locationData: { address: "", coordinates: null },
      additionalNotes: "",
      reporterName: "",
      email: "",
      phone: "",
    });
    setCurrentStep(1);
    setIsPreFilled(false);
    setSelectedPetId(null);
    setFieldErrors({}); // Clear errors
    setIsSubmitting(false);
  };

  const handleChange = (key, value) => {
    // Clear error for this field when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    if (key === "species") {
      setForm({ ...form, species: value, breed: "" });
    } else if (key === "locationData") {
      setForm({
        ...form,
        location: value.address,
        locationData: value,
      });
      // Clear location error if location is selected
      if (fieldErrors.location) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.location;
          return newErrors;
        });
      }
    } else {
      setForm({ ...form, [key]: value });
    }
  };

  const AIVisualIndicator = () => {
    if (!aiValidationResult || form.photos.length === 0) return null;

    return (
      <View
        style={tw`mt-3 p-3 rounded-xl ${
          aiValidationResult.isValid
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <View style={tw`flex-row items-center`}>
          <Ionicons
            name={
              aiValidationResult.isValid ? "checkmark-circle" : "alert-circle"
            }
            size={16}
            color={aiValidationResult.isValid ? "#10b981" : "#ef4444"}
          />
          <CustomText
            style={tw`ml-2 text-xs pr-2 ${
              aiValidationResult.isValid ? "text-green-700" : "text-red-700"
            }`}
          >
            {aiValidationResult.message}
          </CustomText>
        </View>

        {aiValidationResult.isValid && aiValidationResult.confidence && (
          <View style={tw`mt-2 flex-row items-center`}>
            <Ionicons
              name={
                aiValidationResult.confidence === "high"
                  ? "shield-checkmark"
                  : aiValidationResult.confidence === "medium"
                  ? "information-circle"
                  : "warning"
              }
              size={16}
              color={
                aiValidationResult.confidence === "high"
                  ? "#10b981"
                  : aiValidationResult.confidence === "medium"
                  ? "#f59e0b"
                  : "#ef4444"
              }
            />
            <CustomText style={tw`ml-2 text-xs text-gray-600`}>
              Confidence: {aiValidationResult.confidence}
            </CustomText>
          </View>
        )}
      </View>
    );
  };

  const AISuggestionsModal = () => {
    if (!showAIOptions || !aiAnalysisResult) return null;

    return (
      <Modal transparent visible={showAIOptions} animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="sparkles" size={24} color="#F59549" />
              <CustomText weight="Bold" style={tw`text-lg ml-2`}>
                AI Suggestions
              </CustomText>
            </View>

            <View style={tw`mb-6`}>
              <CustomText style={tw`text-gray-600 text-sm mb-3`}>
                Based on image analysis, we detected:
              </CustomText>

              {aiAnalysisResult.species &&
                aiAnalysisResult.species !== "Unknown" && (
                  <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons
                      name={
                        aiAnalysisResult.confidence?.species === "high"
                          ? "checkmark-circle"
                          : "information-circle"
                      }
                      size={16}
                      color={
                        aiAnalysisResult.confidence?.species === "high"
                          ? "#10b981"
                          : "#f59e0b"
                      }
                    />
                    <CustomText style={tw`ml-2 text-sm`}>
                      Species: {aiAnalysisResult.species}
                      {aiAnalysisResult.confidence?.species && (
                        <CustomText style={tw`text-xs text-gray-500`}>
                          {" "}
                          ({aiAnalysisResult.confidence.species} confidence)
                        </CustomText>
                      )}
                    </CustomText>
                  </View>
                )}

              {aiAnalysisResult.breed &&
                aiAnalysisResult.breed !== "Unknown" && (
                  <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons
                      name={
                        aiAnalysisResult.confidence?.breed === "high"
                          ? "checkmark-circle"
                          : "information-circle"
                      }
                      size={16}
                      color={
                        aiAnalysisResult.confidence?.breed === "high"
                          ? "#10b981"
                          : "#f59e0b"
                      }
                    />
                    <CustomText style={tw`ml-2 text-sm`}>
                      Breed: {aiAnalysisResult.breed}
                      {aiAnalysisResult.confidence?.breed && (
                        <CustomText style={tw`text-xs text-gray-500`}>
                          {" "}
                          ({aiAnalysisResult.confidence.breed} confidence)
                        </CustomText>
                      )}
                    </CustomText>
                  </View>
                )}

              {aiAnalysisResult.sex && aiAnalysisResult.sex !== "Unknown" && (
                <View style={tw`flex-row items-center mb-2`}>
                  <Ionicons
                    name={
                      aiAnalysisResult.confidence?.sex === "high"
                        ? "checkmark-circle"
                        : "information-circle"
                    }
                    size={16}
                    color={
                      aiAnalysisResult.confidence?.sex === "high"
                        ? "#10b981"
                        : "#f59e0b"
                    }
                  />
                  <CustomText style={tw`ml-2 text-sm`}>
                    Sex: {aiAnalysisResult.sex}
                  </CustomText>
                </View>
              )}
            </View>

            <View style={tw`space-y-3`}>
              <TouchableOpacity
                onPress={() => {
                  // Apply AI suggestions to form
                  if (aiAnalysisResult.species && !form.species) {
                    setForm((prev) => ({
                      ...prev,
                      species: aiAnalysisResult.species,
                    }));
                  }
                  if (aiAnalysisResult.breed && !form.breed) {
                    setForm((prev) => ({
                      ...prev,
                      breed: aiAnalysisResult.breed,
                    }));
                  }
                  if (aiAnalysisResult.sex && !form.sex) {
                    setForm((prev) => ({ ...prev, sex: aiAnalysisResult.sex }));
                  }
                  setShowAIOptions(false);
                }}
                style={tw`bg-orange-500 py-4 rounded-xl active:bg-orange-600`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`text-white text-center`}
                >
                  Apply AI Suggestions
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowAIOptions(false);
                  setAiAnalysisResult(null);
                }}
                style={tw`border border-gray-300 py-4 rounded-xl active:bg-gray-50`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-700 text-center`}
                >
                  Fill Manually
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handlePickImage = async (isMainPhoto = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // File size validation (5MB max)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        showFeedback("error", "Please select an image smaller than 5MB");
        return;
      }

      // File type validation
      const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      const uri = asset.uri.toLowerCase();
      const hasValidExtension = validExtensions.some((ext) =>
        uri.endsWith(ext)
      );

      if (!hasValidExtension) {
        showFeedback("error", "Please select a JPEG, PNG, or WebP image");
        return;
      }

      setLoading(true);
      const photoUri = asset.uri;

      // Perform AI validation
      const validationResult = await analyzeImageWithAI(photoUri, isMainPhoto);

      if (validationResult.isValid) {
        // Only add the photo if AI validation passes
        if (isMainPhoto) {
          const updatedPhotos = [photoUri, ...form.photos.slice(1)];
          setForm({ ...form, photos: updatedPhotos });
        } else {
          if (form.photos.length < 4) {
            setForm({ ...form, photos: [...form.photos, photoUri] });
          } else {
            showFeedback("error", "You can upload up to 4 photos maximum");
          }
        }

        // Clear photo error if any
        if (fieldErrors.photos) {
          setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.photos;
            return newErrors;
          });
        }
      } else {
        // AI validation failed - don't add the photo
        showFeedback("error", "Please upload a clear photo of a dog or cat.");
      }

      setLoading(false);
    }
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = form.photos.filter((_, i) => i !== index);
    setForm({ ...form, photos: updatedPhotos });
  };

  const handleDraftAction = async (action) => {
    if (action === "load") {
      const draft = await DraftService.getReportDraft();
      if (draft) {
        // Close draft modal first with animation
        setShowDraftPrompt(false);

        // Wait a bit for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Load draft data
        setForm(draft.formData || {});
        setCurrentStep(draft.currentStep || 1);
        setReportType(draft.reportType || "lost");
        setSelectedPetId(draft.selectedPetId || null);
        setIsPreFilled(draft.isPreFilled || false);
        await DraftService.clearReportDraft();

        // Show report modal
        setModalVisible(true);
      }
    } else if (action === "discard") {
      await DraftService.clearReportDraft();
      setShowDraftPrompt(false);
      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Open fresh modal for the same report type
      const draft = await DraftService.getReportDraft();
      const type = draft?.reportType || "lost";
      await openFreshModal(type);
    }
  };

  const openFreshModal = async (type) => {
    try {
      const user = auth.currentUser;
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
        locationData: { address: "", coordinates: null },
        additionalNotes: "",
        reporterName,
        email: user.email,
        phone,
      });
      setCurrentStep(1);
      setModalVisible(true);
    } catch (error) {
      Alert.alert("Error", "Unable to open fresh report form.");
    }
  };

  // Auto-save draft when modal closes or steps change
  useEffect(() => {
    const saveCurrentDraft = async () => {
      if (
        modalVisible &&
        (form.photos.length > 0 || form.species || form.location)
      ) {
        await DraftService.saveReportDraft({
          formData: form,
          currentStep,
          reportType,
          selectedPetId,
          isPreFilled,
          savedAt: new Date().toISOString(),
        });
        setHasDraft(true);
      }
    };

    // Save on component unmount or modal close
    return () => {
      if (modalVisible) {
        saveCurrentDraft();
      }
    };
  }, [form, currentStep, reportType, selectedPetId, isPreFilled, modalVisible]);

  // Search logic for matches
  const searchForMatches = async (reportData, reportId) => {
    try {
      setMatchingLoading(true);
      const matches = await MatchingService.findPotentialMatches(reportData);

      if (matches.length > 0) {
        const user = auth.currentUser;
        for (const match of matches) {
          await MatchingService.saveMatchAlert(user.uid, {
            lostReportId: reportId,
            foundReportId: match.id,
            matchScore: match.matchScore,
            matchLevel: match.matchLevel,
            matchDetails: match.matchDetails,
          });
        }
        setPotentialMatches(matches);
        setSubmittedReportId(reportId);
        setMatchesModalVisible(true);
      } else {
        Alert.alert(
          "Submitted",
          "Report submitted! We'll notify you if matches are found."
        );
      }
    } catch (error) {
      Alert.alert(
        "Submitted",
        "Report submitted, but match search failed. We'll keep looking!"
      );
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps before submission
    const errors = {};

    // Step 1 validation
    const photoError = validatePhotos(form.photos);
    if (photoError) errors.photos = photoError;

    // Additional AI validation for photos
    if (
      form.photos.length > 0 &&
      aiValidationResult &&
      !aiValidationResult.isValid
    ) {
      errors.photos = "Please upload valid pet images (dogs or cats only)";
    }

    // Step 2 validation
    if (!isPreFilled) {
      const speciesError = validateRequiredField(form.species, "Species");
      if (speciesError) errors.species = speciesError;
    }

    // Step 3 validation
    const locationError = validateLocation(form.locationData);
    if (locationError) errors.location = locationError;

    const dateTimeError = validateDateTime(form.dateTime);
    if (dateTimeError) errors.dateTime = dateTimeError;

    const nameError = validateRequiredField(form.reporterName, "Your name");
    if (nameError) errors.reporterName = nameError;

    const emailError = validateEmail(form.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhoneNumber(form.phone);
    if (phoneError) errors.phone = phoneError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showFeedback("error", "Please fill in all required fields correctly.");
      return;
    }

    try {
      setLoading(true);
      setIsSubmitting(true);

      // 1. Upload to Cloudinary
      const uploadedPhotoUrls = [];
      for (const photo of form.photos) {
        const url = await CloudinaryService.uploadFile(photo, "image");
        uploadedPhotoUrls.push(url);
      }

      // 2. Generate Embedding from the first uploaded photo
      let imageVector = null;
      if (uploadedPhotoUrls.length > 0) {
        imageVector = await MatchingService.generateImageEmbedding(
          uploadedPhotoUrls[0]
        );
      }

      const reportData = {
        ...form,
        location: form.locationData.address,
        coordinates: form.locationData.coordinates,
        reportType,
        photos: uploadedPhotoUrls,
        imageVector: imageVector,
        petId: selectedPetId,
        createdAt: new Date().toISOString(),
      };

      // 3. Save to Firestore
      const reportId = await PetService.addReport(reportData);
      setModalVisible(false);

      // 4. Clear draft after successful submission
      await DraftService.clearReportDraft();
      setHasDraft(false);

      // 5. Trigger Matching Search
      if (reportType === "lost") {
        await searchForMatches(reportData, reportId);
      } else {
        showFeedback("success", "Report submitted successfully!");
      }

      // Reset form and AI validation
      resetForm();
      setAiValidationResult(null);
      setAiAnalysisResult(null);
    } catch (error) {
      console.error("Submission error:", error);
      showFeedback("error", "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleViewMatch = (match) => {
    setMatchesModalVisible(false);
    // Navigate to the report detail screen
    navigation.navigate("ReportDetail", { reportId: match.id });
  };

  const handleDismissMatch = async (matchId) => {
    try {
      await MatchingService.dismissMatch(matchId);
      setPotentialMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (error) {
      console.error("Error dismissing match:", error);
    }
  };

  // Draft Prompt Modal Component
  const DraftPromptModal = () => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (showDraftPrompt) {
        // Reset scale and opacity before starting
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);

        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [showDraftPrompt]);

    // Check if the draft is from a pre-filled pet
    const [draftData, setDraftData] = useState(null);

    useEffect(() => {
      const checkDraft = async () => {
        const draft = await DraftService.getReportDraft();
        setDraftData(draft);
      };
      if (showDraftPrompt) {
        checkDraft();
      }
    }, [showDraftPrompt]);

    const isPetDraft = draftData?.isPreFilled;
    const title = "Continue Report?";
    const message = isPetDraft
      ? "You have an unsaved report for your registered pet. Would you like to continue where you left off?"
      : "You have an unsaved pet report draft. Would you like to continue where you left off?";
    const continueButtonText = "Continue Draft";
    const dismissButtonText = isPetDraft ? "Start New Report" : "Start Fresh";

    return (
      <Modal transparent visible={showDraftPrompt} animationType="none">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-6`}>
          <Animated.View
            style={[
              tw`bg-white rounded-2xl p-6 w-full max-w-sm`,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Feather
              name="file-text"
              size={48}
              color="#F59549"
              style={tw`self-center mb-4`}
            />
            <CustomText weight="Bold" style={tw`text-lg text-center mb-2`}>
              {title}
            </CustomText>
            <CustomText style={tw`text-gray-600 text-[12px] text-center mb-6`}>
              {message}
            </CustomText>

            <View style={tw`space-y-3`}>
              <TouchableOpacity
                onPress={() => handleDraftAction("load")}
                style={tw`bg-orange-500 py-4 rounded-xl active:bg-orange-600 mb-2`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`text-white text-sm text-center`}
                >
                  {continueButtonText}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDraftAction("discard")}
                style={tw`border border-gray-300 py-4 rounded-xl active:bg-gray-50`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`text-gray-700 text-sm text-center`}
                >
                  {dismissButtonText}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDraftPrompt(false)}
                style={tw`py-4 active:opacity-70`}
              >
                <CustomText style={tw`text-gray-500 text-center`}>
                  Cancel
                </CustomText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // Add the draft indicator section to the renderEmptyState
  const renderDraftIndicator = () => {
    if (!hasDraft) return null;

    return (
      <TouchableOpacity
        onPress={() => setShowDraftPrompt(true)}
        style={tw`bg-amber-50 border border-amber-200 rounded-lg p-3 mx-6 mb-4 flex-row items-center`}
      >
        <Feather name="clock" size={20} color="#f59e0b" />
        <View style={tw`ml-3 flex-1`}>
          <CustomText weight="SemiBold" style={tw`text-amber-800 text-sm`}>
            Draft Available
          </CustomText>
          <CustomText style={tw`text-amber-600 text-xs`}>
            Continue your unfinished pet report
          </CustomText>
        </View>
        <Feather name="chevron-right" size={20} color="#f59e0b" />
      </TouchableOpacity>
    );
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

      {/* Add draft indicator */}
      {renderDraftIndicator()}

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

      <View style={tw`flex-row items-center justify-between mb-1`}>
        <CustomText weight="SemiBold" style={tw`text-sm`}>
          Main Photo <CustomText style={tw`text-red-500`}>*</CustomText>
        </CustomText>

        {form.photos.length > 0 && (
          <TouchableOpacity
            onPress={async () => {
              // Perform AI analysis on existing photo
              if (form.photos[0]) {
                try {
                  setIsAnalyzingImage(true);
                  const analysis = await analyzeImageWithAI(
                    form.photos[0],
                    true
                  );
                  if (analysis.analysis) {
                    setAiAnalysisResult(analysis.analysis);
                    setShowAIOptions(true);
                  }
                } catch (error) {
                  console.error("Error analyzing existing photo:", error);
                } finally {
                  setIsAnalyzingImage(false);
                }
              }
            }}
            style={tw`flex-row items-center bg-blue-50 px-3 py-1 rounded-full`}
          >
            {isAnalyzingImage ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <>
                <Ionicons name="sparkles" size={14} color="#3b82f6" />
                <CustomText style={tw`text-blue-600 text-xs ml-1`}>
                  AI Analyze
                </CustomText>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <CustomText style={tw`text-xs text-gray-600 mb-3`}>
        Upload a clear photo of a dog or cat for identification
      </CustomText>

      <TouchableOpacity
        onPress={() => handlePickImage(true)}
        disabled={loading || isAnalyzingImage}
        style={tw`w-full rounded-3xl items-center justify-center mb-2 ${
          form.photos.length > 0 ? "bg-white" : "border-2 border-orange-400"
        } ${loading || isAnalyzingImage ? "opacity-50" : ""}`}
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
            {isAnalyzingImage && (
              <View
                style={tw`absolute inset-0 bg-black/50 rounded-2xl items-center justify-center`}
              >
                <ActivityIndicator size="large" color="#fff" />
                <CustomText style={tw`text-white mt-2 text-xs`}>
                  AI Validating...
                </CustomText>
              </View>
            )}
          </View>
        ) : (
          <>
            {isAnalyzingImage ? (
              <View style={tw`py-20 items-center`}>
                <ActivityIndicator size="large" color="#F59549" />
                <CustomText style={tw`mt-4 text-xs text-gray-600`}>
                  AI Validating Image...
                </CustomText>
              </View>
            ) : (
              <>
                <Ionicons
                  name="camera"
                  size={48}
                  color="#F59549"
                  style={tw`mb-2 pt-8`}
                />
                <CustomText weight="SemiBold" style={tw`text-sm mb-1`}>
                  Upload pet photo
                </CustomText>
                <CustomText style={tw`text-xs text-gray-500 pb-8`}>
                  Tap to select from gallery
                </CustomText>
              </>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Show AI validation result */}
      <AIVisualIndicator />

      {fieldErrors.photos && (
        <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
          {fieldErrors.photos}
        </CustomText>
      )}

      <CustomText weight="SemiBold" style={tw`text-sm mb-2`}>
        Additional Photos{" "}
        <CustomText style={tw`text-gray-500 text-xs font-normal`}>
          (Optional)
        </CustomText>
      </CustomText>
      <CustomText style={tw`text-xs text-gray-600 mb-3`}>
        Add up to 3 more photos to show different angles
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
            disabled={loading || isAnalyzingImage}
            style={tw`w-24 h-24 border-2 border-dashed border-orange-300 rounded-2xl items-center justify-center ${
              loading || isAnalyzingImage ? "opacity-50" : ""
            }`}
          >
            {isAnalyzingImage ? (
              <ActivityIndicator size="small" color="#F59549" />
            ) : (
              <Ionicons name="add" size={32} color="#F59549" />
            )}
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

      {/* PET NAME INPUT */}
      {/* Check if it's required based on report type */}
      {reportType === "lost" ? (
        <>
          <CustomInput
            label={
              <CustomText weight="SemiBold" style={tw`mt-3 mb-2`}>
                Pet Name <CustomText style={tw`text-red-500`}>*</CustomText>
              </CustomText>
            }
            placeholder={
              reportType === "lost"
                ? "What is their name?"
                : "e.g. 'Buddy' (from tag) or leave blank"
            }
            value={form.petName}
            onChangeText={(text) => handleChange("petName", text)}
          />
          {fieldErrors.petName && (
            <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
              {fieldErrors.petName}
            </CustomText>
          )}
        </>
      ) : (
        <CustomInput
          label="Pet Name (Optional)"
          placeholder="e.g. 'Buddy' (from tag) or leave blank"
          value={form.petName}
          onChangeText={(text) => handleChange("petName", text)}
        />
      )}

      {/* SPECIES SELECTOR */}
      <CustomText weight="SemiBold" style={tw`mt-3 mb-2`}>
        Species <CustomText style={tw`text-red-500`}>*</CustomText>
      </CustomText>
      <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-2`}>
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
      {/* Species Error Message */}
      {fieldErrors.species && (
        <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
          {fieldErrors.species}
        </CustomText>
      )}

      {/* BREED INPUT (Optional) */}
      {form.species && (
        <CustomInput
          label="Breed (Optional)"
          placeholder={`${form.species} breed`}
          value={form.breed}
          onChangeText={(text) => handleChange("breed", text)}
          error={fieldErrors.breed}
        />
      )}

      {/* SEX SELECTOR */}
      <CustomText weight="SemiBold" style={tw`mt-4 mb-2`}>
        Sex <CustomText style={tw`text-red-500`}>*</CustomText>
      </CustomText>
      <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-2`}>
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
      {/* Sex Error Message */}
      {fieldErrors.sex && (
        <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
          {fieldErrors.sex}
        </CustomText>
      )}

      {/* COLOR INPUT (Optional) */}
      <CustomInput
        label="Color & Markings (Optional)"
        placeholder="e.g., Brown with white spot on chest"
        value={form.color}
        onChangeText={(text) => handleChange("color", text)}
        error={fieldErrors.color}
      />

      {/* DISTINGUISHING MARKS (Optional) */}
      <CustomInput
        label="Distinguishing Features (Optional)"
        placeholder={
          reportType === "found"
            ? "e.g., Unique markings (you may keep some details private to verify the owner later)"
            : "e.g., Scar, collar, microchip number"
        }
        value={form.distinguishingMarks}
        onChangeText={(text) => handleChange("distinguishingMarks", text)}
        multiline
        numberOfLines={3}
        error={fieldErrors.distinguishingMarks}
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

      {/* Date & Time Field */}
      <View style={tw`mb-4`}>
        <CustomText weight="SemiBold" style={tw`-mb-6`}>
          {reportType === "lost" ? "Date & Time Lost" : "Date & Time Found"}
          <CustomText style={tw`text-red-500`}> *</CustomText>
        </CustomText>
        <DateTimeSelector
          value={form.dateTime}
          onChange={(dateTime) => {
            handleChange("dateTime", dateTime);
          }}
        />
        {fieldErrors.dateTime && (
          <CustomText style={tw`text-red-500 text-xs mt-1 ml-1`}>
            {fieldErrors.dateTime}
          </CustomText>
        )}
      </View>

      {/* Location Field */}
      <View style={tw`mb-2`}>
        <CustomText weight="SemiBold" style={tw`-mb-6`}>
          {reportType === "lost" ? "Location Last Seen" : "Location Found"}
          <CustomText style={tw`text-red-500`}> *</CustomText>
        </CustomText>
        <LocationPicker
          placeholder={
            reportType === "lost"
              ? "Where were they last seen?"
              : "Where did you find them?"
          }
          value={form.location}
          onChange={(locationData) =>
            handleChange("locationData", locationData)
          }
        />
        {fieldErrors.location && (
          <CustomText style={tw`text-red-500 text-xs ml-1`}>
            {fieldErrors.location}
          </CustomText>
        )}
      </View>

      {/* Additional Notes - Already Optional */}
      <CustomInput
        label="Additional Notes (Optional)"
        placeholder="Any other information that might help?"
        multiline
        numberOfLines={4}
        value={form.additionalNotes}
        onChangeText={(text) => handleChange("additionalNotes", text)}
        error={fieldErrors.additionalNotes}
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
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>
              Name *
            </CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.reporterName || "Not provided"}
            </CustomText>
            {fieldErrors.reporterName && (
              <CustomText style={tw`text-red-500 text-xs mt-1`}>
                {fieldErrors.reporterName}
              </CustomText>
            )}
          </View>

          <View style={tw`mb-4`}>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>
              Email *
            </CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.email || "Not provided"}
            </CustomText>
            {fieldErrors.email && (
              <CustomText style={tw`text-red-500 text-xs mt-1`}>
                {fieldErrors.email}
              </CustomText>
            )}
          </View>

          <View>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>
              Phone *
            </CustomText>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {form.phone || "Not provided"}
            </CustomText>
            {fieldErrors.phone && (
              <CustomText style={tw`text-red-500 text-xs mt-1`}>
                {fieldErrors.phone}
              </CustomText>
            )}
          </View>
        </View>
      </View>
    </View>
  );

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
              label={
                <CustomText weight="SemiBold" style={tw`mb-2`}>
                  Your Name <CustomText style={tw`text-red-500`}>*</CustomText>
                </CustomText>
              }
              placeholder="Full name"
              value={form.reporterName}
              onChangeText={(text) => handleChange("reporterName", text)}
            />
            {fieldErrors.reporterName && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
                {fieldErrors.reporterName}
              </CustomText>
            )}

            <CustomInput
              label={
                <CustomText weight="SemiBold" style={tw`mb-2`}>
                  Email Address{" "}
                  <CustomText style={tw`text-red-500`}>*</CustomText>
                </CustomText>
              }
              placeholder="your@email.com"
              value={form.email}
              onChangeText={(text) => handleChange("email", text)}
            />
            {fieldErrors.email && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
                {fieldErrors.email}
              </CustomText>
            )}

            <CustomInput
              label={
                <CustomText weight="SemiBold" style={tw`mb-2`}>
                  Phone Number{" "}
                  <CustomText style={tw`text-red-500`}>*</CustomText>
                </CustomText>
              }
              placeholder="Your phone number"
              value={form.phone}
              onChangeText={(text) => handleChange("phone", text)}
            />
            {fieldErrors.phone && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 mb-4`}>
                {fieldErrors.phone}
              </CustomText>
            )}

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
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            {/* Header - Fixed */}
            <View
              style={tw`px-6 pt-4 pb-2 border-b border-gray-100 flex-row justify-between items-center`}
            >
              <TouchableOpacity onPress={handleCancel} style={tw`p-2`}>
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
              keyboardShouldPersistTaps="handled"
            >
              {renderStepIndicator()}
              {currentStep === 1
                ? renderStep1()
                : currentStep === 2
                ? renderStep2()
                : renderStep3()}
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
                      onPress={() => {
                        if (currentStep === 3) {
                          handleSubmit();
                        } else {
                          if (validateCurrentStep()) {
                            setCurrentStep((prev) => prev + 1);
                          } else {
                            // Show feedback for specific step errors
                            let errorMessage =
                              "Please fill in all required fields correctly.";

                            // Get the first error message to show
                            const errorKeys = Object.keys(fieldErrors);
                            if (errorKeys.length > 0) {
                              errorMessage = fieldErrors[errorKeys[0]];
                            }

                            showFeedback("error", errorMessage);
                          }
                        }
                      }}
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200 ${
                        loading || isSubmitting ? "opacity-50" : ""
                      }`}
                      disabled={loading || isSubmitting}
                    >
                      <CustomText weight="Bold" style={tw`text-white`}>
                        {currentStep === 3
                          ? loading || isSubmitting
                            ? "Submitting..."
                            : "Submit Report"
                          : "Continue"}
                      </CustomText>
                    </TouchableOpacity>
                  </>
                ) : (
                  // This is the STEP 1 Continue button
                  <TouchableOpacity
                    onPress={() => {
                      if (validateCurrentStep()) {
                        setCurrentStep((prev) => prev + 1);
                      } else {
                        // Show feedback for photo error specifically
                        if (fieldErrors.photos) {
                          showFeedback("error", fieldErrors.photos);
                        } else {
                          showFeedback(
                            "error",
                            "Please upload at least one photo"
                          );
                        }
                      }
                    }}
                    style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200 ${
                      loading ? "opacity-50" : ""
                    }`}
                    disabled={loading}
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

      {/* Add DraftPromptModal */}
      <DraftPromptModal />

      {/* Add AI Suggestions Modal */}
      <AISuggestionsModal />

      <FeedbackModal
        visible={feedbackVisible}
        type={feedbackType}
        message={feedbackMessage}
        onClose={() => setFeedbackVisible(false)}
      />

      {renderContactEditModal()}
      <PotentialMatchesModal
        visible={matchesModalVisible}
        matches={potentialMatches}
        loading={matchingLoading}
        onClose={() => setMatchesModalVisible(false)}
        onViewMatch={(match) => {
          setMatchesModalVisible(false);
          navigation.navigate("ReportDetail", { reportId: match.id });
        }}
        onDismissMatch={async (id) => {
          await MatchingService.dismissMatch(id);
          setPotentialMatches((prev) => prev.filter((m) => m.id !== id));
        }}
      />
    </SafeAreaView>
  );
}
