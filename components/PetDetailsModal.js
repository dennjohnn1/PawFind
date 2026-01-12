import { useState, useRef, useEffect } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import CustomText from "./CustomText";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Easing } from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import * as IntentLauncher from "expo-intent-launcher";
import PetService from "../service/PetService";
import CertificateService from "../service/CertificateService";

export default function PetDetailsModal({
  visible,
  pet,
  onClose,
  onPetUpdated,
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(80);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!pet) return null;

  const handleEditPet = () => {
    onPetUpdated?.(pet, "edit");
    onClose();
  };

  const handleDeletePet = () => {
    Alert.alert(
      "Remove Pet",
      `Are you sure you want to remove ${pet.name}? This action cannot be undone.`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setDeleting(true);
              await PetService.deletePet(pet.id);
              onPetUpdated?.(pet, "delete");
              onClose();
            } catch (error) {
              console.error("Error deleting pet:", error);
              Alert.alert("Error", "Failed to delete pet. Please try again.");
            } finally {
              setDeleting(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const formatDate = (dob) => {
    if (!dob) return "N/A";

    let birthDate;

    if (dob.year && dob.month && dob.day) {
      birthDate = new Date(dob.year, dob.month - 1, dob.day);
    } else if (dob.seconds) {
      birthDate = new Date(dob.seconds * 1000);
    } else if (dob instanceof Date) {
      birthDate = dob;
    } else {
      return "N/A";
    }

    return birthDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return "Unknown";

    let birthDate;
    if (dob.year && dob.month && dob.day) {
      birthDate = new Date(dob.year, dob.month - 1, dob.day);
    } else if (dob.seconds) {
      birthDate = new Date(dob.seconds * 1000);
    } else if (dob instanceof Date) {
      birthDate = dob;
    } else {
      return "Unknown";
    }

    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    const days = today.getDate() - birthDate.getDate();

    if (days < 0) months--;
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) return "Unknown";

    if (years === 0 && months === 0) return "Less than 1 month old";
    if (years === 0) return `${months} month${months > 1 ? "s" : ""} old`;
    if (months === 0) return `${years} year${years > 1 ? "s" : ""} old`;

    return `${years} year${years > 1 ? "s" : ""} ${months} month${
      months > 1 ? "s" : ""
    } old`;
  };

  const handleDownloadCertificate = async () => {
    if (!pet) {
      Alert.alert("Error", "Pet information not available.");
      return;
    }

    try {
      setCertificateLoading(true);

      // Always generate a new certificate since the Cloudinary one is private
      console.log("[Certificate] Generating new certificate...");
      await CertificateService.generateAndDownloadCertificate(pet);
    } catch (error) {
      console.error("[Certificate] Failed to generate certificate:", error);

      Alert.alert(
        "Unable to Generate Certificate",
        "There was an error creating the certificate. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setCertificateLoading(false);
    }
  };

  // Helper function for direct download
  const handleDirectDownload = async (url) => {
    try {
      setCertificateLoading(true);

      const safePetName = pet.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${safePetName}_certificate_${
        pet.certificate.number || pet.id.slice(0, 8)
      }.pdf`;

      const fileUri = FileSystem.cacheDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status === 200) {
        Alert.alert("Success", "Certificate downloaded successfully!");

        // Share or open the file
        if (Platform.OS === "ios") {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          try {
            const contentUri = await FileSystem.getContentUriAsync(
              downloadResult.uri
            );
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                type: "application/pdf",
              }
            );
          } catch {
            await Linking.openURL(`file://${downloadResult.uri}`);
          }
        }
      } else {
        throw new Error(`Download failed: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error("Direct download failed:", error);
      Alert.alert("Error", "Failed to download certificate.");
    } finally {
      setCertificateLoading(false);
    }
  };

  const TabButton = ({ name, label, active }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(name)}
      style={tw`flex-1 items-center py-4 px-3 border-b-2 ${
        active ? "border-orange-500 bg-orange-50" : "border-gray-200"
      }`}
    >
      <CustomText
        weight={active ? "SemiBold" : "Regular"}
        style={tw`text-xs ${active ? "text-orange-600" : "text-gray-500"}`}
      >
        {label}
      </CustomText>
    </TouchableOpacity>
  );

  const InfoCard = ({ icon, label, value, highlight }) => (
    <View
      style={tw`flex-row items-center bg-white p-4 rounded-xl mb-2 border ${
        highlight ? "border-orange-100" : "border-gray-100"
      }`}
    >
      <View
        style={tw`${
          highlight ? "bg-orange-100" : "bg-gray-100"
        } p-3 rounded-lg mr-3`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={highlight ? "#F59549" : "#6B7280"}
        />
      </View>
      <View style={tw`flex-1`}>
        <CustomText style={tw`text-gray-500 text-xs mb-0.5`}>
          {label}
        </CustomText>
        <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm`}>
          {value}
        </CustomText>
      </View>
    </View>
  );

  const renderDetailsTab = () => (
    <View style={tw`px-6 pt-6 pb-8`}>
      <View style={tw`mb-6`}>
        <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-4`}>
          Basic Information
        </CustomText>
        <InfoCard icon="paw" label="Breed" value={pet.breed || "Unknown"} />
        <InfoCard
          icon="color-palette"
          label="Color"
          value={pet.color || "Not specified"}
        />
        <InfoCard
          icon="calendar"
          label="Date of Birth"
          value={formatDate(pet.dateOfBirth)}
        />
        <InfoCard
          icon="time"
          label="Age"
          value={calculateAge(pet.dateOfBirth)}
          highlight
        />
      </View>

      <View>
        <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-4`}>
          Physical Traits
        </CustomText>
        <InfoCard
          icon={pet.sex === "Male" ? "male" : "female"}
          label="Sex"
          value={pet.sex || "Unknown"}
        />
        {pet.distinguishingMarks && (
          <View
            style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2`}
          >
            <CustomText
              weight="SemiBold"
              style={tw`text-gray-700 text-sm mb-2`}
            >
              Distinguishing Marks
            </CustomText>
            <CustomText style={tw`text-orange-600 text-sm leading-5`}>
              {pet.distinguishingMarks}
            </CustomText>
          </View>
        )}
      </View>
    </View>
  );

  const renderHealthTab = () => (
    <View style={tw`px-6 pt-6 pb-8`}>
      {pet.vaccinations && pet.vaccinations.length > 0 && (
        <View style={tw`mb-6`}>
          <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-3`}>
            Vaccinations
          </CustomText>
          {pet.vaccinations.map((vaccine, idx) => (
            <View
              key={idx}
              style={tw`flex-row items-center bg-gray-50 p-3 rounded-lg mb-2 border border-gray-100`}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#28A745"
                style={tw`mr-3`}
              />
              <CustomText style={tw`text-gray-800 text-sm font-medium`}>
                {vaccine}
              </CustomText>
            </View>
          ))}
        </View>
      )}

      {pet.allergies && (
        <View style={tw`mb-6`}>
          <View style={tw`flex-row align-center items-center mb-3`}>
            <Ionicons
              name="alert-circle"
              size={18}
              color="#292929"
              style={tw`mr-2`}
            />
            <CustomText weight="Bold" style={tw`text-[#292929] text-base`}>
              Allergies
            </CustomText>
          </View>
          <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100`}>
            <CustomText style={tw`text-red-800 text-sm`}>
              {pet.allergies}
            </CustomText>
          </View>
        </View>
      )}

      {pet.medicalNotes && (
        <View>
          <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-3`}>
            Medical Notes
          </CustomText>
          <View style={tw`bg-blue-50 p-4 rounded-xl border border-blue-100`}>
            <CustomText style={tw`text-blue-900 text-sm`}>
              {pet.medicalNotes}
            </CustomText>
          </View>
        </View>
      )}

      {!pet.vaccinations?.length && !pet.allergies && !pet.medicalNotes && (
        <View style={tw`items-center justify-center py-16`}>
          <Ionicons name="medical" size={40} color="#D1D5DB" style={tw`mb-3`} />
          <CustomText style={tw`text-gray-400 text-sm`}>
            No health information recorded
          </CustomText>
        </View>
      )}
    </View>
  );

  const renderOwnerTab = () => (
    <View style={tw`px-6 pt-6 pb-8`}>
      <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-4`}>
        Owner Information
      </CustomText>
      <InfoCard icon="person" label="Name" value={pet.ownerName || "Unknown"} />
      <InfoCard
        icon="mail"
        label="Email"
        value={pet.ownerEmail || "Not provided"}
      />
      <InfoCard
        icon="call"
        label="Phone"
        value={pet.ownerPhone || "Not provided"}
      />

      {pet.certificate && (
        <View style={tw`mt-8`}>
          <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-4`}>
            Certificate
          </CustomText>
          <View style={tw`p-4 rounded-xl border border-blue-100`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`bg-blue-100 p-2 rounded-lg mr-3`}>
                  <Ionicons name="document-text" size={20} color="#3B82F6" />
                </View>
                <View>
                  <CustomText
                    weight="SemiBold"
                    style={tw`text-blue-900 text-sm`}
                  >
                    Registration Certificate
                  </CustomText>
                  <CustomText style={tw`text-blue-600 text-xs`}>
                    Tap to download certificate
                  </CustomText>
                </View>
              </View>

              {/* Status Icon */}
              <View style={tw`bg-green-100 px-2.5 py-1 rounded-full`}>
                <Ionicons name="download" size={20} color="#10B981" />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDownloadCertificate}
              disabled={certificateLoading}
              style={tw`bg-blue-500 py-3 rounded-lg items-center mt-2 active:bg-blue-600 mt-4 ${
                certificateLoading ? "opacity-70" : ""
              }`}
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name={certificateLoading ? "sync" : "download"}
                  size={16}
                  color="white"
                  style={tw`mr-2 ${certificateLoading ? "animate-spin" : ""}`}
                />
                <CustomText weight="SemiBold" style={tw`text-white text-sm`}>
                  {certificateLoading
                    ? "Generating Certificate..."
                    : "Download Certificate"}
                </CustomText>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      animationType="none"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Animated.View
          style={[
            tw`flex-1`,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header with close button */}
          <View
            style={tw`px-6 py-2 flex-row justify-between items-center border-b border-gray-100`}
          >
            <View style={tw`flex-1`}>
              <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
                Pet Details
              </CustomText>
            </View>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <Ionicons name="close" size={26} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Hero section with pet image and quick info */}
          <View
            style={tw`px-6 py-4 pb-2 bg-gradient-to-b from-orange-50 to-white border-b border-gray-100`}
          >
            <View style={tw`flex-row items-start mb-4`}>
              {pet.photoUrl ? (
                <Image
                  source={{ uri: pet.photoUrl }}
                  style={tw`w-24 h-24 rounded-3xl mr-4`}
                />
              ) : (
                <View
                  style={tw`w-24 h-24 rounded-3xl bg-gray-200 items-center justify-center mr-4`}
                >
                  <Ionicons name="paw" size={40} color="#9CA3AF" />
                </View>
              )}

              <View style={tw`flex-1`}>
                <View style={tw`flex-1 flex-row items-center justify-between`}>
                  {/* Pet Name */}
                  <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
                    {pet.name}
                  </CustomText>

                  <TouchableOpacity
                    onPress={handleEditPet}
                    activeOpacity={0.7}
                    style={tw`ml-2 p-2 h-[36px] rounded-xl bg-[#F59549]`}
                  >
                    <MaterialIcons name="edit" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <CustomText style={tw`text-gray-500 text-[13px] mb-2`}>
                  {calculateAge(pet.dateOfBirth)}
                </CustomText>

                <View style={tw`flex-row items-center flex-wrap`}>
                  <View
                    style={tw`bg-orange-100 rounded-lg px-3 py-1 mr-2 mb-2`}
                  >
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-orange-600 text-xs uppercase`}
                    >
                      {pet.species}
                    </CustomText>
                  </View>
                  {pet.sex && (
                    <View
                      style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-1 mb-2`}
                    >
                      <Ionicons
                        name={pet.sex === "Male" ? "male" : "female"}
                        size={14}
                        color="#6B7280"
                        style={tw`mr-1`}
                      />
                      <CustomText style={tw`text-gray-600 text-xs`}>
                        {pet.sex}
                      </CustomText>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={tw`flex-row bg-white border-b border-gray-200`}>
            <TabButton
              name="details"
              label="Details"
              active={activeTab === "details"}
            />
            <TabButton
              name="health"
              label="Health"
              active={activeTab === "health"}
            />
            <TabButton
              name="owner"
              label="Owner"
              active={activeTab === "owner"}
            />
          </View>

          {/* Content */}
          <ScrollView
            style={tw`flex-1 bg-white`}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "details" && renderDetailsTab()}
            {activeTab === "health" && renderHealthTab()}
            {activeTab === "owner" && renderOwnerTab()}
          </ScrollView>

          <View style={tw`px-6 py-4 border-t border-gray-100 bg-white`}>
            <TouchableOpacity
              onPress={handleDeletePet}
              disabled={deleting}
              style={tw`bg-red-500 py-4 rounded-xl items-center active:bg-red-600 ${
                deleting ? "opacity-70" : ""
              }`}
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name="trash"
                  size={18}
                  color="white"
                  style={tw`mr-2`}
                />
                <CustomText weight="SemiBold" style={tw`text-white text-sm`}>
                  {deleting ? "Removing..." : "Remove Pet"}
                </CustomText>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}
