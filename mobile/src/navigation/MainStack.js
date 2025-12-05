import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES, COLORS } from '../config/constants';
import { CustomDrawerContent } from '../components';
import BottomTabNavigator from './BottomTabNavigator';
import {
  defaultDrawerScreenOptions,
  getRequestDetailHeaderLeft,
  getContractDetailHeaderLeft,
  getMilestoneDeliveriesHeaderLeft,
  getPaymentHeaderLeft,
  getContractSignedSuccessHeaderLeft,
} from '../config/navigationStyles';
import MyRequestsScreen from '../screens/Requests/MyRequestsScreen';
import RequestDetailScreen from '../screens/Requests/RequestDetailScreen';
import ContractDetailScreen from '../screens/Contracts/ContractDetailScreen';
import WalletScreen from '../screens/Wallet/WalletScreen';
import PaymentDepositScreen from '../screens/Payments/PaymentDepositScreen';
import PaymentMilestoneScreen from '../screens/Payments/PaymentMilestoneScreen';
import PaymentRevisionFeeScreen from '../screens/Payments/PaymentRevisionFeeScreen';
import MilestoneDeliveriesScreen from '../screens/Milestones/MilestoneDeliveriesScreen';
import ContractsListScreen from '../screens/Contracts/ContractsListScreen';
import ContractSignedSuccessScreen from '../screens/Contracts/ContractSignedSuccessScreen';

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
          ...defaultDrawerScreenOptions,
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
          ...defaultDrawerScreenOptions,
        }}
      />
      <Drawer.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={({ navigation }) => ({
          title: 'Request Detail',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getRequestDetailHeaderLeft(navigation),
        })}
      />
      <Drawer.Screen
        name="ContractDetail"
        component={ContractDetailScreen}
        options={({ navigation, route }) => ({
          title: 'Contract Detail',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getContractDetailHeaderLeft(navigation, route),
        })}
      />
      <Drawer.Screen
        name="PaymentDeposit"
        component={PaymentDepositScreen}
        options={({ navigation }) => ({
          title: 'Pay Deposit',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getPaymentHeaderLeft(navigation),
        })}
      />
      <Drawer.Screen
        name="PaymentMilestone"
        component={PaymentMilestoneScreen}
        options={({ navigation }) => ({
          title: 'Pay Milestone',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getPaymentHeaderLeft(navigation),
        })}
      />
      <Drawer.Screen
        name="PaymentRevisionFee"
        component={PaymentRevisionFeeScreen}
        options={({ navigation }) => ({
          title: 'Pay Revision Fee',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getPaymentHeaderLeft(navigation),
        })}
      />
      <Drawer.Screen
        name="MilestoneDeliveries"
        component={MilestoneDeliveriesScreen}
        options={({ navigation, route }) => ({
          title: 'Milestone Deliveries',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getMilestoneDeliveriesHeaderLeft(navigation, route),
        })}
      />
      <Drawer.Screen
        name="ContractsList"
        component={ContractsListScreen}
        options={{
          title: 'My Contracts',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
          ...defaultDrawerScreenOptions,
        }}
      />
      <Drawer.Screen
        name="ContractSignedSuccess"
        component={ContractSignedSuccessScreen}
        options={({ navigation }) => ({
          title: 'Contract Signed Success',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          ...defaultDrawerScreenOptions,
          headerLeft: () => getContractSignedSuccessHeaderLeft(navigation),
        })}
      />
    </Drawer.Navigator>
  );
};

export default MainStack;

