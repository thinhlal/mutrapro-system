import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { RecordingFlowProvider } from '../context/RecordingFlowContext';
import LoadingScreen from '../components/LoadingScreen';

const RootNavigator = () => {
  const { isAuthenticated, initialized } = useAuth();

  // Show loading screen while initializing auth state
  if (!initialized) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <NavigationContainer>
      <NotificationProvider>
        <RecordingFlowProvider>
          {/* isAuthenticated = true -> MainStack, false -> AuthStack */}
          {isAuthenticated ? <MainStack /> : <AuthStack />}
        </RecordingFlowProvider>
      </NotificationProvider>
    </NavigationContainer>
  );
};

export default RootNavigator;

