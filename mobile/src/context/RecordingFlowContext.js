import React, { createContext, useContext, useState, useMemo } from 'react';

const RecordingFlowContext = createContext(null);

export const RecordingFlowProvider = ({ children }) => {
  const [state, setState] = useState({
    bookingDate: null,
    bookingStartTime: null,
    bookingEndTime: null,
    durationHours: null,
    step1: null, // slot info
    step2: null, // vocal selection
    step3: null, // instruments/equipment
    file: null, // upload file
    contact: null, // contact info
  });

  const update = (payload) =>
    setState((prev) => ({
      ...prev,
      ...payload,
    }));

  const reset = () =>
    setState({
      bookingDate: null,
      bookingStartTime: null,
      bookingEndTime: null,
      durationHours: null,
      step1: null,
      step2: null,
      step3: null,
      file: null,
      contact: null,
    });

  const value = useMemo(
    () => ({
      state,
      update,
      reset,
    }),
    [state]
  );

  return (
    <RecordingFlowContext.Provider value={value}>
      {children}
    </RecordingFlowContext.Provider>
  );
};

export const useRecordingFlow = () => {
  const ctx = useContext(RecordingFlowContext);
  if (!ctx) throw new Error('useRecordingFlow must be used within RecordingFlowProvider');
  return ctx;
};

