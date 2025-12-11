// RecordingFlowController.jsx - Controller cho multi-step recording flow
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Button, Card } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
// Step 1: Slot Selection (moved from Step5)
import RecordingStep1 from './steps/RecordingStep1/RecordingStep1';
// Step 2: Vocal Setup
import RecordingStep2 from './steps/RecordingStep2/RecordingStep2';
// Step 3: Instrument Setup
import RecordingStep3 from './steps/RecordingStep3/RecordingStep3';
// Step 4: Summary
import RecordingStep4 from './steps/RecordingStep4/RecordingStep4';
import styles from './RecordingFlowController.module.css';
import Header from '../../../../components/common/Header/Header';

const STORAGE_KEY = 'recordingFlowData';

const STEPS = [
  {
    title: 'Slot Selection',
    description: 'Select Date & Time',
  },
  {
    title: 'Vocal Setup',
    description: 'Who will sing?',
  },
  {
    title: 'Instrument Setup',
    description: 'Instruments & Equipment',
  },
  {
    title: 'Summary',
    description: 'Review & Confirm',
  },
];

export default function RecordingFlowController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize from storage or URL
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const storedData = stored ? JSON.parse(stored) : {};
      const stepFromUrl = location.state?.step;
      return stepFromUrl !== undefined
        ? stepFromUrl
        : storedData.currentStep || 0;
    } catch {
      return location.state?.step || 0;
    }
  });
  const [flowData, setFlowData] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Restore step from URL - only when location.state changes (from navigation)
  useEffect(() => {
    const stepFromUrl = location.state?.step;

    // Only update step if it's explicitly provided in URL state and different from current
    // This handles navigation from selection pages
    if (stepFromUrl !== undefined && stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl);
    }

    // Check if returning from selection page and update flow data
    if (location.state?.returnFromSelection) {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const updated = JSON.parse(stored);
          setFlowData(updated);
          // Update step if it's in the stored data and different
          if (
            updated.currentStep !== undefined &&
            updated.currentStep !== currentStep
          ) {
            setCurrentStep(updated.currentStep);
          }
        }
      } catch (error) {
        console.error('Error restoring flow data:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]); // Only depend on location.state object changes (from navigation)

  // Save flow data to storage
  const updateFlowData = (newData, stepOverride = null) => {
    const stepToSave = stepOverride !== null ? stepOverride : currentStep;
    const updated = { ...flowData, ...newData, currentStep: stepToSave };
    setFlowData(updated);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateFlowData({}, nextStep);
      // Update URL without navigation
      window.history.replaceState(
        { ...location.state, step: nextStep },
        '',
        location.pathname
      );
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateFlowData({}, prevStep);
      window.history.replaceState(
        { ...location.state, step: prevStep },
        '',
        location.pathname
      );
    }
  };

  const handleStepComplete = stepData => {
    // Update flow data first
    const updated = { ...flowData, ...stepData };
    setFlowData(updated);

    // Then move to next step
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Update storage with new step and data
      const finalData = { ...updated, currentStep: nextStep };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
      // Update URL without navigation
      window.history.replaceState(
        { ...location.state, step: nextStep },
        '',
        location.pathname
      );
    } else {
      // If at last step, just update data
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...updated, currentStep })
      );
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Slot Selection
        return (
          <RecordingStep1
            data={flowData.step1}
            onComplete={data => handleStepComplete({ step1: data })}
          />
        );
      case 1:
        // Step 2: Vocal Setup - pass step1 data for booking slot info
        return (
          <RecordingStep2
            data={{
              ...flowData.step2,
              bookingDate: flowData.step1?.bookingDate,
              bookingStartTime: flowData.step1?.bookingStartTime,
              bookingEndTime: flowData.step1?.bookingEndTime,
            }}
            onComplete={data => handleStepComplete({ step2: data })}
          />
        );
      case 2:
        // Step 3: Instrument Setup - pass step1 data for booking slot info
        return (
          <RecordingStep3
            data={{
              ...flowData.step3,
              bookingDate: flowData.step1?.bookingDate,
              bookingStartTime: flowData.step1?.bookingStartTime,
              bookingEndTime: flowData.step1?.bookingEndTime,
            }}
            onComplete={data => handleStepComplete({ step3: data })}
            onBack={handlePrev}
          />
        );
      case 3:
        // Step 4: Review & Submit
        return (
          <RecordingStep4
            formData={{
              step1: flowData.step1 || {},
              step2: flowData.step2 || {},
              step3: flowData.step3 || {},
            }}
            onBack={handlePrev}
            onSubmit={() => {
              // Final step - submit all data
              const finalData = {
                step1: flowData.step1,
                step2: flowData.step2,
                step3: flowData.step3,
              };
              // Navigate to quote page to create service request + booking
              navigate('/services/quotes/recording', {
                state: { recordingData: finalData },
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.stepsContainer}>
          <Card>
            <Steps
              current={currentStep}
              items={STEPS}
              size="small"
              responsive
            />
          </Card>
        </div>

        <div className={styles.contentContainer}>{renderStepContent()}</div>

        <div className={styles.navigationContainer}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={currentStep === 0}
            size="large"
          >
            Previous
          </Button>
          <div className={styles.stepIndicator}>
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>
      </div>
    </>
  );
}
