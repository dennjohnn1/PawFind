import { useState } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import tw from "twrnc";
import CustomText from "./CustomText";

export default function PotentialMatchesModal({
  visible,
  matches,
  loading,
  onClose,
  onViewMatch,
  onDismissMatch,
}) {
  const [dismissedMatches, setDismissedMatches] = useState([]);

  const handleDismiss = (matchId) => {
    setDismissedMatches([...dismissedMatches, matchId]);
    if (onDismissMatch) {
      onDismissMatch(matchId);
    }
  };

  const getMatchLevelColor = (level) => {
    switch (level) {
      case "high":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-700",
          badge: "bg-green-100",
        };
      case "medium":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-700",
          badge: "bg-orange-100",
        };
      case "low":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-700",
          badge: "bg-yellow-100",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-700",
          badge: "bg-gray-100",
        };
    }
  };

  const getMatchLevelText = (level) => {
    switch (level) {
      case "high":
        return "High Match";
      case "medium":
        return "Medium Match";
      case "low":
        return "Possible Match";
      default:
        return "Low Match";
    }
  };

  const renderMatchDetails = (matchDetails) => {
    const details = [];

    if (matchDetails.species) {
      details.push({ icon: "paw-outline", text: "Same species", color: "#10B981" });
    }
    if (matchDetails.breed) {
      details.push({
        icon: "bookmark",
        text:
          matchDetails.breed === "partial" ? "Similar breed" : "Same breed",
        color: "#10B981",
      });
    }
    if (matchDetails.color) {
      details.push({
        icon: "droplet",
        text:
          matchDetails.color === "partial" ? "Similar color" : "Same color",
        color: "#10B981",
      });
    }
    if (matchDetails.sex) {
      details.push({ icon: "male-female-outline", text: "Same sex", color: "#10B981" });
    }
    if (matchDetails.location) {
      const distanceText =
        matchDetails.distance !== undefined
          ? ` (${matchDetails.distance.toFixed(1)} km away)`
          : "";
      details.push({
        icon: "location-outline",
        text: `Nearby location${distanceText}`,
        color: "#F59549",
      });
    }
    if (matchDetails.timeframe) {
      details.push({
        icon: "alarm-outline",
        text: `Within ${matchDetails.daysDifference} days`,
        color: "#6366F1",
      });
    }

    return details;
  };

  const visibleMatches = matches.filter(
    (match) => !dismissedMatches.includes(match.id)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`px-6 py-4 border-b border-gray-100`}>
          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-1`}>
              <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
                Potential Matches
              </CustomText>
              <CustomText style={tw`text-gray-500 text-sm mt-1`}>
                {visibleMatches.length}{" "}
                {visibleMatches.length === 1 ? "match" : "matches"} found
              </CustomText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color="#F59549" />
            <CustomText style={tw`text-gray-500 mt-4`}>
              Searching for matches...
            </CustomText>
          </View>
        ) : visibleMatches.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center px-6`}>
            <View
              style={tw`w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4`}
            >
              <Ionicons name="search" size={32} color="#9CA3AF" />
            </View>
            <CustomText weight="Bold" style={tw`text-gray-900 text-lg mb-2`}>
              No Matches Yet
            </CustomText>
            <CustomText style={tw`text-gray-500 text-center`}>
              We'll notify you when potential matches are found. Keep checking
              back!
            </CustomText>
          </View>
        ) : (
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`px-6 py-4`}
            showsVerticalScrollIndicator={false}
          >
            {/* Info Banner */}
            <View
              style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 flex-row`}
            >
              <View
                style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}
              >
                <Ionicons name="information" size={20} color="#3B82F6" />
              </View>
              <View style={tw`flex-1`}>
                <CustomText
                  weight="SemiBold"
                  style={tw`text-blue-900 text-sm mb-1`}
                >
                  Review Carefully
                </CustomText>
                <CustomText style={tw`text-blue-700 text-xs`}>
                  These are potential matches based on pet details. Contact the
                  reporter to verify.
                </CustomText>
              </View>
            </View>

            {/* Match Cards */}
            {visibleMatches.map((match, index) => {
              const colors = getMatchLevelColor(match.matchLevel);
              const matchDetails = renderMatchDetails(match.matchDetails);

              return (
                <View
                  key={match.id}
                  style={tw`bg-white border ${colors.border} rounded-2xl p-4 mb-4 shadow-sm`}
                >
                  {/* Match Score Badge */}
                  <View style={tw`flex-row justify-between items-start mb-3`}>
                    <View
                      style={tw`${colors.badge} px-3 py-1.5 rounded-full flex-row items-center`}
                    >
                      <View
                        style={tw`w-2 h-2 rounded-full ${colors.text.replace(
                          "text",
                          "bg"
                        )} mr-1.5`}
                      />
                      <CustomText
                        weight="SemiBold"
                        style={tw`${colors.text} text-xs`}
                      >
                        {getMatchLevelText(match.matchLevel)} (
                        {match.matchScore}%)
                      </CustomText>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDismiss(match.id)}
                      style={tw`p-1`}
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  {/* Pet Image and Info */}
                  <View style={tw`flex-row mb-3`}>
                    {match.photos && match.photos.length > 0 ? (
                      <Image
                        source={{ uri: match.photos[0] }}
                        style={tw`w-24 h-24 rounded-xl`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={tw`w-24 h-24 rounded-xl bg-gray-100 items-center justify-center`}
                      >
                        <Ionicons name="paw-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}

                    <View style={tw`flex-1 ml-3`}>
                      <CustomText
                        weight="Bold"
                        style={tw`text-gray-900 text-base mb-1`}
                      >
                        {match.petName || "Unknown Name"}
                      </CustomText>

                      <View style={tw`flex-row flex-wrap`}>
                        {match.species && (
                          <View
                            style={tw`bg-gray-100 px-2 py-1 rounded-lg mr-1 mb-1`}
                          >
                            <CustomText style={tw`text-gray-700 text-xs`}>
                              {match.species}
                            </CustomText>
                          </View>
                        )}
                        {match.breed && (
                          <View
                            style={tw`bg-gray-100 px-2 py-1 rounded-lg mr-1 mb-1`}
                          >
                            <CustomText style={tw`text-gray-700 text-xs`}>
                              {match.breed}
                            </CustomText>
                          </View>
                        )}
                      </View>

                      {match.location && (
                        <View style={tw`flex-row items-center mt-1`}>
                          <Feather
                            name="map-pin"
                            size={10}
                            color="#9CA3AF"
                            style={tw`mr-1`}
                          />
                          <CustomText
                            style={tw`text-gray-500 text-xs flex-1`}
                            numberOfLines={1}
                          >
                            {match.location}
                          </CustomText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Match Details */}
                  <View style={tw`${colors.bg} rounded-xl p-3 mb-3`}>
                    <CustomText
                      weight="SemiBold"
                      style={tw`text-gray-900 text-xs mb-2`}
                    >
                      Why this might be a match:
                    </CustomText>
                    {matchDetails.map((detail, idx) => (
                      <View
                        key={idx}
                        style={tw`flex-row items-center mb-1.5`}
                      >
                        <Ionicons
                          name={detail.icon}
                          size={12}
                          color={detail.color}
                          style={tw`mr-2`}
                        />
                        <CustomText style={tw`text-gray-700 text-xs flex-1`}>
                          {detail.text}
                        </CustomText>
                      </View>
                    ))}
                  </View>

                  {/* Action Buttons */}
                  <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity
                      style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}
                      onPress={() => handleDismiss(match.id)}
                    >
                      <CustomText
                        weight="SemiBold"
                        style={tw`text-gray-700 text-sm`}
                      >
                        Not a Match
                      </CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`flex-1 bg-orange-500 py-3 rounded-xl items-center`}
                      onPress={() => onViewMatch(match)}
                    >
                      <CustomText
                        weight="SemiBold"
                        style={tw`text-white text-sm`}
                      >
                        View Details
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={tw`h-6`} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}