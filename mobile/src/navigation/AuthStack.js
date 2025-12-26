import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SCREEN_NAMES } from '../config/constants';

// Import screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import VerifyEmailScreen from '../screens/Auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';

const Stack = createStackNavigator();


// Guest Zone: Only show auth screens
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
      initialRouteName={SCREEN_NAMES.LOGIN}
    >
      <Stack.Screen name={SCREEN_NAMES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREEN_NAMES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={SCREEN_NAMES.VERIFY_EMAIL} component={VerifyEmailScreen} />
      <Stack.Screen name={SCREEN_NAMES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={SCREEN_NAMES.RESET_PASSWORD} component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;

