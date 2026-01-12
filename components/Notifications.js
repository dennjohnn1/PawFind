import { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "./CustomText";
import AuthService from "../service/AuthService";
import PetService from "../service/PetService";

export default function NotificationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadNotifications();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    
    try {
      const result = await AuthService.getUserProfile();
      if (result.success) {
        // Mock notifications - Replace with actual API call
        const mockNotifications = generateMockNotifications();
        setNotifications(mockNotifications);
        
        const unread = mockNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockNotifications = () => {
    const now = new Date();
    return [
      {
        id: "1",
        type: "pet_found",
        title: "Possible Match Found!",
        message: "Someone reported finding a pet matching your lost dog Max near your area.",
        timestamp: new Date(now - 1000 * 60 * 30), // 30 mins ago
        read: false,
        icon: "paw",
        iconColor: "#F59549",
        iconBg: "#FFF7ED",
        actionable: true,
        reportId: "report_123",
      },
      {
        id: "2",
        type: "report_update",
        title: "Report Updated",
        message: "Your lost pet report for Bella has been viewed 15 times today.",
        timestamp: new Date(now - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false,
        icon: "eye-outline",
        iconColor: "#3B82F6",
        iconBg: "#EFF6FF",
        actionable: true,
        reportId: "report_124",
      },
      {
        id: "3",
        type: "nearby_alert",
        title: "Lost Pet Near You",
        message: "A golden retriever was reported lost 0.5 km from your location.",
        timestamp: new Date(now - 1000 * 60 * 60 * 5), // 5 hours ago
        read: true,
        icon: "location",
        iconColor: "#EC4899",
        iconBg: "#FDF2F8",
        actionable: true,
        reportId: "report_125",
      },
      {
        id: "4",
        type: "reunion",
        title: "Pet Reunited! 🎉",
        message: "Great news! Max has been marked as reunited with their family.",
        timestamp: new Date(now - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        icon: "heart",
        iconColor: "#10B981",
        iconBg: "#F0FDF4",
        actionable: false,
      },
      {
        id: "5",
        type: "tip",
        title: "Safety Tip",
        message: "Remember to update your pet's microchip information regularly.",
        timestamp: new Date(now - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true,
        icon: "bulb",
        iconColor: "#F59E0B",
        iconBg: "#FFFBEB",
        actionable: false,
      },
      {
        id: "6",
        type: "message",
        title: "New Message",
        message: "John Doe sent you a message about your found pet report.",
        timestamp: new Date(now - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        read: true,
        icon: "chatbubble",
        iconColor: "#8B5CF6",
        iconBg: "#FAF5FF",
        actionable: true,
        messageId: "msg_123",
      },
      {
        id: "7",
        type: "system",
        title: "Profile Updated",
        message: "Your profile information has been successfully updated.",
        timestamp: new Date(now - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        read: true,
        icon: "checkmark-circle",
        iconColor: "#14B8A6",
        iconBg: "#F0FDFA",
        actionable: false,
      },
    ];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    const unread = notifications.filter(n => !n.read && n.id !== notificationId).length;
    setUnreadCount(unread);
    
    // Update on backend
    // await NotificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
    
    // Update on backend
    // await NotificationService.markAllAsRead();
  };

  const deleteNotification = async (notificationId) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setNotifications(prev =>
              prev.filter(n => n.id !== notificationId)
            );
            // await NotificationService.deleteNotification(notificationId);
          },
        },
      ]
    );
  };

  const clearAllNotifications = () => {
    Alert.alert(
      "Clear All Notifications",
      "This will delete all notifications. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setNotifications([]);
            setUnreadCount(0);
            // await NotificationService.clearAll();
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionable) {
      switch (notification.type) {
        case "pet_found":
        case "report_update":
        case "nearby_alert":
          navigation.navigate("ReportDetail", { reportId: notification.reportId });
          break;
        case "message":
          navigation.navigate("Messages", { messageId: notification.messageId });
          break;
        default:
          break;
      }
    }
  };

  const getFilteredNotifications = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    switch (selectedFilter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "today":
        return notifications.filter(n => new Date(n.timestamp) >= today);
      case "week":
        return notifications.filter(n => new Date(n.timestamp) >= weekAgo);
      default:
        return notifications;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const groupNotificationsByDate = (notifications) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notification => {
      const notifDate = new Date(notification.timestamp);
      
      if (notifDate >= today) {
        groups.today.push(notification);
      } else if (notifDate >= yesterday) {
        groups.yesterday.push(notification);
      } else if (notifDate >= weekAgo) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const NotificationItem = ({ notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(notification)}
      style={tw`flex-row px-4 py-4 border-b border-gray-50 ${
        !notification.read ? "bg-orange-50/30" : "bg-white"
      }`}
      activeOpacity={0.7}
    >
      <View
        style={[
          tw`w-12 h-12 rounded-xl items-center justify-center mr-4 mt-1`,
          { backgroundColor: notification.iconBg },
        ]}
      >
        <Ionicons
          name={notification.icon}
          size={22}
          color={notification.iconColor}
        />
      </View>

      <View style={tw`flex-1 mr-3`}>
        <View style={tw`flex-row items-center mb-1`}>
          <CustomText
            weight="SemiBold"
            style={tw`flex-1 text-gray-900 text-sm`}
            numberOfLines={1}
          >
            {notification.title}
          </CustomText>
          {!notification.read && (
            <View style={tw`w-2 h-2 rounded-full bg-orange-500 ml-2`} />
          )}
        </View>

        <CustomText
          style={tw`text-gray-600 text-xs mb-2 leading-5`}
          numberOfLines={2}
        >
          {notification.message}
        </CustomText>

        <View style={tw`flex-row items-center`}>
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <CustomText style={tw`text-gray-400 text-xs ml-1`}>
            {formatTimestamp(notification.timestamp)}
          </CustomText>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => deleteNotification(notification.id)}
        style={tw`p-2`}
      >
        <Ionicons name="close-circle-outline" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const FilterChip = ({ label, value, count }) => (
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
  );

  const EmptyState = () => (
    <View style={tw`flex-1 justify-center items-center px-8 py-20`}>
      <View style={tw`w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-4`}>
        <Ionicons name="notifications-off-outline" size={40} color="#D1D5DB" />
      </View>
      <CustomText weight="Bold" style={tw`text-gray-900 text-base mb-2 text-center`}>
        No notifications
      </CustomText>
      <CustomText style={tw`text-gray-500 text-sm text-center leading-5`}>
        {selectedFilter === "unread"
          ? "You're all caught up! No unread notifications."
          : "You don't have any notifications yet."}
      </CustomText>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#F59549" />
        <CustomText style={tw`text-gray-500 mt-4 text-sm`}>
          Loading notifications...
        </CustomText>
      </SafeAreaView>
    );
  }

  const filteredNotifications = getFilteredNotifications();
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={tw`px-5 py-4 border-b border-gray-100`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <CustomText weight="Bold" style={tw`text-lg text-gray-900`}>
                Notifications
              </CustomText>
              {unreadCount > 0 && (
                <CustomText style={tw`text-gray-500 text-xs`}>
                  {unreadCount} unread
                </CustomText>
              )}
            </View>
          </View>

          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              onPress={clearAllNotifications}
              style={tw`p-2`}
            >
              <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip 
            label="All" 
            value="all" 
            count={notifications.length} 
          />
          <FilterChip 
            label="Unread" 
            value="unread" 
            count={unreadCount} 
          />
          <FilterChip 
            label="Today" 
            value="today" 
            count={groupedNotifications.today.length} 
          />
          <FilterChip 
            label="This Week" 
            value="week" 
            count={groupedNotifications.thisWeek.length} 
          />
        </ScrollView>
      </View>

      <Animated.ScrollView
        style={[tw`flex-1`, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#F59549"]}
            tintColor="#F59549"
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Today */}
            {groupedNotifications.today.length > 0 && (
              <View>
                <View style={tw`px-5 py-3 bg-gray-50`}>
                  <CustomText weight="SemiBold" style={tw`text-gray-500 text-xs uppercase`}>
                    Today
                  </CustomText>
                </View>
                {groupedNotifications.today.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}

            {/* Yesterday */}
            {groupedNotifications.yesterday.length > 0 && (
              <View>
                <View style={tw`px-5 py-3 bg-gray-50`}>
                  <CustomText weight="SemiBold" style={tw`text-gray-500 text-xs uppercase`}>
                    Yesterday
                  </CustomText>
                </View>
                {groupedNotifications.yesterday.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}

            {/* This Week */}
            {groupedNotifications.thisWeek.length > 0 && (
              <View>
                <View style={tw`px-5 py-3 bg-gray-50`}>
                  <CustomText weight="SemiBold" style={tw`text-gray-500 text-xs uppercase`}>
                    This Week
                  </CustomText>
                </View>
                {groupedNotifications.thisWeek.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}

            {/* Older */}
            {groupedNotifications.older.length > 0 && (
              <View>
                <View style={tw`px-5 py-3 bg-gray-50`}>
                  <CustomText weight="SemiBold" style={tw`text-gray-500 text-xs uppercase`}>
                    Older
                  </CustomText>
                </View>
                {groupedNotifications.older.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Info Note */}
        {notifications.length > 0 && (
          <View style={tw`mx-5 mt-6 mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex-row`}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" style={tw`mr-3 mt-0.5`} />
            <View style={tw`flex-1`}>
              <CustomText weight="SemiBold" style={tw`text-blue-900 text-sm mb-1`}>
                Notification Preferences
              </CustomText>
              <CustomText style={tw`text-blue-800 text-xs leading-5`}>
                Manage your notification settings in the Settings menu to control what alerts you receive.
              </CustomText>
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}