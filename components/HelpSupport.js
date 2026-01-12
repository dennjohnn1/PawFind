import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "./CustomText";
import CustomInput from "./CustomInput";

export default function HelpSupportScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Help Topics Content
  const topicContent = {
    "getting-started": {
      title: "Getting Started",
      icon: "rocket-outline",
      iconColor: "#F59549",
      backgroundColor: "#FFF7ED",
      sections: [
        {
          heading: "Welcome to PawFind!",
          content: "PawFind helps reunite lost pets with their families. Our community-driven platform makes it easy to report and find missing pets in your area."
        },
        {
          heading: "How to Report a Lost Pet",
          steps: [
            "Tap the '+' button on the home screen",
            "Select 'Report Lost Pet'",
            "Add clear photos of your pet",
            "Fill in your pet's details (name, breed, color, etc.)",
            "Add the location where your pet was last seen",
            "Submit your report"
          ]
        },
        {
          heading: "How to Report a Found Pet",
          steps: [
            "Tap the '+' button on the home screen",
            "Select 'Report Found Pet'",
            "Take photos of the pet you found",
            "Add the exact location where you found the pet",
            "Provide any distinctive features or identifying marks",
            "Submit to help owners find their pet"
          ]
        },
        {
          heading: "Tips for Success",
          content: "Use multiple clear photos, update your report regularly, share on social media, and contact local shelters. The more details you provide, the better chance of a successful reunion!"
        }
      ]
    },
    "reports": {
      title: "Managing Reports",
      icon: "newspaper-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      sections: [
        {
          heading: "Viewing Your Reports",
          content: "Access all your reports by going to Profile > My Reports. Here you can see all lost and found pet reports you've created."
        },
        {
          heading: "Editing a Report",
          steps: [
            "Go to 'My Reports' in your profile",
            "Select the report you want to edit",
            "Tap the three dots menu (⋯)",
            "Select 'Edit Report'",
            "Update the information",
            "Save your changes"
          ]
        },
        {
          heading: "Marking as Resolved",
          content: "When your pet is found or reunited, mark the report as resolved. This celebrates the reunion and helps track success stories in our community."
        },
        {
          heading: "Deleting Reports",
          content: "You can delete any report from the three dots menu. Note: This action cannot be undone. Consider marking as resolved instead to inspire hope in others."
        },
        {
          heading: "Report Status",
          content: "Reports can be 'Active' (still searching) or 'Resolved' (pet found). Use filters in My Reports to view specific statuses."
        }
      ]
    },
    "safety": {
      title: "Safety & Privacy",
      icon: "shield-checkmark-outline",
      iconColor: "#10B981",
      backgroundColor: "#F0FDF4",
      sections: [
        {
          heading: "Your Privacy Matters",
          content: "PawFind takes your privacy seriously. Your contact information is only shared when you choose to respond to a report or when someone reports finding your lost pet."
        },
        {
          heading: "Verify Pet Ownership",
          steps: [
            "Ask for specific details only the owner would know",
            "Request recent photos of the pet",
            "Check for microchip information if available",
            "Meet in a safe, public location",
            "Bring someone with you when meeting",
            "Trust your instincts"
          ]
        },
        {
          heading: "Protecting Your Information",
          content: "Never share banking details, passwords, or sensitive personal information. PawFind will never ask for payment to reunite you with your pet."
        },
        {
          heading: "Report Suspicious Activity",
          content: "If you encounter suspicious behavior or potential scams, report it immediately through the app or contact support@pawfind.com."
        },
        {
          heading: "Safe Meeting Guidelines",
          steps: [
            "Choose public, well-lit locations",
            "Bring a friend or family member",
            "Inform someone of your meeting plans",
            "Meet during daylight hours when possible",
            "Don't share your home address initially"
          ]
        }
      ]
    },
    "faq": {
      title: "Frequently Asked Questions",
      icon: "help-circle-outline",
      iconColor: "#8B5CF6",
      backgroundColor: "#FAF5FF",
      sections: [
        {
          heading: "Is PawFind free to use?",
          content: "Yes! PawFind is completely free. We believe every pet deserves a chance to be reunited with their family."
        },
        {
          heading: "How do notifications work?",
          content: "You'll receive notifications when someone reports finding a pet matching your description, when your report is viewed, and for nearby lost pet alerts. Manage these in Settings > Notifications."
        },
        {
          heading: "Can I edit my report after posting?",
          content: "Absolutely! You can edit any report at any time from 'My Reports'. Update photos, location, or description as needed."
        },
        {
          heading: "What if I find my pet?",
          content: "Congratulations! Please mark your report as 'Resolved' so others know your pet is safe. This helps track successful reunions."
        },
        {
          heading: "How far does my report reach?",
          content: "Reports are visible to all PawFind users. Use the map feature to see reports in specific areas. We recommend also posting on local community groups."
        },
        {
          heading: "Can I save reports to view later?",
          content: "Yes! Tap the bookmark icon on any report to save it. Access saved reports from the Saved tab on the home screen."
        },
        {
          heading: "What should I do in an emergency?",
          content: "For immediate emergencies, contact your local animal shelter, veterinary clinics, and animal control. Then create a report on PawFind to expand your search."
        }
      ]
    }
  };

  // Help Topics
  const helpTopics = [
    {
      id: "getting-started",
      title: "Getting Started",
      subtitle: "Learn the basics of PawFind",
      icon: "rocket-outline",
      iconColor: "#F59549",
      backgroundColor: "#FFF7ED",
      onPress: () => openModal("getting-started"),
    },
    {
      id: "reports",
      title: "Managing Reports",
      subtitle: "Create and track pet reports",
      icon: "newspaper-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      onPress: () => openModal("reports"),
    },
    {
      id: "safety",
      title: "Safety & Privacy",
      subtitle: "Keep your information safe",
      icon: "shield-checkmark-outline",
      iconColor: "#10B981",
      backgroundColor: "#F0FDF4",
      onPress: () => openModal("safety"),
    },
    {
      id: "faq",
      title: "FAQs",
      subtitle: "Common questions answered",
      icon: "help-circle-outline",
      iconColor: "#8B5CF6",
      backgroundColor: "#FAF5FF",
      onPress: () => openModal("faq"),
    },
  ];

  // Contact Options
  const contactOptions = [
    {
      id: "email",
      title: "Email Support",
      subtitle: "support@pawfind.com",
      icon: "mail-outline",
      iconColor: "#F59549",
      backgroundColor: "#FFF7ED",
      onPress: () => Linking.openURL("mailto:support@pawfind.com"),
    },
    {
      id: "phone",
      title: "Call Us",
      subtitle: "+63 123 456 7890",
      icon: "call-outline",
      iconColor: "#10B981",
      backgroundColor: "#F0FDF4",
      onPress: () => Linking.openURL("tel:+63123456789"),
    },
  ];

  const openModal = (topicId) => {
    setSelectedTopic(topicContent[topicId]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTopic(null);
  };

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

      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View
        style={tw`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
          Help & Support
        </CustomText>

        <View style={tw`w-10`} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        {/* Search Bar */}
        <View style={tw`px-5 py-4`}>
          <View>
            <CustomInput
              placeholder="Search for help..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Help Topics */}
        <View style={tw`px-5 py-6 border-b border-gray-100`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View
              style={tw`w-8 h-8 rounded-lg bg-orange-50 items-center justify-center mr-3`}
            >
              <Ionicons name="book-outline" size={18} color="#F59549" />
            </View>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              Help Topics
            </CustomText>
          </View>

          <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
            {helpTopics.map((item, index) => (
              <MenuItem
                key={item.id}
                item={item}
                isLast={index === helpTopics.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Contact Support */}
        <View style={tw`px-5 py-6 border-b border-gray-100`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View
              style={tw`w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3`}
            >
              <Ionicons name="headset-outline" size={18} color="#3B82F6" />
            </View>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              Contact Support
            </CustomText>
          </View>

          <View style={tw`bg-white rounded-2xl shadow-sm overflow-hidden`}>
            {contactOptions.map((item, index) => (
              <MenuItem
                key={item.id}
                item={item}
                isLast={index === contactOptions.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Emergency Info */}
        <View
          style={tw`mx-5 mt-2 mb-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex-row`}
        >
          <Ionicons
            name="information-circle"
            size={20}
            color="#F59549"
            style={tw`mr-3 mt-0.5`}
          />
          <View style={tw`flex-1`}>
            <CustomText weight="SemiBold" style={tw`text-orange-900 text-sm mb-1`}>
              Need Immediate Help?
            </CustomText>
            <CustomText style={tw`text-orange-800 text-xs leading-5`}>
              For urgent pet emergencies, contact your local animal shelter or veterinary clinic immediately.
            </CustomText>
          </View>
        </View>
      </ScrollView>

      {/* Help Topic Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={tw`flex-1 bg-black/15 justify-end`}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={closeModal}
            style={tw`flex-1`}
          />
          <View style={tw`bg-white rounded-t-3xl h-[85%]`}>
            {/* Modal Header */}
            <View style={tw`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1`}>
                {selectedTopic && (
                  <View
                    style={[
                      tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                      { backgroundColor: selectedTopic.backgroundColor },
                    ]}
                  >
                    <Ionicons 
                      name={selectedTopic.icon} 
                      size={20} 
                      color={selectedTopic.iconColor} 
                    />
                  </View>
                )}
                <CustomText weight="Bold" style={tw`text-gray-900 text-base flex-1`}>
                  {selectedTopic?.title}
                </CustomText>
              </View>
              
              <TouchableOpacity onPress={closeModal} style={tw`p-2`}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={tw`flex-1`}
              contentContainerStyle={tw`px-5 py-6`}
              showsVerticalScrollIndicator={false}
            >
              {selectedTopic?.sections.map((section, index) => (
                <View key={index} style={tw`mb-6`}>
                  <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm mb-3`}>
                    {section.heading}
                  </CustomText>
                  
                  {section.content && (
                    <CustomText style={tw`text-gray-600 text-sm leading-6 mb-2`}>
                      {section.content}
                    </CustomText>
                  )}
                  
                  {section.steps && (
                    <View style={tw`bg-gray-50 rounded-xl p-4`}>
                      {section.steps.map((step, stepIndex) => (
                        <View key={stepIndex} style={tw`flex-row mb-3 last:mb-0`}>
                          <View style={tw`w-6 h-6 rounded-full bg-orange-500 items-center justify-center mr-3 mt-0.5`}>
                            <CustomText weight="SemiBold" style={tw`text-white text-xs`}>
                              {stepIndex + 1}
                            </CustomText>
                          </View>
                          <CustomText style={tw`text-gray-700 text-sm flex-1 leading-6`}>
                            {step}
                          </CustomText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {/* Help Button at Bottom */}
              <View style={tw`mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex-row`}>
                <Ionicons name="help-circle" size={20} color="#3B82F6" style={tw`mr-3 mt-0.5`} />
                <View style={tw`flex-1`}>
                  <CustomText weight="SemiBold" style={tw`text-blue-900 text-sm mb-1`}>
                    Still need help?
                  </CustomText>
                  <CustomText style={tw`text-blue-800 text-xs mb-3`}>
                    Contact our support team for personalized assistance.
                  </CustomText>
                  <TouchableOpacity
                    onPress={() => {
                      closeModal();
                      Linking.openURL("mailto:support@pawfind.com");
                    }}
                    style={tw`bg-blue-500 py-2 px-4 rounded-lg self-start`}
                  >
                    <CustomText weight="SemiBold" style={tw`text-white text-xs`}>
                      Contact Support
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}