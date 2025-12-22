import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../config/constants";
import { defaultStackScreenOptions } from "../config/navigationStyles";

// Import hooks for real-time badge counts
import { useUnreadMessagesCount } from "../hooks/useChat";
import { useNotifications } from "../hooks/useNotifications";
import { useNotificationContext } from "../contexts/NotificationContext";

// Import screens
import HomeScreen from "../screens/Main/HomeScreen";
import ProfileScreen from "../screens/Main/ProfileScreen";
import EditProfileScreen from "../screens/Main/EditProfileScreen";
import NotificationScreen from "../screens/Notifications/NotificationScreen";
import ChatListScreen from "../screens/Chat/ChatListScreen";
import ChatRoomScreen from "../screens/Chat/ChatRoomScreen";
import ServiceRequestScreen from "../screens/Services/ServiceRequestScreen";
import ServiceQuoteScreen from "../screens/Services/ServiceQuoteScreen";
import VocalistSelectionScreen from "../screens/Services/VocalistSelectionScreen";
import VocalistDetailScreen from "../screens/Services/VocalistDetailScreen";
import RecordingFlowController from "../screens/Booking/RecordingFlowController";
// import AITranscriptionScreen from "../screens/AI/AITranscriptionScreen";
// import AIProcessingScreen from "../screens/AI/AIProcessingScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack (includes service request flow)
const HomeStack = ({ navigation }) => {
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: "MuTraPro",
          headerLeft: () => (
            <Ionicons
              name="menu"
              size={28}
              color={COLORS.text}
              style={{ marginLeft: 15 }}
              onPress={() => navigation.openDrawer()}
            />
          ),
        }}
      />
      <Stack.Screen
        name="ServiceRequest"
        component={ServiceRequestScreen}
        options={{ title: "Service Request" }}
      />
      <Stack.Screen
        name="VocalistSelection"
        component={VocalistSelectionScreen}
        options={{ title: "Choose preferred singer" }}
      />
      <Stack.Screen
        name="VocalistDetail"
        component={VocalistDetailScreen}
        options={{ title: "Singer details" }}
      />
      <Stack.Screen
        name="ServiceQuote"
        component={ServiceQuoteScreen}
        options={{ title: "Review Quote" }}
      />
    </Stack.Navigator>
  );
};


// Notifications Stack
const NotificationsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions}
    >
      <Stack.Screen
        name="NotificationsMain"
        component={NotificationScreen}
        options={{ title: "Notifications" }}
      />
    </Stack.Navigator>
  );
};

// Chat Stack
const ChatStack = () => {
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "Messages" }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
};

// AI Transcription Stack
// const AIStack = () => {
//   return (
//     <Stack.Navigator
//       screenOptions={defaultStackScreenOptions}
//     >
//       <Stack.Screen
//         name="AITranscription"
//         component={AITranscriptionScreen}
//         options={{ title: "AI Transcription" }}
//       />
//       <Stack.Screen
//         name="AIProcessing"
//         component={AIProcessingScreen}
//         options={{ title: "Processing" }}
//       />
//     </Stack.Navigator>
//   );
// };

// Booking Stack
const BookingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions}
    >
      <Stack.Screen
        name="BookingMain"
        component={RecordingFlowController}
        options={{ title: "Studio Booking" }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
    </Stack.Navigator>
  );
};

// Custom Tab Bar Badge Component
const TabBarBadge = ({ count }) => {
  if (!count || count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
};

const BottomTabNavigator = ({ navigation }) => {
  // Real-time unread counts from hooks
  const unreadMessages = useUnreadMessagesCount();
  
  // Get banner ref from context
  const { bannerRef } = useNotificationContext();
  
  // Get notification state - similar to frontend
  const { unreadCount: unreadNotifications } = useNotifications(bannerRef);
  
  console.log('[BottomTab] Rendering with unread count:', unreadNotifications);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: 20,
          height: 80,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.xs,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            // case "AI":
            //   iconName = focused ? "sparkles" : "sparkles-outline";
            //   break;
            case "Booking":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "Chat":
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              break;
            case "Notifications":
              iconName = focused ? "notifications" : "notifications-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "help-outline";
          }

          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === "Notifications" && (
                <TabBarBadge count={unreadNotifications} />
              )}
              {route.name === "Chat" && (
                <TabBarBadge count={unreadMessages} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        children={(props) => <HomeStack {...props} navigation={navigation} />}
        options={{
          tabBarLabel: "Home",
        }}
      />
      {/* <Tab.Screen
        name="AI"
        component={AIStack}
        options={{
          tabBarLabel: "AI",
        }}
      /> */}
      <Tab.Screen
        name="Booking"
        component={BookingStack}
        options={{
          tabBarLabel: "Booking",
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarLabel: "Messages",
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStack}
        options={{
          tabBarLabel: "Notifications",
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default BottomTabNavigator;

