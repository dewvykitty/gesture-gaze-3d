'use client';

import React from 'react';
import { VisionProvider, useVision } from '@/components/Vision/VisionProvider';
import { VideoElement } from '@/components/Vision/VideoElement';
import { PinchGestureProvider } from '@/components/Interaction/PinchGestureProvider';
import { CanvasScene } from '@/components/Scene/CanvasScene';
import { DebugPanel } from '@/components/UI/DebugPanel';
import { HandPreview } from '@/components/UI/HandPreview';
import { HandSettings } from '@/components/UI/HandSettings';
import { Overlay } from '@/components/UI/Overlay';
import { HandPointer } from '@/components/UI/HandPointer';
import { FingerStatusPanel } from '@/components/UI/FingerStatusPanel';
import { ClickModeSettings } from '@/components/UI/ClickModeSettings';
import { FingerSettings } from '@/components/UI/FingerSettings';
import { SettingsToggle } from '@/components/UI/SettingsToggle';
import { ClickCalibration } from '@/components/UI/ClickCalibration';
import { PrimaryHandSettings } from '@/components/UI/PrimaryHandSettings';
// Gaze tracking components - temporarily disabled (will re-enable after camera change)
// import { GazeCursor } from '@/components/UI/GazeCursor';
// import { GazeCalibration } from '@/components/UI/GazeCalibration';
// import { GazeIndicator } from '@/components/UI/GazeIndicator';

// Feature flag: Enable/disable gaze tracking
const ENABLE_GAZE_TRACKING = false;

function AppContent() {
  const { maxHands, setMaxHands } = useVision();

  return (
    <>
      <CanvasScene />
      {/* Gaze tracking components - disabled temporarily */}
      {/* {ENABLE_GAZE_TRACKING && (
        <>
          <GazeCalibration />
          <GazeIndicator />
          <GazeCursor />
        </>
      )} */}
      <HandPointer />
      <FingerStatusPanel />
            <SettingsToggle label="ตั้งค่า">
              <ClickModeSettings />
              <FingerSettings />
              <PrimaryHandSettings />
            </SettingsToggle>
      <ClickCalibration />
      <DebugPanel />
      <HandPreview />
      <HandSettings maxHands={maxHands} onMaxHandsChange={setMaxHands} />
      <Overlay />
    </>
  );
}

export default function Home() {
  return (
    <VisionProvider>
      <VideoElement />
      <PinchGestureProvider>
        <div className="relative w-full h-screen">
          <AppContent />
        </div>
      </PinchGestureProvider>
    </VisionProvider>
  );
}
