import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecordingSlotScreen from '../screens/RecordingFlow/RecordingSlotScreen';
import RecordingVocalScreen from '../screens/RecordingFlow/RecordingVocalScreen';
import RecordingInstrumentScreen from '../screens/RecordingFlow/RecordingInstrumentScreen';
import RecordingReviewScreen from '../screens/RecordingFlow/RecordingReviewScreen';
import VocalistSelectionScreen from '../screens/Services/VocalistSelectionScreen';

const Stack = createNativeStackNavigator();

const RecordingFlowStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="RecordingSlot"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="RecordingSlot" component={RecordingSlotScreen} />
      <Stack.Screen name="RecordingVocal" component={RecordingVocalScreen} />
      <Stack.Screen name="RecordingInstrument" component={RecordingInstrumentScreen} />
      <Stack.Screen name="RecordingReview" component={RecordingReviewScreen} />
      <Stack.Screen name="RecordingVocalistSelect" component={VocalistSelectionScreen} />
    </Stack.Navigator>
  );
};

export default RecordingFlowStack;

