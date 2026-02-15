'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { useClickGesture } from '@/components/Interaction/useClickGesture';
import {
  saveClickCalibration,
  loadClickCalibration,
  resetClickCalibration,
  ClickCalibrationData,
} from '@/lib/math/clickCalibration';

export function ClickCalibration() {
  const { handData } = useVision();
  const clickGesture = useClickGesture(handData);
  const [isOpen, setIsOpen] = useState(false);
  const [calibration, setCalibration] = useState<ClickCalibrationData>(loadClickCalibration());
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'pinch' | 'fist' | 'release'>('idle');
  const [pinchSamples, setPinchSamples] = useState<number[]>([]);
  const [fistSamples, setFistSamples] = useState<number[]>([]); // Number of extended fingers (0 = all closed)
  const [clickSamples, setClickSamples] = useState<number[]>([]);
  const [releaseSamples, setReleaseSamples] = useState<number[]>([]);

  // Load calibration on mount
  useEffect(() => {
    setCalibration(loadClickCalibration());
  }, []);

  const handleStartCalibration = () => {
    setIsCalibrating(true);
    const clickMode = loadClickMode();
    // Start with pinch or fist based on click mode
    if (clickMode === 'fist') {
      setCurrentStep('fist');
    } else {
      setCurrentStep('pinch');
    }
    setPinchSamples([]);
    setFistSamples([]);
    setClickSamples([]);
    setReleaseSamples([]);
    wasClickingRef.current = false;
    clickStartTimeRef.current = null;
    releaseStartTimeRef.current = null;
  };

  const handleCancelCalibration = () => {
    setIsCalibrating(false);
    setCurrentStep('idle');
    setPinchSamples([]);
    setFistSamples([]);
    setClickSamples([]);
    setReleaseSamples([]);
    wasClickingRef.current = false;
    clickStartTimeRef.current = null;
    releaseStartTimeRef.current = null;
  };

  const handleSaveCalibration = () => {
    const clickMode = loadClickMode();
    let avgPinchThreshold = calibration.pinchThreshold;
    let avgFistThreshold = calibration.fistThreshold || 0;
    
    if (pinchSamples.length > 0) {
      avgPinchThreshold = pinchSamples.reduce((a, b) => a + b, 0) / pinchSamples.length;
    }
    
    if (fistSamples.length > 0) {
      // Fist threshold: average number of extended fingers (0 = all closed)
      avgFistThreshold = Math.round(fistSamples.reduce((a, b) => a + b, 0) / fistSamples.length);
    }
    
    // Use default values for click and release delays (Step 2 skipped)
    const defaultClickDelay = 100;
    const defaultReleaseDelay = 150;

    const newCalibration: ClickCalibrationData = {
      pinchThreshold: Math.max(0.01, Math.min(0.2, avgPinchThreshold)),
      fistThreshold: Math.max(0, Math.min(5, avgFistThreshold)),
      clickDelay: defaultClickDelay,
      releaseDelay: defaultReleaseDelay,
      timestamp: Date.now(),
    };

    saveClickCalibration(newCalibration);
    setCalibration(newCalibration);
    setIsCalibrating(false);
    setCurrentStep('idle');
    alert('การ calibrate เสร็จสมบูรณ์!');
  };

  // Track previous clicking state for detecting transitions
  const wasClickingRef = React.useRef(false);
  const clickStartTimeRef = React.useRef<number | null>(null);
  const releaseStartTimeRef = React.useRef<number | null>(null);

  // Collect samples during calibration - Step 1: Pinch detection
  useEffect(() => {
    if (!isCalibrating || currentStep !== 'pinch' || !handData || handData.length === 0) return;

    const primaryHand = handData[0];
    if (primaryHand.landmarks.length < 21) return;

    const indexTip = primaryHand.landmarks[8];
    const thumbTip = primaryHand.landmarks[4];
    const distance = Math.sqrt(
      Math.pow(indexTip.x - thumbTip.x, 2) +
      Math.pow(indexTip.y - thumbTip.y, 2) +
      Math.pow(indexTip.z - thumbTip.z, 2)
    );

    // Collect pinch distance samples when pinching
    if (clickGesture.isClicking && distance < 0.1) {
      setPinchSamples((prev) => [...prev.slice(-19), distance]); // Keep last 20 samples
    }
  }, [isCalibrating, currentStep, handData, clickGesture.isClicking]);

  // Collect samples during calibration - Step 1: Fist detection
  useEffect(() => {
    if (!isCalibrating || currentStep !== 'fist' || !handData || handData.length === 0) return;

    const primaryHand = handData[0];
    if (primaryHand.landmarks.length < 21) return;

    // Get number of extended fingers (0 = all closed = fist)
    const fingerStatus = getFingerStatus(primaryHand.landmarks);
    const extendedFingers = fingerStatus.total;

    // Collect fist samples when making a fist (all fingers closed)
    if (clickGesture.isClicking && extendedFingers === 0) {
      setFistSamples((prev) => [...prev.slice(-19), extendedFingers]); // Keep last 20 samples
    }
  }, [isCalibrating, currentStep, handData, clickGesture.isClicking]);

  // Collect samples during calibration - Step 2: Click/Release timing
  useEffect(() => {
    if (!isCalibrating || currentStep !== 'release' || !handData || handData.length === 0) return;

    const primaryHand = handData[0];
    if (primaryHand.landmarks.length < 21) return;

    const indexTip = primaryHand.landmarks[8];
    const thumbTip = primaryHand.landmarks[4];
    const distance = Math.sqrt(
      Math.pow(indexTip.x - thumbTip.x, 2) +
      Math.pow(indexTip.y - thumbTip.y, 2) +
      Math.pow(indexTip.z - thumbTip.z, 2)
    );

    const isPinchingRaw = distance < 0.1;
    const now = Date.now();
    const wasClicking = wasClickingRef.current;
    const isDebouncedClicking = clickGesture.isClicking;

    // Detect click start (transition from not pinching to pinching)
    if (isPinchingRaw && !wasClicking) {
      clickStartTimeRef.current = now;
    }

    // Detect click registered: measure time from raw pinch to debounced click
    if (isPinchingRaw && clickStartTimeRef.current && isDebouncedClicking && !wasClicking) {
      const clickDelay = now - clickStartTimeRef.current;
      if (clickDelay > 0 && clickDelay < 1000) {
        setClickSamples((prev) => {
          // Only add if we have space and it's a new sample
          if (prev.length < 10) {
            return [...prev, clickDelay];
          }
          return prev;
        });
      }
    }

    // Detect release start (transition from pinching to not pinching)
    if (!isPinchingRaw && wasClicking && clickStartTimeRef.current) {
      if (!releaseStartTimeRef.current) {
        releaseStartTimeRef.current = now;
      }
    }

    // Detect release registered: measure time from raw release to debounced release
    if (!isPinchingRaw && releaseStartTimeRef.current && !isDebouncedClicking && wasClicking) {
      const releaseDelay = now - releaseStartTimeRef.current;
      if (releaseDelay > 0 && releaseDelay < 1000) {
        setReleaseSamples((prev) => {
          // Only add if we have space and it's a new sample
          if (prev.length < 10) {
            return [...prev, releaseDelay];
          }
          return prev;
        });
        // Reset for next cycle
        clickStartTimeRef.current = null;
        releaseStartTimeRef.current = null;
      }
    }

    wasClickingRef.current = isPinchingRaw;
  }, [isCalibrating, currentStep, handData, clickGesture.isClicking]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-black/90 text-white p-3 rounded-lg border border-gray-700 shadow-2xl hover:bg-gray-800 transition-colors text-sm"
      >
        ⚙️ Calibrate Click
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-black/90 text-white p-4 rounded-lg border border-gray-700 shadow-2xl min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base">Calibrate Click</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {!isCalibrating ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              <div>Pinch Threshold: <span className="text-white font-semibold">{calibration.pinchThreshold.toFixed(3)}</span></div>
              <div>Click Delay: <span className="text-white font-semibold">{calibration.clickDelay}ms</span></div>
              <div>Release Delay: <span className="text-white font-semibold">{calibration.releaseDelay}ms</span></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleStartCalibration}
              className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold"
            >
              Start Calibration
            </button>
            <button
              onClick={() => {
                resetClickCalibration();
                setCalibration(loadClickCalibration());
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            {currentStep === 'pinch' && (
              <div className="text-yellow-400">
                <p className="font-semibold mb-2">Step 1: Pinch Detection</p>
                <p>ทำการ pinch (นิ้วชี้ + นิ้วโป้ง) หลายครั้ง</p>
                <p className="text-xs text-gray-400 mt-1">
                  Samples: {pinchSamples.length}/20
                </p>
                {pinchSamples.length >= 20 && (
                  <button
                    onClick={handleSaveCalibration}
                    className="mt-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                  >
                    Save Calibration
                  </button>
                )}
              </div>
            )}

            {currentStep === 'fist' && (
              <div className="text-yellow-400">
                <p className="font-semibold mb-2">Step 1: Fist Detection</p>
                <p>ทำการกำมือ (ปิดนิ้วทั้งหมด) หลายครั้ง</p>
                <p className="text-xs text-gray-400 mt-1">
                  Samples: {fistSamples.length}/20
                </p>
                {fistSamples.length >= 20 && (
                  <button
                    onClick={handleSaveCalibration}
                    className="mt-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                  >
                    Save Calibration
                  </button>
                )}
              </div>
            )}

            {currentStep === 'release' && (
              <div className="text-yellow-400">
                <p className="font-semibold mb-2">Step 2: Release Detection (Skipped)</p>
                <p className="text-xs text-gray-400 mt-1">
                  Step 2 is currently disabled. Using default values.
                </p>
                <button
                  onClick={handleSaveCalibration}
                  className="mt-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                >
                  Save Calibration (Step 1 only)
                </button>
              </div>
            )}

            <button
              onClick={handleCancelCalibration}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
