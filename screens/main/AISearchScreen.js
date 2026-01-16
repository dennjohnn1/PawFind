import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import PetService from "../../service/PetService";
import AIBehaviorService from "../../service/AIBehaviorService"; // Updated Service Import

export default function AISearchScreen() {
  const [lostPets, setLostPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // 1. Fetch pets that are currently marked as "lost"
  useEffect(() => {
    loadLostPets();
  }, []);

  const loadLostPets = async () => {
    try {
      setLoading(true);
      const allMyPets = await PetService.getMyPets();
      // Filter for pets that have a 'lost' status
      const lostOnly = allMyPets.filter((pet) => pet.status === "lost");
      setLostPets(lostOnly);
    } catch (error) {
      console.error("Error loading lost pets:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Run the Behavioral AI Analysis using the new AIBehaviorService
  const handleRunAnalysis = async () => {
    if (!selectedPet) {
      Alert.alert("Selection Required", "Please select a pet to analyze.");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await AIBehaviorService.analyzeLostBehavior({
        species: selectedPet.species,
        breed: selectedPet.breed || "Unknown",
        behavior: selectedPet.behaviorTraits || "Friendly but cautious",
        lastSeenTime: selectedPet.updatedAt
          ? new Date(selectedPet.updatedAt).toLocaleString()
          : "Recently",
        environment: "Urban/Residential",
      });

      setAnalysisResult(result);
    } catch (error) {
      // Specific check for Quota/Rate Limit errors
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        Alert.alert(
          "Daily Limit Reached",
          "The AI is resting! You've used all free analyses for today. Please try again in 24 hours."
        );
      } else {
        Alert.alert(
          "Analysis Error",
          "Something went wrong. Please try again later."
        );
      }
      console.error("[AISearchScreen] Analysis Error:", error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View
        style={tw`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}
      >
        <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
          AI Behavioral Search
        </CustomText>
        <TouchableOpacity onPress={loadLostPets}>
          <Ionicons name="refresh" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw`p-5`}>
        <CustomText style={tw`text-gray-500 mb-6`}>
          Select your lost pet to generate a predictive search strategy based on
          their personality and common animal behaviors.
        </CustomText>

        {/* Pet Selection Area */}
        <CustomText weight="SemiBold" style={tw`text-gray-800 mb-3`}>
          Your Lost Pets
        </CustomText>

        {loading ? (
          <ActivityIndicator color="#F97316" style={tw`my-4`} />
        ) : lostPets.length === 0 ? (
          <View
            style={tw`bg-gray-50 p-6 rounded-3xl items-center border border-dashed border-gray-300`}
          >
            <MaterialCommunityIcons name="paw-off" size={40} color="#D1D5DB" />
            <CustomText style={tw`text-gray-400 mt-2 text-center`}>
              No pets currently marked as "Lost". Update a pet's status in the
              My Pets screen to start.
            </CustomText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row mb-6`}
          >
            {lostPets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                onPress={() => setSelectedPet(pet)}
                style={tw`mr-4 items-center`}
              >
                <View
                  style={tw`w-20 h-20 rounded-full border-2 ${
                    selectedPet?.id === pet.id
                      ? "border-orange-500"
                      : "border-transparent"
                  } p-1`}
                >
                  <Image
                    source={{
                      uri: pet.imageUrl || "https://via.placeholder.com/150",
                    }}
                    style={tw`w-full h-full rounded-full bg-gray-200`}
                  />
                </View>
                <CustomText
                  weight={selectedPet?.id === pet.id ? "Bold" : "Medium"}
                  style={tw`mt-2 text-xs`}
                >
                  {pet.name}
                </CustomText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleRunAnalysis}
          disabled={analyzing || !selectedPet}
          style={tw`bg-orange-500 p-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-orange-200 ${
            !selectedPet || analyzing ? "opacity-50" : ""
          }`}
        >
          {analyzing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="brain"
                size={22}
                color="white"
                style={tw`mr-2`}
              />
              <CustomText weight="Bold" style={tw`text-white`}>
                Analyze Behavior
              </CustomText>
            </>
          )}
        </TouchableOpacity>

        {/* Analysis Result Display */}
        {analysisResult && (
          <View
            style={tw`mt-8 bg-orange-50 p-6 rounded-3xl border border-orange-100`}
          >
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`flex-row items-center mb-4`}>
                <View style={tw`bg-orange-500 p-2 rounded-lg mr-3`}>
                  {" "}
                  {/* Changed to View */}
                  <FontAwesome5 name="map-marked-alt" size={16} color="white" />
                </View>
                <CustomText weight="Bold" style={tw`text-lg text-orange-900`}>
                  Search Insights
                </CustomText>
              </View>
              <CustomText weight="Bold" style={tw`text-lg text-orange-900`}>
                Search Insights
              </CustomText>
            </View>

            <View style={tw`mb-4`}>
              <CustomText weight="SemiBold" style={tw`text-orange-800 text-sm`}>
                Likely Search Radius
              </CustomText>
              <CustomText style={tw`text-orange-700 text-base`}>
                {analysisResult.radius}
              </CustomText>
            </View>

            <View style={tw`mb-4`}>
              <CustomText weight="SemiBold" style={tw`text-orange-800 text-sm`}>
                Predicted Strategy
              </CustomText>
              <CustomText style={tw`text-orange-700 leading-5`}>
                {analysisResult.strategy}
              </CustomText>
            </View>

            <View style={tw`bg-white p-4 rounded-2xl border border-orange-200`}>
              <CustomText
                weight="Bold"
                style={tw`text-orange-900 mb-1 text-sm text-center uppercase tracking-wider`}
              >
                High Probability Hiding Spots
              </CustomText>
              <CustomText style={tw`text-orange-700 text-center`}>
                {analysisResult.prioritySpots}
              </CustomText>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
