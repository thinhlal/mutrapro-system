import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES, COLORS } from '../config/constants';
import { CustomDrawerContent } from '../components';

// Import screens
import HomeScreen from '../screens/Main/HomeScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import EditProfileScreen from '../screens/Main/EditProfileScreen';
import ServiceRequestScreen from '../screens/Services/ServiceRequestScreen';
import ServiceQuoteScreen from '../screens/Services/ServiceQuoteScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Stack Navigator for Profile screens
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
        },
      }}
    >
      <Stack.Screen
        name={SCREEN_NAMES.PROFILE}
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.EDIT_PROFILE}
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator for Home screens (includes services flow)
const HomeStack = ({ navigation }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.text,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: 'MuTraPro',
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
        options={{ title: 'Service Request' }}
      />
      <Stack.Screen
        name="ServiceQuote"
        component={ServiceQuoteScreen}
        options={{ title: 'Review Quote' }}
      />
    </Stack.Navigator>
  );
};

const MainStack = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.text,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.text,
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: 280,
        },
      }}
      initialRouteName={SCREEN_NAMES.HOME}
    >
      <Drawer.Screen
        name={SCREEN_NAMES.HOME}
        component={HomeStack}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerShown: false, // Hide drawer header, use stack header instead
        }}
      />
      <Drawer.Screen
        name="ProfileStack"
        component={ProfileStack}
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainStack;

