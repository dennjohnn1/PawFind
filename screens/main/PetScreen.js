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
  ActivityIndicator,
  BackHandler,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import tw from "twrnc";
import SignatureCanvas from "react-native-signature-canvas";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import DateOfBirthPicker from "../../components/CustomDatePicker";
import PetDetailsModal from "../../components/PetDetailsModal";
import FeedbackModal from "../../components/FeedbackModal";

import PetService from "../../service/PetService";
import DraftService from "../../service/DraftService";
import CloudinaryService from "../../service/CloudinaryService";
import CertificateService from "../../service/CertificateService";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import AuthService from "../../service/AuthService";
import PetImageAnalysisService, {
  mapAnalysisToForm,
} from "../../service/PetImageAnalysisService";

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

  // Signature states
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);

  // Validation states
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add AI analysis states
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIOptions, setShowAIOptions] = useState(false);

  // Feedback modal states
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState("success");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const signatureRef = useRef(null);
  const drawingTimeoutRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [aiValidationResult, setAiValidationResult] = useState(null);
  const [isValidatingImage, setIsValidatingImage] = useState(false);

  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

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
    ownerAddress: "",
    ownerSignature: "",

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

  // Show feedback modal
  const showFeedback = (type, message) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackVisible(true);
  };

  // Validation helper functions
  const validatePetName = (name) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return "Pet name is required";
    }

    if (trimmedName.length < 2) {
      return "Pet name must be at least 2 characters";
    }

    if (trimmedName.length > 50) {
      return "Pet name must not exceed 50 characters";
    }

    if (!/[a-zA-Z]/.test(trimmedName)) {
      return "Pet name must contain at least one letter";
    }

    return null;
  };

  const validateDateOfBirth = (dob) => {
    if (!dob) {
      return "Date of birth is required";
    }

    let dateObj;
    if (dob.year && dob.month && dob.day) {
      dateObj = new Date(dob.year, dob.month - 1, dob.day);
    } else if (dob instanceof Date) {
      dateObj = dob;
    } else {
      return "Invalid date format";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj > today) {
      return "Date of birth cannot be in the future";
    }

    const fiftyYearsAgo = new Date();
    fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);

    if (dateObj < fiftyYearsAgo) {
      return "Date of birth seems too old. Please verify.";
    }

    return null;
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return null;

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

  const validatePhotoFile = (uri) => {
    if (!uri) {
      return "Pet photo is required";
    }

    // Check AI validation result if available
    if (aiValidationResult && !aiValidationResult.isValid) {
      return "Please upload a clear photo of a dog or cat";
    }

    return null;
  };

  // Add useEffect to check for drafts on mount
  useEffect(() => {
    checkForDraft();
  }, []);

  const checkForDraft = async () => {
    const draftExists = await DraftService.hasPetDraft(); // Changed from hasDraft()
    setHasDraft(draftExists);
  };

  const sanitizeVaccinations = (vaccinations) => {
    if (!Array.isArray(vaccinations)) {
      if (typeof vaccinations === "string") {
        vaccinations = vaccinations.split(",").map((v) => v.trim());
      } else {
        return [];
      }
    }

    const filtered = vaccinations
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return [...new Set(filtered)];
  };

  const validateCurrentStep = () => {
    const errors = {};

    switch (currentStep) {
      case 1:
        const photoError = validatePhotoFile(form.photoUrl);
        if (photoError) errors.photoUrl = photoError;

        const nameError = validatePetName(form.name);
        if (nameError) errors.name = nameError;
        break;

      case 2:
        if (!form.species) {
          errors.species = "Please select a species";
        }

        if (!form.sex) {
          errors.sex = "Please select a sex";
        }

        const dobError = validateDateOfBirth(form.dateOfBirth);
        if (dobError) errors.dateOfBirth = dobError;
        break;

      case 3:
        break;

      case 4:
        const phoneError = validatePhoneNumber(form.ownerPhone);
        if (phoneError) errors.ownerPhone = phoneError;
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      ownerAddress: "",
      ownerSignature: "",
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
    setPendingSubmission(false);
    setScrollEnabled(true);
    setIsDrawingSignature(false);
    isDrawingRef.current = false;
    setFieldErrors({});
    setIsSubmitting(false);
    setAiValidationResult(null); // Clear AI validation
    setAiAnalysisResult(null); // Clear AI analysis
    setShowAIOptions(false); // Close AI options modal
    if (drawingTimeoutRef.current) {
      clearTimeout(drawingTimeoutRef.current);
    }
  };

  // Add useEffect for back button handling
  useEffect(() => {
    const backAction = () => {
      if (modalVisible && (form.name || form.photoUrl || form.species)) {
        handleCancel();
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [modalVisible, form]);

  const handleCancel = async () => {
    // If we're in edit mode, clear the draft since we're canceling the edit
    if (isEditMode) {
      await DraftService.clearPetDraft(); // Changed from clearDraft()
      setHasDraft(false);
    }
    // For new registration, the draft will be auto-saved by the useEffect
    // (but only if not in edit mode, as per the updated useEffect)

    setModalVisible(false);
    resetForm();
    return Promise.resolve(true);
  };

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

    // Check if the draft is from an edit session
    const [draftData, setDraftData] = useState(null);

    useEffect(() => {
      const checkDraftType = async () => {
        const draft = await DraftService.getDraft();
        setDraftData(draft);
      };
      if (showDraftPrompt) {
        checkDraftType();
      }
    }, [showDraftPrompt]);

    const isEditDraft = draftData?.isEditMode && draftData?.editingPetId;
    const title = isEditDraft ? "Continue Editing?" : "Continue Registration?";
    const message = isEditDraft
      ? "You have an unsaved pet edit. Would you like to continue where you left off?"
      : "You have an unsaved pet registration draft. Would you like to continue where you left off?";
    const continueButtonText = isEditDraft
      ? "Continue Editing"
      : "Continue Draft";

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
              name={isEditDraft ? "edit" : "file-text"}
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

            <View>
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
                  {isEditDraft ? "Discard Edit" : "Start New Registration"}
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
            tw`absolute top-0 left-0 bottom-0 w-20`,
            {
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        />
      </View>
    );
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setForm((prev) => ({ ...prev, ownerSignature: "" }));
  };

  const handleSignature = (signature) => {
    console.log("Signature captured, length:", signature?.length);
    setForm((prev) => ({ ...prev, ownerSignature: signature }));
    setIsDrawingSignature(false);
    isDrawingRef.current = false;

    if (pendingSubmission) {
      submitPetData(signature);
    } else {
      showFeedback("success", "Signature saved successfully!");
    }
  };

  const submitPetData = async (signatureOverride = null) => {
    if (isSubmitting) return;

    const currentSignature =
      signatureOverride !== null ? signatureOverride : form.ownerSignature;

    const errors = {};

    const nameError = validatePetName(form.name);
    if (nameError) errors.name = nameError;

    if (!form.species) errors.species = "Species is required";
    if (!form.sex) errors.sex = "Sex is required";

    const dobError = validateDateOfBirth(form.dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;

    const photoError = validatePhotoFile(form.photoUrl);
    if (photoError) errors.photoUrl = photoError;

    // Additional AI validation check
    if (form.photoUrl && aiValidationResult && !aiValidationResult.isValid) {
      errors.photoUrl = "Please upload a valid pet image (dog or cat only)";
    }

    const phoneError = validatePhoneNumber(form.ownerPhone);
    if (phoneError) errors.ownerPhone = phoneError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showFeedback("error", "Please correct the errors before submitting.");
      setPendingSubmission(false);
      return;
    }

    try {
      setLoading(true);
      setIsSubmitting(true);

      const saveData = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed?.trim() || "",
        sex: form.sex,
        color: form.color?.trim() || "",
        photoUrl: form.photoUrl,
        distinguishingMarks: form.distinguishingMarks?.trim() || "",
        ownerId: form.ownerId,
        ownerName: form.ownerName?.trim() || "",
        ownerPhone: form.ownerPhone?.trim() || "",
        ownerEmail: form.ownerEmail?.trim() || "",
        ownerAddress: form.ownerAddress?.trim() || "",
        ownerSignature: currentSignature,
        vaccinations: sanitizeVaccinations(form.vaccinations),
        allergies: form.allergies?.trim() || "",
        medicalNotes: form.medicalNotes?.trim() || "",
      };

      if (form.dateOfBirth) {
        if (
          form.dateOfBirth.year &&
          form.dateOfBirth.month &&
          form.dateOfBirth.day
        ) {
          saveData.dateOfBirth = form.dateOfBirth;
        } else if (form.dateOfBirth instanceof Date) {
          saveData.dateOfBirth = {
            year: form.dateOfBirth.getFullYear(),
            month: form.dateOfBirth.getMonth() + 1,
            day: form.dateOfBirth.getDate(),
          };
        }
      }

      if (isEditMode && editingPetId) {
        console.log("Submitting pet with:", {
          name: saveData.name,
          dateOfBirth: saveData.dateOfBirth,
          isEditMode,
          editingPetId,
        });
        // For edit mode, check duplicate but exclude current pet
        const isDuplicate = await PetService.checkDuplicatePet(
          saveData.name,
          saveData.dateOfBirth,
          isEditMode ? editingPetId : null // Pass the pet ID to exclude
        );

        console.log("Duplicate check result:", isDuplicate);

        if (isDuplicate) {
          showFeedback(
            "error",
            "You already have another pet with the same name and date of birth."
          );
          setLoading(false);
          setIsSubmitting(false);
          setPendingSubmission(false);
          return;
        }

        await PetService.updatePet(editingPetId, saveData);
        showFeedback("success", "Pet information updated successfully!");
      } else {
        // For new pet registration
        const isDuplicate = await PetService.checkDuplicatePet(
          saveData.name,
          saveData.dateOfBirth
        );

        if (isDuplicate) {
          showFeedback(
            "error",
            "A pet with the same name and date of birth already exists in your profile."
          );
          setLoading(false);
          setIsSubmitting(false);
          setPendingSubmission(false);
          return;
        }

        const petId = await PetService.addPet(saveData);
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

        showFeedback("success", "Pet registered successfully!");
      }

      setModalVisible(false);
      resetForm();
      await DraftService.clearDraft();
      setHasDraft(false);
      fetchPets();
    } catch (error) {
      console.error(error);
      showFeedback("error", error.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
      setPendingSubmission(false);
    }
  };

  const handleSubmit = async () => {
    if (currentStep === 4 && !form.ownerSignature && signatureRef.current) {
      console.log("Signature missing in state, force reading from canvas...");
      setPendingSubmission(true);
      signatureRef.current.readSignature();
      return;
    }
    submitPetData();
  };

  useEffect(() => {
    fetchPets();

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

  useEffect(() => {
    if (!initialLoading && pets.length === 0) {
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
    }
  }, [initialLoading, pets.length]);

  const fetchPets = async () => {
    try {
      const data = await PetService.getMyPets();
      setPets(data);
    } catch (error) {
      console.error("Error fetching pets:", error);
      showFeedback("error", "Failed to load pets. Please try again.");
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

      // Check for existing draft
      const existingDraft = await DraftService.getPetDraft(); // Changed from getDraft()

      if (existingDraft) {
        // Always show draft prompt if there's a draft
        // The DraftPromptModal will show appropriate message based on draft type
        setShowDraftPrompt(true);
        return;
      }

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
        ownerAddress = data.location?.address || "";

        if (!ownerAddress && data.location) {
          const loc = data.location;
          ownerAddress = [
            loc.street,
            loc.barangay,
            loc.city,
            loc.province,
            loc.postalCode,
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
      console.error("Error opening modal:", error);
      showFeedback("error", "Unable to open registration form.");
    }
  };

  const openFreshModal = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

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
        ownerAddress = data.location?.address || "";

        if (!ownerAddress && data.location) {
          const loc = data.location;
          ownerAddress = [
            loc.street,
            loc.barangay,
            loc.city,
            loc.province,
            loc.postalCode,
          ]
            .filter(Boolean)
            .join(", ");
        }
      }

      setForm({
        name: "",
        species: "",
        breed: "",
        sex: "",
        dateOfBirth: null,
        color: "",
        photoUrl: "",
        distinguishingMarks: "",
        ownerId: user.uid,
        ownerName,
        ownerEmail: user.email || "",
        ownerPhone,
        ownerAddress,
        ownerSignature: "",
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
      setModalVisible(true);
    } catch (error) {
      console.error("Error opening fresh modal:", error);
      showFeedback("error", "Unable to open registration form.");
    }
  };

  const handleDraftAction = async (action) => {
    if (action === "load") {
      const draft = await DraftService.getPetDraft(); // Changed from getDraft()
      if (draft) {
        // Close draft modal first with animation
        setShowDraftPrompt(false);

        // Wait a bit for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Load draft data
        setForm(draft.formData || {});
        setCurrentStep(draft.currentStep || 1);
        setIsEditMode(draft.isEditMode || false);
        setEditingPetId(draft.editingPetId || null);
        await DraftService.clearPetDraft(); // Changed from clearDraft()

        // Show registration modal with user data
        try {
          const user = auth.currentUser;
          if (user) {
            setForm((prev) => ({
              ...prev,
              ownerId: user.uid,
              ownerEmail: user.email || "",
            }));
          }
        } catch (error) {
          console.error("Error setting user data:", error);
        }

        // Open registration modal
        setModalVisible(true);
      }
    } else if (action === "discard") {
      await DraftService.clearPetDraft(); // Changed from clearDraft()
      setShowDraftPrompt(false);
      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Open fresh modal
      await openFreshModal();
    }
  };

  // Auto-save draft when modal closes or steps change
  useEffect(() => {
    const saveCurrentDraft = async () => {
      // Don't save drafts when in edit mode
      if (
        modalVisible &&
        (form.name || form.photoUrl || form.species) &&
        !isEditMode
      ) {
        await DraftService.savePetDraft({
          // Changed from saveDraft()
          formData: form,
          currentStep,
          isEditMode, // Save whether this is edit mode
          editingPetId, // Save the pet ID being edited
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
  }, [form, currentStep, modalVisible, isEditMode, editingPetId]);

  const openEditModal = async (pet) => {
    try {
      // Clear any existing draft when starting edit mode
      await DraftService.clearDraft();
      setHasDraft(false);

      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      let formattedDateOfBirth = null;

      if (pet.dateOfBirth) {
        if (pet.dateOfBirth.seconds) {
          const date = new Date(pet.dateOfBirth.seconds * 1000);
          formattedDateOfBirth = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
          };
        } else if (pet.dateOfBirth instanceof Date) {
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
          formattedDateOfBirth = {
            year: pet.dateOfBirth.year,
            month: pet.dateOfBirth.month,
            day: pet.dateOfBirth.day,
          };
        } else if (typeof pet.dateOfBirth === "string") {
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
        ownerAddress: pet.ownerAddress || "",

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
      showFeedback("error", "Unable to load pet data. Please try again.");
    }
  };

  const handleChange = (key, value) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    if (key === "species") {
      setForm({ ...form, species: value, breed: "" });
    } else if (key === "vaccinations") {
      if (typeof value === "string") {
        setForm({
          ...form,
          vaccinations: value.split(",").map((v) => v.trim()),
        });
      } else {
        setForm({ ...form, [key]: value });
      }
    } else if (key === "name") {
      setForm({ ...form, [key]: value.trim() });
    } else {
      setForm({ ...form, [key]: value });
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        showFeedback("error", "Please select an image smaller than 5MB");
        return;
      }

      // Get file extension from URI or mimeType
      const uri = asset.uri.toLowerCase();
      const mimeType = asset.mimeType || asset.type || "";

      // Check by file extension as fallback
      const hasValidExtension =
        uri.endsWith(".jpg") ||
        uri.endsWith(".jpeg") ||
        uri.endsWith(".png") ||
        uri.endsWith(".webp");

      // Check by mimeType if available
      const validMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      const hasValidMimeType =
        mimeType && validMimeTypes.includes(mimeType.toLowerCase());

      // Accept if either extension or mimeType is valid
      if (!hasValidExtension && !hasValidMimeType) {
        showFeedback("error", "Please select a JPEG, PNG, or WebP image");
        return;
      }

      try {
        setLoading(true);
        setIsValidatingImage(true);

        // First, validate the image with AI
        const validationResult = await validateImageWithAI(asset.uri);

        if (validationResult.isValid) {
          // Image is valid, proceed with upload
          const url = await CloudinaryService.uploadFile(asset.uri, "image");

          // Set the photo URL first
          setForm({ ...form, photoUrl: url });

          if (fieldErrors.photoUrl) {
            setFieldErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors.photoUrl;
              return newErrors;
            });
          }

          // Show AI analysis options for auto-fill
          setShowAIOptions(true);

          // Store the validation result for display
          setAiValidationResult(validationResult);
        } else {
          // Image is not a valid pet
          showFeedback("error", "Please upload a clear photo of a dog or cat.");
        }
      } catch (error) {
        showFeedback("error", "Failed to validate image. Please try again.");
      } finally {
        setLoading(false);
        setIsValidatingImage(false);
      }
    }
  };

  const validateImageWithAI = async (imageUri) => {
    try {
      // Upload image to get URL for analysis
      const imageUrl = await CloudinaryService.uploadFile(imageUri, "image");

      // Analyze the image using the same service as pet registration
      const analysis = await PetImageAnalysisService.analyzePetImage(imageUrl);
      console.log("AI Validation Result:", analysis);

      // Check if the image is actually a pet (dog or cat)
      if (
        analysis.species &&
        (analysis.species === "Dog" || analysis.species === "Cat")
      ) {
        return {
          isValid: true,
          species: analysis.species,
          breed: analysis.breed,
          confidence: analysis.confidence?.species || "medium",
          message: `Great! This appears to be a ${analysis.species}${
            analysis.breed && analysis.breed !== "Unknown"
              ? ` (likely ${analysis.breed})`
              : ""
          }`,
          analysis: analysis, // Store full analysis for later use
        };
      } else {
        // Not a valid pet image
        return {
          isValid: false,
          species: analysis.species || "Unknown",
          message:
            "This doesn't appear to be a dog or cat. Please upload a clear photo of a pet.",
          analysis: analysis,
        };
      }
    } catch (error) {
      console.error("AI Validation error:", error);
      return {
        isValid: false,
        error: error.message,
        message: "AI validation failed. Please ensure it's a clear pet photo.",
      };
    }
  };

  const analyzeImageWithAI = async () => {
    if (!form.photoUrl) {
      showFeedback("error", "No image available for analysis");
      return;
    }

    try {
      setIsAnalyzingImage(true);
      setShowAIOptions(false);

      showFeedback(
        "info",
        "Analyzing image with AI... This may take a moment."
      );

      // Use cached validation result if available, otherwise fetch new analysis
      let analysis;
      if (aiValidationResult?.isValid && aiValidationResult.analysis) {
        analysis = aiValidationResult.analysis;
        console.log("DEBUG: Using cached analysis:", analysis);
      } else {
        analysis = await PetImageAnalysisService.analyzePetImage(form.photoUrl);
        console.log("DEBUG: New analysis received:", analysis);
      }

      setAiAnalysisResult(analysis);

      // Show modal with AI suggestions
      setShowAIOptions(true);
    } catch (error) {
      console.error("AI Analysis error:", error);
      showFeedback(
        "error",
        `AI analysis failed: ${error.message}. You can still fill the form manually.`
      );
      setShowAIOptions(false);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const AIVisualIndicator = () => {
    if (!aiValidationResult || !form.photoUrl) return null;

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

  const applyAISuggestions = (selectedFields = "all") => {
    if (!aiAnalysisResult) return;

    try {
      console.log("DEBUG: aiAnalysisResult before mapping:", aiAnalysisResult);

      // Use the service method to map analysis to form
      const formUpdates =
        PetImageAnalysisService.mapAnalysisToForm(aiAnalysisResult);
      console.log("DEBUG: formUpdates after mapping:", formUpdates);

      // Create a new form object with updates
      const newForm = { ...form };

      // Apply updates based on selection
      if (selectedFields === "all") {
        Object.keys(formUpdates).forEach((key) => {
          if (
            key !== "aiConfidence" &&
            formUpdates[key] !== undefined &&
            formUpdates[key] !== null
          ) {
            newForm[key] = formUpdates[key];
            console.log(`DEBUG: Applied ${key} = ${formUpdates[key]}`);
          }
        });
      } else if (Array.isArray(selectedFields)) {
        // Apply only specific fields
        selectedFields.forEach((field) => {
          if (formUpdates[field] !== undefined && formUpdates[field] !== null) {
            newForm[field] = formUpdates[field];
            console.log(`DEBUG: Applied ${field} = ${formUpdates[field]}`);
          }
        });
      }

      console.log("DEBUG: Final newForm:", newForm);
      setForm(newForm);
      setShowAIOptions(false);
      setAiAnalysisResult(null);

      showFeedback("success", "AI suggestions applied successfully!");
    } catch (error) {
      console.error("DEBUG: Error in applyAISuggestions:", error);
      console.error("DEBUG: Error stack:", error.stack);
      showFeedback("error", `Failed to apply AI suggestions: ${error.message}`);
    }
  };

  // Add function to skip AI analysis
  const skipAIAnalysis = () => {
    setShowAIOptions(false);
    setAiAnalysisResult(null);
  };

  const AISuggestionsModal = () => {
    if (!showAIOptions) return null;

    return (
      <Modal transparent visible={showAIOptions} animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
            {isAnalyzingImage ? (
              <View style={tw`items-center`}>
                <ActivityIndicator size="large" color="#F59549" />
                <CustomText style={tw`mt-4 text-gray-600 text-center`}>
                  AI is analyzing the image...
                </CustomText>
                <CustomText style={tw`text-gray-500 text-xs text-center mt-2`}>
                  This usually takes 5-10 seconds
                </CustomText>
              </View>
            ) : aiAnalysisResult ? (
              <View>
                <View style={tw`flex-row items-center mb-4`}>
                  <Ionicons name="sparkles" size={24} color="#F59549" />
                  <CustomText weight="Bold" style={tw`text-lg ml-2`}>
                    AI Suggestions
                  </CustomText>
                </View>

                <View style={tw`mb-6`}>
                  <CustomText style={tw`text-gray-600 text-sm mb-3`}>
                    Based on the image analysis, here are the detected details:
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
                          <Text style={tw`font-semibold`}>Species:</Text>{" "}
                          {aiAnalysisResult.species}
                          {aiAnalysisResult.confidence?.species && (
                            <Text style={tw`text-xs text-gray-500`}>
                              {" "}
                              ({aiAnalysisResult.confidence.species} confidence)
                            </Text>
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
                          <Text style={tw`font-semibold`}>Breed:</Text>{" "}
                          {aiAnalysisResult.breed}
                          {aiAnalysisResult.confidence?.breed && (
                            <Text style={tw`text-xs text-gray-500`}>
                              {" "}
                              ({aiAnalysisResult.confidence.breed} confidence)
                            </Text>
                          )}
                        </CustomText>
                      </View>
                    )}

                  {aiAnalysisResult.sex &&
                    aiAnalysisResult.sex !== "Unknown" && (
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
                          <Text style={tw`font-semibold`}>Sex:</Text>{" "}
                          {aiAnalysisResult.sex}
                          {aiAnalysisResult.confidence?.sex && (
                            <Text style={tw`text-xs text-gray-500`}>
                              {" "}
                              ({aiAnalysisResult.confidence.sex} confidence)
                            </Text>
                          )}
                        </CustomText>
                      </View>
                    )}

                  {aiAnalysisResult.color && (
                    <View style={tw`flex-row items-center mb-2`}>
                      <Ionicons
                        name="color-palette"
                        size={16}
                        color="#8b5cf6"
                      />
                      <CustomText style={tw`ml-2 text-sm`}>
                        <Text style={tw`font-semibold`}>Color:</Text>{" "}
                        {aiAnalysisResult.color}
                      </CustomText>
                    </View>
                  )}
                </View>

                <View style={tw`space-y-3`}>
                  <TouchableOpacity
                    onPress={() => applyAISuggestions("all")}
                    style={tw`bg-orange-500 py-4 rounded-xl active:bg-orange-600 mb-4`}
                  >
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-white text-sm text-center`}
                    >
                      Apply All Suggestions
                    </CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={skipAIAnalysis}
                    style={tw`border border-gray-300 py-4 rounded-xl active:bg-gray-50`}
                  >
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-gray-700 text-sm text-center`}
                    >
                      Fill Manually Instead
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={tw`flex-row items-center mb-4`}>
                  <Ionicons name="sparkles" size={24} color="#F59549" />
                  <CustomText weight="Bold" style={tw`text-lg ml-2`}>
                    AI-Powered Analysis
                  </CustomText>
                </View>

                <CustomText style={tw`text-gray-600 text-sm mb-6`}>
                  Would you like to use AI to analyze this image and auto-fill
                  the form?
                </CustomText>

                <View style={tw`space-y-3`}>
                  <TouchableOpacity
                    onPress={analyzeImageWithAI}
                    style={tw`bg-orange-500 py-4 rounded-xl active:bg-orange-600 mb-4`}
                  >
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-white text-sm text-center`}
                    >
                      Yes, Analyze with AI
                    </CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={skipAIAnalysis}
                    style={tw`border border-gray-300 py-4 rounded-xl active:bg-gray-50`}
                  >
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-gray-700 text-sm text-center`}
                    >
                      No, I'll Fill Manually
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const handlePetUpdated = (pet, action) => {
    if (action === "edit") {
      openEditModal(pet);
    } else if (action === "delete") {
      fetchPets();
    }
  };

  const renderEmptyState = () => (
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
      </View>

      {/* ADD DRAFT INDICATOR HERE TOO */}
      {hasDraft && (
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
              Continue your unfinished pet registration
            </CustomText>
          </View>
          <Feather name="chevron-right" size={20} color="#f59e0b" />
        </TouchableOpacity>
      )}

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

      {/* ADD DRAFT INDICATOR HERE */}
      {hasDraft && (
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
              Continue your unfinished pet registration
            </CustomText>
          </View>
          <Feather name="chevron-right" size={20} color="#f59e0b" />
        </TouchableOpacity>
      )}

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

  const renderSignatureSection = () => (
    <View style={tw`mb-6`}>
      <View style={tw`flex-row items-center justify-between mb-3 mt-2`}>
        <CustomText weight="SemiBold" style={tw`text-sm`}>
          Owner Signature *
        </CustomText>
        {form.ownerSignature && (
          <TouchableOpacity
            onPress={handleClearSignature}
            style={tw`flex-row items-center`}
          >
            <Ionicons name="refresh" size={16} color="#f97316" />
            <CustomText style={tw`text-orange-500 text-sm ml-1`}>
              Clear
            </CustomText>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={tw`border-2 border-gray-200 rounded-2xl overflow-hidden bg-white`}
      >
        <View style={{ height: 250 }}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={() => showFeedback("error", "Please draw your signature")}
            onBegin={() => {
              console.log("Drawing started");
              if (!isDrawingRef.current) {
                isDrawingRef.current = true;
                setIsDrawingSignature(true);
                setScrollEnabled(false);
              }
              if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
              }
            }}
            onEnd={() => {
              console.log("Drawing ended");
              if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
              }
              drawingTimeoutRef.current = setTimeout(() => {
                isDrawingRef.current = false;
                setIsDrawingSignature(false);
                setScrollEnabled(true);
              }, 300);
            }}
            descriptionText="Sign here"
            clearText="Clear"
            confirmText="Save"
            webStyle={`
              .m-signature-pad {
                box-shadow: none; 
                border: none;
                width: 100%;
                height: 100%;
              } 
              .m-signature-pad--body {
                border: none;
                touch-action: none;
                -webkit-user-select: none;
                user-select: none;
              }
              .m-signature-pad--body canvas {
                width: 100% !important;
                height: 100% !important;
                touch-action: none;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
              }
              .m-signature-pad--footer {
                display: flex; 
                justify-content: center; 
                gap: 10px;
                margin: 10px 0;
              }
              .m-signature-pad--footer .button {
                background-color: #f97316;
                color: white;
                border: none;
                padding: 10px 24px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
              }
              .m-signature-pad--footer .button.clear {
                background-color: #6b7280;
              }
              .m-signature-pad--footer .button:active {
                opacity: 0.8;
              }
              body, html {
                width: 100%; 
                height: 100%;
                margin: 0;
                padding: 0;
                touch-action: none;
                -webkit-user-select: none;
                user-select: none;
                overflow: hidden;
              }
              * {
                touch-action: none;
                -webkit-touch-callout: none;
              }
            `}
            penColor="black"
            backgroundColor="white"
            minWidth={1.5}
            maxWidth={3.5}
            throttle={0}
            dotSize={2}
            velocityFilterWeight={0.7}
            minDistance={2}
          />
        </View>
      </View>

      {form.ownerSignature ? (
        <View style={tw`mt-4 p-4 bg-green-50 rounded-xl`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <CustomText style={tw`text-green-700 text-sm ml-2`}>
              ✓ Signature saved successfully
            </CustomText>
          </View>
        </View>
      ) : (
        <View
          style={tw`mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200`}
        >
          <View style={tw`flex-row items-start`}>
            <Ionicons name="information-circle" size={20} color="#f97316" />
            <View style={tw`ml-3 flex-1`}>
              <CustomText weight="SemiBold" style={tw`text-orange-700 text-sm`}>
                Signature required
              </CustomText>
              <CustomText style={tw`text-orange-600 text-xs mt-1`}>
                Please sign above to complete pet registration
              </CustomText>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderStepIndicator = () => {
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
  };

  const renderStepContent = () => {
    const renderPhotoStep = () => (
      <View>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <CustomText weight="SemiBold" style={tw`text-sm`}>
            Photo of the Pet
          </CustomText>

          {form.photoUrl && !aiAnalysisResult && (
            <TouchableOpacity
              onPress={() => setShowAIOptions(true)}
              style={tw`flex-row items-center bg-blue-50 px-3 py-1 rounded-full`}
            >
              <Ionicons name="sparkles" size={14} color="#3b82f6" />
              <CustomText style={tw`text-blue-600 text-xs ml-1`}>
                AI Analyze
              </CustomText>
            </TouchableOpacity>
          )}
        </View>

        <CustomText style={tw`text-gray-600 text-xs mb-3`}>
          Upload a clear photo of a dog or cat for AI analysis
        </CustomText>

        <TouchableOpacity
          onPress={handlePickImage}
          disabled={loading || isValidatingImage}
          style={tw`border-2 border-orange-400 rounded-3xl items-center justify-center mb-6 ${
            form.photoUrl ? "border-0" : ""
          } ${loading || isValidatingImage ? "opacity-50" : ""}`}
        >
          {form.photoUrl ? (
            <View style={tw`w-full relative`}>
              <Image
                source={{ uri: form.photoUrl }}
                style={tw`w-full h-58 rounded-2xl`}
                resizeMode="cover"
              />
              {isValidatingImage && (
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
              {isValidatingImage ? (
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
                  <CustomText style={tw`text-red-500 text-xs pb-8`}>
                    Required
                  </CustomText>
                </>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Add AI validation indicator */}
        <AIVisualIndicator />

        {fieldErrors.photoUrl && (
          <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 -mt-4 mb-4`}>
            {fieldErrors.photoUrl}
          </CustomText>
        )}
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
              error={fieldErrors.name}
            />
            {fieldErrors.name && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 -mt-2 mb-2`}>
                {fieldErrors.name}
              </CustomText>
            )}
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
            {fieldErrors.species && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 -mt-2 mb-2`}>
                {fieldErrors.species}
              </CustomText>
            )}

            {form.species && (
              <CustomInput
                label="Breed"
                placeholder={`Enter ${form.species} breed`}
                value={form.breed}
                onChangeText={(text) => handleChange("breed", text)}
              />
            )}

            <CustomText weight="SemiBold" style={tw`mt-4 mb-2`}>
              Sex *
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
            {fieldErrors.sex && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 -mt-2 mb-2`}>
                {fieldErrors.sex}
              </CustomText>
            )}

            <DateOfBirthPicker
              value={form.dateOfBirth}
              onDateChange={(dob) => handleChange("dateOfBirth", dob)}
              error={fieldErrors.dateOfBirth}
            />
            {fieldErrors.dateOfBirth && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1`}>
                {fieldErrors.dateOfBirth}
              </CustomText>
            )}

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
          <View style={tw`flex-1`}>
            <CustomText weight="Bold" style={tw`text-xl text-gray-900 mb-1`}>
              Owner Info
            </CustomText>
            <CustomText style={tw`text-gray-500 mb-6`}>
              Confirm your contact details
            </CustomText>

            <CustomInput
              label="Phone Number"
              placeholder="Enter phone number"
              value={form.ownerPhone}
              onChangeText={(text) => handleChange("ownerPhone", text)}
              keyboardType="phone-pad"
              error={fieldErrors.ownerPhone}
            />
            {fieldErrors.ownerPhone && (
              <CustomText style={tw`text-red-500 text-xs mt-1 ml-1 -mt-2 mb-4`}>
                {fieldErrors.ownerPhone}
              </CustomText>
            )}

            {renderSignatureSection()}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {initialLoading ? (
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <View
            style={tw`flex-row justify-between items-center px-6 pt-2 pb-4`}
          >
            <View>
              <SkeletonShimmer style={tw`h-7 w-40 mb-1`} />
              <SkeletonShimmer style={tw`h-3 w-24`} />
            </View>
            <SkeletonShimmer style={tw`w-12 h-12 rounded-full`} />
          </View>
          <ScrollView
            style={tw`flex-1 px-6`}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((key) => (
              <View
                key={key}
                style={tw`bg-white border border-gray-100 rounded-[24px] p-4 mb-4 flex-row items-center shadow-sm`}
              >
                <SkeletonShimmer style={tw`w-24 h-24 rounded-2xl`} />
                <View style={tw`flex-1 ml-4`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <SkeletonShimmer style={tw`h-5 w-28 mr-2`} />
                    <SkeletonShimmer style={tw`h-5 w-16 rounded-full`} />
                  </View>
                  <SkeletonShimmer style={tw`h-3 w-20 mb-3`} />
                  <View style={tw`flex-row`}>
                    <SkeletonShimmer style={tw`w-16 h-7 rounded-lg mr-2`} />
                    <SkeletonShimmer style={tw`w-16 h-7 rounded-lg`} />
                  </View>
                </View>
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
            <View
              style={tw`px-6 py-4 border-b border-gray-100 flex-row justify-between items-center`}
            >
              <TouchableOpacity
                onPress={handleCancel} // Changed to use handleCancel
                style={tw`p-2`}
              >
                <Ionicons name="close-outline" size={28} color="#1F2937" />
              </TouchableOpacity>
              <CustomText weight="Bold" style={tw`text-lg`}>
                {isEditMode ? "Edit Pet" : "Registration"}
              </CustomText>
              <View style={tw`w-10`} />
            </View>

            <ScrollView
              style={tw`flex-1 px-6`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={false}
              scrollEnabled={scrollEnabled}
            >
              {renderStepIndicator()}
              {renderStepContent()}
            </ScrollView>

            <View
              style={[
                tw`p-6 border-t border-gray-100 bg-white`,
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
                      disabled={isSubmitting || loading}
                    >
                      <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                        Back
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (currentStep === 4) {
                          handleSubmit();
                        } else {
                          if (validateCurrentStep()) {
                            setCurrentStep((prev) => prev + 1);
                          } else {
                            showFeedback(
                              "error",
                              "Please fill in all required fields correctly."
                            );
                          }
                        }
                      }}
                      disabled={isSubmitting || loading}
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200 ${
                        isSubmitting || loading ? "opacity-50" : ""
                      }`}
                    >
                      <CustomText weight="Bold" style={tw`text-white`}>
                        {currentStep === 4
                          ? loading || isSubmitting
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
                      onPress={handleCancel} // Changed to use handleCancel
                      style={tw`flex-1 bg-gray-100 py-4 rounded-2xl items-center`}
                      disabled={isSubmitting || loading}
                    >
                      <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                        Cancel
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (validateCurrentStep()) {
                          setCurrentStep((prev) => prev + 1);
                        } else {
                          showFeedback(
                            "error",
                            "Please fill in all required fields correctly."
                          );
                        }
                      }}
                      disabled={isSubmitting || loading}
                      style={tw`flex-1 bg-orange-500 py-4 rounded-2xl items-center shadow-md shadow-orange-200 ${
                        isSubmitting || loading ? "opacity-50" : ""
                      }`}
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

      <DraftPromptModal />

      <AISuggestionsModal />

      <FeedbackModal
        visible={feedbackVisible}
        type={feedbackType}
        message={feedbackMessage}
        onClose={() => setFeedbackVisible(false)}
      />
    </SafeAreaView>
  );
}
