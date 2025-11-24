import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES, COLORS } from '../config/constants';
import { CustomDrawerContent } from '../components';
import BottomTabNavigator from './BottomTabNavigator';
import MyRequestsScreen from '../screens/Requests/MyRequestsScreen';
import RequestDetailScreen from '../screens/Requests/RequestDetailScreen';
import ContractDetailScreen from '../screens/Contracts/ContractDetailScreen';
import WalletScreen from '../screens/Wallet/WalletScreen';

const Drawer = createDrawerNavigator();

// Main Drawer Navigator integrated with Bottom Tabs

const MainStack = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // Bottom tabs handle their own headers
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.text,
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: 280,
        },
      }}
      initialRouteName="MainTabs"
    >
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{
          title: 'My Requests',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: 'Wallet',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{
          title: 'Request Detail',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="ContractDetail"
        component={ContractDetailScreen}
        options={{
          title: 'Contract Detail',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          headerShown: false,
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainStack;

