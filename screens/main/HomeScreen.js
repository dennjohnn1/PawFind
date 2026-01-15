"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { Feather, Ionicons } from "@expo/vector-icons";
import Toast from "../../components/Toast";
import CustomText from "../../components/CustomText";
import PetService from "../../service/PetService";
import AuthService from "../../service/AuthService";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseApp } from "../../firebase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate status bar height
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

export default function HomeScreen({ route }) {
  const navigation = useNavigation();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [filteredPets, setFilteredPets] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Pet Parent");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Initialize Firestore
  const db = getFirestore(firebaseApp);

  // Enhanced filters with counts
  const filters = [
    { id: "all", label: "All", icon: "grid" },
    { id: "lost", label: "Lost", icon: "search", color: "#EF4444" },
    { id: "found", label: "Found", icon: "check-circle", color: "#10B981" },
    { id: "recent", label: "Recent", icon: "clock", color: "#3B82F6" },
  ];

  // Heights for different sections
  const WELCOME_HEIGHT = 70;
  const SEARCH_FILTERS_HEIGHT = 110;
  const TOTAL_HEADER_HEIGHT = WELCOME_HEIGHT + SEARCH_FILTERS_HEIGHT + STATUSBAR_HEIGHT;

  // Skeleton loading data - matches ReportCard structure
  const skeletonData = Array.from({ length: 6 }, (_, index) => ({
    id: `skeleton-${index}`,
    isSkeleton: true,
  }));

  useEffect(() => {
    fetchLiveReports();
    fetchUserProfile();
    checkUnreadMessages();
  }, []);

  const fetchLiveReports = async () => {
    try {
      setLoading(true);
      const reports = await PetService.getAllReports();
      
      // Fetch user data for each report dynamically
      const reportsWithUserData = await Promise.all(
        reports.map(async (report) => {
          try {
            if (report.reporterId) {
              const userDoc = await getDoc(doc(db, "users", report.reporterId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  ...report,
                  userName: userData.fullName,
                  userAvatar: userData.profileImage,
                };
              }
            }
            return {
              ...report,
              userName: report.reporterName,
              userAvatar: null,
            };
          } catch (error) {
            console.error("Error fetching user data:", error);
            return report;
          }
        })
      );
      
      // Sort by recency and urgency
      const sortedReports = reportsWithUserData.sort((a, b) => {
        const aDate = new Date(a.createdAt?.seconds * 1000 || a.date || Date.now());
        const bDate = new Date(b.createdAt?.seconds * 1000 || b.date || Date.now());
        if (a.reportType === "lost" && b.reportType !== "lost") return -1;
        if (a.reportType !== "lost" && b.reportType === "lost") return 1;
        return bDate - aDate;
      });
      
      setAllReports(sortedReports);
      setFilteredPets(sortedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      showToast("Failed to load community reports", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to extract address from location data
  const getLocationAddress = (locationData) => {
    if (!locationData) return "Location not specified";
    
    // If location is a string (old format), return it
    if (typeof locationData === 'string') {
      return locationData;
    }
    
    // If location is an object with address property
    if (typeof locationData === 'object' && locationData.address) {
      return locationData.address;
    }
    
    // If location is an object with coordinates only
    if (typeof locationData === 'object' && locationData.coordinates) {
      const { latitude, longitude } = locationData.coordinates;
      return `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
    }
    
    return "Location not specified";
  };

  const fetchUserProfile = async () => {
    try {
      const response = await AuthService.getUserProfile();
      if (response.success && response.data) {
        const name = response.data.fullName || response.data.firstName || "Pet Parent";
        setUserName(name.split(" ")[0]);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const checkUnreadMessages = async () => {
    const unreadCount = 3;
    setUnreadMessages(unreadCount);
  };

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastVisible(true);
  };

  useEffect(() => {
    if (route.params?.toastMessage) {
      showToast(route.params.toastMessage);
    }
  }, [route.params]);

  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredPets(allReports);
    } else if (selectedFilter === "recent") {
      const recentReports = allReports.filter(report => {
        const reportDate = new Date(report.createdAt?.seconds * 1000 || report.date || Date.now());
        const daysAgo = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      });
      setFilteredPets(recentReports);
    } else {
      setFilteredPets(
        allReports.filter(
          (pet) => pet.reportType?.toLowerCase() === selectedFilter.toLowerCase()
        )
      );
    }
  }, [selectedFilter, allReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLiveReports();
    checkUnreadMessages();
  };

  // Skeleton shimmer animation
  const SkeletonShimmer = ({ style }) => {
    const shimmerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
    
    useEffect(() => {
      const loopAnim = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: SCREEN_WIDTH,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      loopAnim.start();
      return () => loopAnim.stop();
    }, []);

    const shimmerTranslateX = shimmerAnim.interpolate({
      inputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
      outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
      <View style={[style, tw`overflow-hidden bg-gray-100 relative`]}>
        <Animated.View
          style={[
            tw`absolute top-0 left-0 bottom-0 w-[100px]`,
            {
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        />
      </View>
    );
  };

  // Skeleton Report Card - matches exact ReportCard layout
  const SkeletonReportCard = () => (
    <View style={tw`bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden`}>

      {/* Image skeleton */}
      <SkeletonShimmer style={tw`w-full h-52`} />

      <View style={tw`p-4`}>
        {/* User info skeleton */}
        <View style={tw`flex-row items-center mb-3`}>
          <SkeletonShimmer style={tw`w-8 h-8 rounded-full`} />
          <View style={tw`ml-3 flex-1`}>
            <SkeletonShimmer style={tw`h-4 w-20 mb-2`} />
            <SkeletonShimmer style={tw`h-3 w-16`} />
          </View>
        </View>

        {/* Content skeleton */}
        <View style={tw`mb-3`}>
          <SkeletonShimmer style={tw`h-6 w-3/4 mb-2`} />
          <SkeletonShimmer style={tw`h-3 w-5/6 mb-2`} />
          <SkeletonShimmer style={tw`h-3 w-full`} />
        </View>

        {/* Tags skeleton */}
        <View style={tw`flex-row flex-wrap mb-3`}>
          <SkeletonShimmer style={tw`w-16 h-6 rounded-full mr-2 mb-1`} />
          <SkeletonShimmer style={tw`w-20 h-6 rounded-full mr-2 mb-1`} />
          <SkeletonShimmer style={tw`w-14 h-6 rounded-full mr-2 mb-1`} />
        </View>

        {/* Action buttons skeleton */}
        <View style={tw`flex-row justify-between pt-3 border-t border-gray-100`}>
          <SkeletonShimmer style={tw`w-24 h-10 rounded-lg`} />
          <SkeletonShimmer style={tw`w-24 h-10 rounded-lg`} />
        </View>
      </View>
    </View>
  );

  const FilterButton = ({ filter }) => {
    const getCount = () => {
      if (filter.id === "all") return allReports.length;
      if (filter.id === "recent") {
        return allReports.filter(r => {
          const date = new Date(r.createdAt?.seconds * 1000 || r.date || Date.now());
          const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7;
        }).length;
      }
      return allReports.filter(r => r.reportType === filter.id).length;
    };

    const count = getCount();

    return (
      <TouchableOpacity
        style={[
          tw`px-4 py-2.5 rounded-xl mr-2 flex-row items-center`,
          selectedFilter === filter.id
            ? tw`bg-gray-900`
            : tw`bg-gray-100`,
        ]}
        onPress={() => setSelectedFilter(filter.id)}
        activeOpacity={0.7}
      >
        <Feather
          name={filter.icon}
          size={14}
          color={selectedFilter === filter.id ? "#FFFFFF" : filter.color || "#6B7280"}
          style={tw`mr-2`}
        />
        <CustomText
          weight="Medium"
          style={[
            tw`text-[13px]`,
            selectedFilter === filter.id ? tw`text-white` : tw`text-gray-700`,
          ]}
        >
          {filter.label}
        </CustomText>
        {count > 0 && (
          <View style={[
            tw`ml-2 px-1.5 py-0.5 rounded-full min-w-[18px] items-center justify-center`,
            selectedFilter === filter.id ? tw`bg-gray-700` : tw`bg-gray-200`
          ]}>
            <CustomText style={[
              tw`text-[10px]`,
              selectedFilter === filter.id ? tw`text-white` : tw`text-gray-600`
            ]}>
              {count > 99 ? "99+" : count}
            </CustomText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ReportCard = ({ item }) => {
    const isNew = () => {
      const reportDate = new Date(item.createdAt?.seconds * 1000 || item.date || Date.now());
      const hoursAgo = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 24;
    };

    // Skip rendering if it's a skeleton item
    if (item.isSkeleton) return <SkeletonReportCard />;

    // Get location address using helper function
    const locationAddress = getLocationAddress(item.location);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={tw`bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden`}
        onPress={() => navigation.navigate("ReportDetail", { reportId: item.id })}
      >
        <View style={[
          tw`absolute top-4 left-4 z-10 px-3 py-1 rounded-xl`,
          item.reportType === "found" ? tw`bg-white` : tw`bg-white`
        ]}>
          <View style={tw`flex-row items-center`}>
            <View style={[
              tw`w-2 h-2 rounded-full mr-1.5`,
              item.reportType === "found" ? tw`bg-green-500` : tw`bg-red-500`
            ]} />
            <CustomText
              weight="SemiBold"
              style={[
                tw`text-[11px] uppercase`,
                item.reportType === "found" ? tw`text-green-700` : tw`text-red-700`
              ]}
            >
              {item.reportType}
            </CustomText>
          </View>
        </View>

        <Image
          source={{ uri: item.petImage || (item.photos && item.photos[0]) || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800" }}
          style={tw`w-full h-52`}
          resizeMode="cover"
        />

        <View style={tw`p-4`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Image
              source={{ uri: item.userAvatar || "https://i.pravatar.cc/150" }}
              style={tw`w-8 h-8 rounded-full`}
            />
            <View style={tw`ml-3 flex-1`}>
              <CustomText weight="SemiBold" style={tw`text-sm text-gray-900`}>
                {item.userName || item.reporterName || "Anonymous"}
              </CustomText>
              <View style={tw`flex-row items-center`}>
                <Feather name="clock" size={10} color="#9CA3AF" />
                <CustomText style={tw`text-[10px] text-gray-500 ml-1`}>
                  {formatTimeAgo(item.createdAt?.seconds * 1000 || item.date)}
                </CustomText>
              </View>
            </View>
          </View>

          <View style={tw`mb-3`}>
            <CustomText weight="Bold" style={tw`text-lg text-gray-900 mb-1`}>
              {item.petName || "Unknown Pet"}
            </CustomText>
            <View style={tw`flex-row items-center mb-2`}>
              <Feather name="map-pin" size={12} color="#6B7280" />
              <CustomText style={tw`text-[12px] text-gray-600 ml-1 flex-1`} numberOfLines={1}>
                {locationAddress}
              </CustomText>
            </View>
            {item.description && (
              <CustomText style={tw`text-gray-500 text-sm`} numberOfLines={2}>
                {item.description}
              </CustomText>
            )}
          </View>

          <View style={tw`flex-row flex-wrap mb-3`}>
            {item.species && (
              <View style={tw`bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1`}>
                <CustomText style={tw`text-[11px] text-gray-700`}>
                  {item.species}
                </CustomText>
              </View>
            )}
            {item.breed && (
              <View style={tw`bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1`}>
                <CustomText style={tw`text-[11px] text-gray-700`}>
                  {item.breed}
                </CustomText>
              </View>
            )}
            {item.color && (
              <View style={tw`bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1`}>
                <CustomText style={tw`text-[11px] text-gray-700`}>
                  {item.color}
                </CustomText>
              </View>
            )}
          </View>

          <View style={tw`flex-row justify-between pt-3 border-t border-gray-100`}>
            <TouchableOpacity
              style={tw`flex-row items-center`}
              onPress={() => navigation.navigate("Messages", { userId: item.reporterId, reportId: item.id })}
            >
              <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2`}>
                <Feather name="message-circle" size={16} color="#374151" />
              </View>
              <CustomText style={tw`text-[12px] text-gray-700`}>
                Message
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-row items-center`}
              onPress={() => {
                // Pass coordinates to MapView if available
                const locationData = item.location;
                const coordinates = typeof locationData === 'object' ? locationData.coordinates : null;
                
                navigation.navigate("MapView", { 
                  location: locationAddress,
                  coordinates: coordinates
                });
              }}
            >
              <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2`}>
                <Feather name="map-pin" size={16} color="#374151" />
              </View>
              <CustomText style={tw`text-[12px] text-gray-700`}>
                View Map
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Fixed Header */}
      <View style={tw`bg-white border-b border-gray-200`}>
        {/* Welcome Section */}
        <View style={tw`px-5 pt-3 pb-3`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <CustomText style={tw`text-gray-500 text-[12px]`}>
                Welcome to PawFind,
              </CustomText>
              <CustomText weight="Bold" style={tw`text-xl text-gray-900`}>
                Hello, {userName}!
              </CustomText>
            </View>

            <View style={tw`flex-row items-center`}>
              <TouchableOpacity
                style={tw`relative mr-3`}
                onPress={() => navigation.navigate("Messages")}
              >
                <View style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}>
                  <Feather name="message-square" size={20} color="#374151" />
                </View>
                {unreadMessages > 0 && (
                  <View style={tw`absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white`}>
                    <CustomText style={tw`text-white text-[10px]`}>
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </CustomText>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("Notifications")}
              >
                <View style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}>
                  <Ionicons name="notifications-outline" size={20} color="#374151" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Filter Tabs Only */}
        <View style={tw`px-5 pb-3`}>
          <FlatList
            horizontal
            data={filters}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FilterButton filter={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`pr-5`}
          />
        </View>
      </View>

      {/* Reports Feed */}
      <FlatList
        data={loading ? skeletonData : filteredPets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReportCard item={item} />}
        contentContainerStyle={tw`pb-6 px-5`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#F59549"]}
            tintColor="#F59549"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={tw`items-center justify-center py-20`}>
              <Ionicons name="paw-outline" size={60} color="#D1D5DB" />
              <CustomText weight="SemiBold" style={tw`text-gray-400 text-sm mt-4`}>
                No reports found
              </CustomText>
              <CustomText style={tw`text-gray-400 text-xs text-center mt-2 px-10`}>
                {selectedFilter === "all" 
                  ? "Be the first to help reunite pets with their families"
                  : `No ${selectedFilter} pets reported yet`
                }
              </CustomText>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={tw`py-4`}>
            {loading ? (
              <View style={tw`mb-4`}>
                <SkeletonShimmer style={tw`h-6 w-48 mb-2`} />
                <SkeletonShimmer style={tw`h-4 w-32`} />
              </View>
            ) : filteredPets.length > 0 ? (
              <View>
                <CustomText weight="Bold" style={tw`text-base text-gray-900`}>
                  Community Reports
                </CustomText>
                <CustomText style={tw`text-gray-500 text-[12px]`}>
                  {filteredPets.length} {filteredPets.length === 1 ? "report" : "reports"} found
                </CustomText>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={tw`h-4`} />}
      />

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}