import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import LoadingScreen from '../components/LoadingScreen';

const RootNavigator = () => {
  const { isAuthenticated, initialized } = useAuth();

  // Show loading screen while initializing auth state
  if (!initialized) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigator;

