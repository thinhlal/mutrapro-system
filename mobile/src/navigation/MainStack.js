import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SCREEN_NAMES } from '../config/constants';

// Import screens
import HomeScreen from '../screens/Main/HomeScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import EditProfileScreen from '../screens/Main/EditProfileScreen';

const Stack = createStackNavigator();

const MainStack = () => {
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
      initialRouteName={SCREEN_NAMES.HOME}
    >
      <Stack.Screen
        name={SCREEN_NAMES.HOME}
        component={HomeScreen}
        options={{ title: 'MuTraPro' }}
      />
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

export default MainStack;

