import { useState, useEffect } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import tw from "twrnc"
import { Ionicons, Feather } from "@expo/vector-icons"
import CustomText from "./CustomText"
import PetService from "../service/PetService"
import { getAuth } from "firebase/auth"

export default function MyReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reports, setReports] = useState([])
  const [selectedFilter, setSelectedFilter] = useState("all")

  const auth = getAuth()

  useEffect(() => {
    loadMyReports()
  }, [])

  const loadMyReports = async () => {
    try {
      setLoading(true)
      const allReports = await PetService.getAllReports()
      const currentUser = auth.currentUser

      if (currentUser) {
        const myReports = allReports.filter(
          report => report.reporterId === currentUser.uid
        )
        
        myReports.sort((a, b) => {
          const dateA = new Date(a.createdAt?.seconds * 1000 || a.date || 0)
          const dateB = new Date(b.createdAt?.seconds * 1000 || b.date || 0)
          return dateB - dateA
        })
        
        setReports(myReports)
      }
    } catch (error) {
      console.error("Error loading reports:", error)
      Alert.alert("Error", "Failed to load your reports")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getFilteredReports = () => {
    if (selectedFilter === "all") return reports
    if (selectedFilter === "active") return reports.filter(r => r.status !== "resolved")
    if (selectedFilter === "resolved") return reports.filter(r => r.status === "resolved")
    return reports.filter(r => r.reportType?.toLowerCase() === selectedFilter)
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadMyReports()
  }

  const handleDeleteReport = (report) => {
    Alert.alert(
      "Delete Report",
      `Delete report for ${report.petName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await PetService.deleteReport(report.id)
              Alert.alert("Success", "Report deleted successfully")
              loadMyReports()
            } catch (error) {
              Alert.alert("Error", "Failed to delete report")
            }
          }
        }
      ]
    )
  }

  const handleMarkAsResolved = async (report) => {
    Alert.alert(
      "Mark as Resolved",
      `Has ${report.petName} been reunited?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Resolved",
          onPress: async () => {
            try {
              await PetService.updateReport(report.id, { status: "resolved" })
              Alert.alert("Success", "Great news! Report marked as resolved.")
              loadMyReports()
            } catch (error) {
              Alert.alert("Error", "Failed to update report")
            }
          }
        }
      ]
    )
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date"
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const showActionsMenu = (report) => {
    Alert.alert(
      report.petName || "Report Actions",
      "What would you like to do?",
      [
        {
          text: "View Details",
          onPress: () => navigation.navigate("ReportDetail", { reportId: report.id })
        },
        report.status !== "resolved" && {
          text: "Mark as Resolved",
          onPress: () => handleMarkAsResolved(report)
        },
        {
          text: "Delete Report",
          style: "destructive",
          onPress: () => handleDeleteReport(report)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ].filter(Boolean)
    )
  }

  const ReportItem = ({ report }) => {
    const isResolved = report.status === "resolved"
    const isLost = report.reportType === "lost"

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("ReportDetail", { reportId: report.id })}
        style={tw`flex-row items-center px-4 py-4 border-b border-gray-100`}
        activeOpacity={0.7}
      >
        {/* Pet Image */}
        <View style={tw`relative mr-4`}>
          <Image
            source={{
              uri: report.petImage || (report.photos && report.photos[0]) || 
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800",
            }}
            style={tw`w-16 h-16 rounded-xl`}
            resizeMode="cover"
          />
          {/* Status Badge */}
          <View
            style={tw`absolute -top-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2 border-white ${
              isResolved ? "bg-green-500" : isLost ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            <Ionicons
              name={isResolved ? "checkmark" : isLost ? "alert-circle" : "hand-left"}
              size={12}
              color="white"
            />
          </View>
        </View>

        {/* Report Info */}
        <View style={tw`flex-1 mr-3`}>
          <View style={tw`flex-row items-center mb-1`}>
            <CustomText weight="SemiBold" style={tw`text-gray-900 flex-1`} numberOfLines={1}>
              {report.petName || "Unknown Pet"}
            </CustomText>
            <View
              style={tw`px-2 py-0.5 rounded ml-2 ${
                isResolved ? "bg-green-50" : isLost ? "bg-red-50" : "bg-blue-50"
              }`}
            >
              <CustomText
                style={tw`text-xs ${
                  isResolved ? "text-green-700" : isLost ? "text-red-700" : "text-blue-700"
                }`}
              >
                {isResolved ? "Resolved" : isLost ? "Lost" : "Found"}
              </CustomText>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-1`}>
            <Feather name="map-pin" size={11} color="#9CA3AF" />
            <CustomText style={tw`text-gray-500 text-xs ml-1.5 flex-1`} numberOfLines={1}>
              {typeof report.location === "string"
                ? report.location
                : report.location?.address || "Location not specified"}
            </CustomText>
          </View>

          <View style={tw`flex-row items-center`}>
            <Feather name="calendar" size={11} color="#9CA3AF" />
            <CustomText style={tw`text-gray-400 text-xs ml-1.5`}>
              {formatDate(report.createdAt?.seconds * 1000 || report.date)}
            </CustomText>
          </View>
        </View>

        {/* Actions Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation()
            showActionsMenu(report)
          }}
          style={tw`p-2`}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  const FilterTab = ({ label, value, count }) => (
    <TouchableOpacity
      onPress={() => setSelectedFilter(value)}
      style={tw`px-4 py-2 rounded-xl mr-2 ${
        selectedFilter === value ? "bg-orange-500" : "bg-gray-100"
      }`}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center`}>
        <CustomText
          weight="SemiBold"
          style={tw`text-sm ${
            selectedFilter === value ? "text-white" : "text-gray-700"
          }`}
        >
          {label}
        </CustomText>
        {count > 0 && (
          <View
            style={tw`ml-2 px-1.5 py-0.5 rounded-full min-w-[18px] items-center justify-center ${
              selectedFilter === value ? "bg-white/20" : "bg-gray-200"
            }`}
          >
            <CustomText
              style={tw`text-xs ${
                selectedFilter === value ? "text-white" : "text-gray-600"
              }`}
            >
              {count}
            </CustomText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const EmptyState = () => (
    <View style={tw`flex-1 justify-center items-center px-8 py-20`}>
      <View style={tw`w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4`}>
        <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
      </View>
      <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-2 text-center`}>
        No reports found
      </CustomText>
      <CustomText style={tw`text-gray-500 text-sm text-center leading-5`}>
        Try using other filter tabs or{'\n'}Report a lost or found pet to get started.
      </CustomText>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
        <CustomText style={tw`text-gray-500 mt-4 text-sm`}>
          Loading your reports...
        </CustomText>
      </SafeAreaView>
    )
  }

  const filteredReports = getFilteredReports()
  const lostCount = reports.filter((r) => r.reportType === "lost").length
  const foundCount = reports.filter((r) => r.reportType === "found").length
  const activeCount = reports.filter((r) => r.status !== "resolved").length
  const resolvedCount = reports.filter((r) => r.status === "resolved").length

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={tw`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
          My Reports
        </CustomText>

        <View style={tw`w-10`} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-6`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#F59549"]}
            tintColor="##F59549"
          />
        }
      >

        {/* Filter Section */}
        <View style={tw`px-5 py-4 border-b border-gray-100`}>
          <CustomText weight="SemiBold" style={tw`text-gray-900 mb-3`}>
            Filter Reports
          </CustomText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterTab label="All" value="all" count={reports.length} />
            <FilterTab label="Active" value="active" count={activeCount} />
            <FilterTab label="Lost" value="lost" count={lostCount} />
            <FilterTab label="Found" value="found" count={foundCount} />
            <FilterTab label="Resolved" value="resolved" count={resolvedCount} />
          </ScrollView>
        </View>

        {/* Reports List */}
        <View style={tw`border-b border-gray-100`}>
          <View style={tw`flex-row items-center px-5 py-4`}>
            <View style={tw`w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3`}>
              <Ionicons name="list-outline" size={18} color="#3B82F6" />
            </View>
            <CustomText weight="SemiBold" style={tw`text-gray-900`}>
              {selectedFilter === "all" ? "All" : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Reports
            </CustomText>
            <View style={tw`ml-auto bg-gray-100 px-2 py-1 rounded`}>
              <CustomText style={tw`text-gray-600 text-xs`}>
                {filteredReports.length}
              </CustomText>
            </View>
          </View>

          <View style={tw`bg-white`}>
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <ReportItem key={report.id} report={report} />
              ))
            ) : (
              <EmptyState />
            )}
          </View>
        </View>

        {/* Info Note */}
        <View style={tw`mx-5 mt-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex-row`}>
          <Ionicons name="information-circle" size={20} color="#F59549" style={tw`mr-3 mt-0.5`} />
          <View style={tw`flex-1`}>
            <CustomText weight="SemiBold" style={tw`text-orange-900 text-sm mb-1`}>
              Managing Your Reports
            </CustomText>
            <CustomText style={tw`text-orange-800 text-xs leading-5`}>
              Mark reports as resolved when pets are reunited. Resolved reports help track successful reunions and inspire hope in the community.
            </CustomText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}