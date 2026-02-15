'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';

export interface CalibrationData {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  // Store calibration points for bilinear interpolation
  corners?: Array<{ x: number; y: number; screenX: number; screenY: number }>;
  // Store screen dimensions to detect position changes
  screenWidth?: number;
  screenHeight?: number;
  timestamp?: number;
}

// Eye Aspect Ratio (EAR) calculation for blink detection
// MediaPipe Face Mesh landmark indices for left eye
const LEFT_EYE_INDICES = {
  top: 159,
  bottom: 145,
  left: 33,
  right: 133,
  innerTop: 158,
  innerBottom: 153,
  outerTop: 157,
  outerBottom: 154,
};

// MediaPipe Face Mesh landmark indices for right eye
const RIGHT_EYE_INDICES = {
  top: 386,
  bottom: 374,
  left: 362,
  right: 263,
  innerTop: 385,
  innerBottom: 380,
  outerTop: 387,
  outerBottom: 381,
};

// Calculate Eye Aspect Ratio (EAR)
function calculateEAR(landmarks: Array<{ x: number; y: number; z: number }>, eyeIndices: typeof LEFT_EYE_INDICES): number {
  if (!landmarks || landmarks.length === 0) return 1;

  // Vertical distances
  const vertical1 = Math.sqrt(
    Math.pow(landmarks[eyeIndices.top].x - landmarks[eyeIndices.bottom].x, 2) +
    Math.pow(landmarks[eyeIndices.top].y - landmarks[eyeIndices.bottom].y, 2)
  );
  const vertical2 = Math.sqrt(
    Math.pow(landmarks[eyeIndices.innerTop].x - landmarks[eyeIndices.innerBottom].x, 2) +
    Math.pow(landmarks[eyeIndices.innerTop].y - landmarks[eyeIndices.innerBottom].y, 2)
  );

  // Horizontal distance
  const horizontal = Math.sqrt(
    Math.pow(landmarks[eyeIndices.left].x - landmarks[eyeIndices.right].x, 2) +
    Math.pow(landmarks[eyeIndices.left].y - landmarks[eyeIndices.right].y, 2)
  );

  // EAR = average of two vertical distances / horizontal distance
  if (horizontal === 0) return 1;
  return (vertical1 + vertical2) / (2 * horizontal);
}

// Detect if eyes are closed (blinking)
function detectBlink(landmarks: Array<{ x: number; y: number; z: number }> | undefined): boolean {
  if (!landmarks || landmarks.length === 0) return false;

  const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
  const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
  const avgEAR = (leftEAR + rightEAR) / 2;

  // EAR threshold: lower value means eyes are more closed
  // Normal eye open: ~0.25-0.35, Closed eye: ~0.15-0.20
  const BLINK_THRESHOLD = 0.22;

  return avgEAR < BLINK_THRESHOLD;
}

const CORNERS = [
  { name: 'Top Left', x: 0, y: 0 },
  { name: 'Top Right', x: 1, y: 0 },
  { name: 'Bottom Right', x: 1, y: 1 },
  { name: 'Bottom Left', x: 0, y: 1 },
] as const;

function saveCalibration(data: CalibrationData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gazeCalibration', JSON.stringify(data));
  }
}

export function loadCalibration(): CalibrationData | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gazeCalibration');
    if (saved) {
      try {
        const calibration = JSON.parse(saved) as CalibrationData;
        
        // Check if screen size changed - if so, calibration is invalid
        if (calibration.screenWidth && calibration.screenHeight) {
          const currentWidth = window.innerWidth;
          const currentHeight = window.innerHeight;
          
          // If screen size changed significantly (more than 5%), reset calibration
          const widthDiff = Math.abs(currentWidth - calibration.screenWidth) / calibration.screenWidth;
          const heightDiff = Math.abs(currentHeight - calibration.screenHeight) / calibration.screenHeight;
          
          if (widthDiff > 0.05 || heightDiff > 0.05) {
            // Screen size changed, calibration is invalid
            localStorage.removeItem('gazeCalibration');
            return null;
          }
        }
        
        return calibration;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function GazeCalibration() {
  const { gazeData } = useVision();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [calibrationValues, setCalibrationValues] = useState<Array<{ x: number; y: number }>>([]);
  const [isCalibrated, setIsCalibrated] = useState(() => loadCalibration() !== null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [gazeSamples, setGazeSamples] = useState<Array<{ x: number; y: number }>>([]);
  const [gazePosition, setGazePosition] = useState<{ x: number; y: number } | null>(null);
  const [rawGazeScreenPosition, setRawGazeScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const rawGazeSmootherRef = useRef<{ x: number; y: number } | null>(null);
  
  const wasBlinkingRef = useRef(false);
  const blinkDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const gazePositionRef = useRef<{ x: number; y: number } | null>(null);
  const stableGazeStartTime = useRef<number | null>(null);
  const STABLE_GAZE_DURATION = 1000; // 1 second of stable gaze required
  const GAZE_MOVEMENT_THRESHOLD = 0.05; // 5% movement threshold

  // Start calibration
  const startCalibration = () => {
    setCurrentStep(0);
    setCalibrationValues([]);
    setBlinkCount(0);
    setIsBlinking(false);
    setGazeSamples([]);
    setGazePosition(null);
    wasBlinkingRef.current = false;
    gazePositionRef.current = null;
    stableGazeStartTime.current = null;
    initialGazePositionRef.current = null;
    // Enable landmark storage for calibration
    (window as any).__gazeCalibrationActive = true;
  };

  // Track initial gaze position for this corner (to detect movement)
  const initialGazePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Track gaze position during calibration to detect if user moved
  useEffect(() => {
    if (currentStep === null || !gazeData) {
      gazePositionRef.current = null;
      stableGazeStartTime.current = null;
      initialGazePositionRef.current = null;
      setGazePosition(null);
      return;
    }

    // Track gaze position to ensure user is looking at the same corner
    const currentGazeX = gazeData.direction.x;
    const currentGazeY = gazeData.direction.y;

    // Store initial gaze position when starting a new corner
    if (!initialGazePositionRef.current) {
      initialGazePositionRef.current = { x: currentGazeX, y: currentGazeY };
    }

    // Check if gaze position is stable (not moving too much)
    if (gazePositionRef.current) {
      const distance = Math.sqrt(
        Math.pow(currentGazeX - gazePositionRef.current.x, 2) +
        Math.pow(currentGazeY - gazePositionRef.current.y, 2)
      );

      // Check distance from initial position (for resetting blink count)
      const distanceFromInitial = initialGazePositionRef.current ? Math.sqrt(
        Math.pow(currentGazeX - initialGazePositionRef.current.x, 2) +
        Math.pow(currentGazeY - initialGazePositionRef.current.y, 2)
      ) : 0;

      if (distance > GAZE_MOVEMENT_THRESHOLD || distanceFromInitial > GAZE_MOVEMENT_THRESHOLD) {
        // Gaze moved too much - reset everything
        stableGazeStartTime.current = null;
        gazePositionRef.current = { x: currentGazeX, y: currentGazeY };
        setGazePosition({ x: currentGazeX, y: currentGazeY });
        // Reset blink count if gaze moved
        if (blinkCount > 0) {
          setBlinkCount(0);
          setGazeSamples([]);
        }
      } else {
        // Gaze is stable
        if (!stableGazeStartTime.current) {
          stableGazeStartTime.current = Date.now();
        }
      }
    } else {
      // First reading
      gazePositionRef.current = { x: currentGazeX, y: currentGazeY };
      setGazePosition({ x: currentGazeX, y: currentGazeY });
      stableGazeStartTime.current = Date.now();
    }
  }, [currentStep, gazeData, blinkCount]);

  // Blink detection and calibration
  useEffect(() => {
    if (currentStep === null || !gazeData) {
      wasBlinkingRef.current = false;
      return;
    }

    // Clear previous detection
    if (blinkDetectionRef.current) {
      clearInterval(blinkDetectionRef.current);
    }

    // Detect blinking every frame (throttled)
    blinkDetectionRef.current = setInterval(() => {
      if (!gazeData?.faceLandmarks) {
        // Request landmarks only when calibrating
        return;
      }

      // Only allow blinking if gaze has been stable for required duration
      const isGazeStable = stableGazeStartTime.current && 
        (Date.now() - stableGazeStartTime.current) >= STABLE_GAZE_DURATION;

      if (!isGazeStable) {
        // Gaze not stable yet, don't process blinks
        return;
      }

      const blinking = detectBlink(gazeData.faceLandmarks);
      setIsBlinking(blinking);

      // Detect blink transition: was closed, now open (blink completed)
      if (wasBlinkingRef.current && !blinking) {
        // Blink completed - count it and collect sample
        setBlinkCount(prev => {
          const newCount = prev + 1;
          
          // Collect gaze sample when blink completes
          if (gazeData) {
            setGazeSamples(prevSamples => {
              const updatedSamples = [...prevSamples, {
                x: gazeData.direction.x,
                y: gazeData.direction.y,
              }];

              // After 3 blinks, calculate average and move to next step
              if (newCount >= 3) {
                // Use samples from all 3 blinks
                const samplesToUse = updatedSamples.length > 0 
                  ? updatedSamples.slice(-10) // Use last 10 samples (from all blinks)
                  : [{ x: gazeData.direction.x, y: gazeData.direction.y }];

                // Calculate average
                const avgX = samplesToUse.reduce((sum, s) => sum + s.x, 0) / samplesToUse.length;
                const avgY = samplesToUse.reduce((sum, s) => sum + s.y, 0) / samplesToUse.length;

                setCalibrationValues(prevValues => {
                  const newValues = [...prevValues, { x: avgX, y: avgY }];
                  
                  if (currentStep < CORNERS.length - 1) {
                    setTimeout(() => {
                      setCurrentStep(currentStep + 1);
                      setBlinkCount(0);
                      setGazeSamples([]);
                      // Reset gaze tracking for next corner
                      gazePositionRef.current = null;
                      stableGazeStartTime.current = null;
                      initialGazePositionRef.current = null;
                      setGazePosition(null);
                    }, 500); // Small delay before next step
                  } else {
                    // Calibration complete
                    finishCalibration(newValues);
                    setBlinkCount(0);
                    setGazeSamples([]);
                    setGazePosition(null);
                    // Disable landmark storage after calibration
                    (window as any).__gazeCalibrationActive = false;
                  }
                  
                  return newValues;
                });
              }
              
              return updatedSamples;
            });
          }
          
          return newCount;
        });
      }

      wasBlinkingRef.current = blinking;
    }, 50); // Check every 50ms

    return () => {
      if (blinkDetectionRef.current) {
        clearInterval(blinkDetectionRef.current);
      }
    };
  }, [currentStep, gazeData]);

  const finishCalibration = (values: Array<{ x: number; y: number }>) => {
    if (values.length !== 4) return;

    // Calculate min/max from calibration values
    const xs = values.map(v => v.x);
    const ys = values.map(v => v.y);

    // Store calibration points with their corresponding screen positions
    const corners = [
      { x: values[0].x, y: values[0].y, screenX: 0, screenY: 0 }, // Top Left
      { x: values[1].x, y: values[1].y, screenX: 1, screenY: 0 }, // Top Right
      { x: values[2].x, y: values[2].y, screenX: 1, screenY: 1 }, // Bottom Right
      { x: values[3].x, y: values[3].y, screenX: 0, screenY: 1 }, // Bottom Left
    ];

    const calibrationData: CalibrationData = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      corners: corners, // Store calibration points for bilinear interpolation
      // Store screen dimensions to detect position changes
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: Date.now(),
    };

    saveCalibration(calibrationData);
    setIsCalibrated(true);
    setCurrentStep(null);
  };

  const resetCalibration = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gazeCalibration');
      // Disable landmark storage when not calibrating
      (window as any).__gazeCalibrationActive = false;
    }
    setIsCalibrated(false);
    setCurrentStep(null);
    setCalibrationValues([]);
    setGazePosition(null);
    gazePositionRef.current = null;
    stableGazeStartTime.current = null;
    initialGazePositionRef.current = null;
  };

  // Check if screen size changed and reset calibration if needed
  useEffect(() => {
    const checkScreenSize = () => {
      const calibration = loadCalibration();
      if (calibration && (calibration.screenWidth !== window.innerWidth || calibration.screenHeight !== window.innerHeight)) {
        // Screen size changed - reset calibration
        resetCalibration();
      }
    };

    // Check on mount
    checkScreenSize();

    // Listen for window resize
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update raw gaze preview position with smoothing
  useEffect(() => {
    if (!gazeData || currentStep === null) {
      setRawGazeScreenPosition(null);
      rawGazeSmootherRef.current = null;
      return;
    }

    // Calculate raw gaze position for preview (before calibration)
    // Map gaze direction to screen coordinates
    const sensitivity = 0.3; // Adjust sensitivity for preview
    const centerX = 0.5;
    const centerY = 0.5;
    
    // Map gaze direction to screen position
    const targetX = Math.max(0, Math.min(1, centerX + gazeData.direction.x * sensitivity));
    const targetY = Math.max(0, Math.min(1, centerY - gazeData.direction.y * sensitivity)); // Flip Y axis
    
    // Smooth the position for better visual experience
    if (!rawGazeSmootherRef.current) {
      rawGazeSmootherRef.current = { x: targetX, y: targetY };
    } else {
      // Simple exponential smoothing
      const alpha = 0.3;
      rawGazeSmootherRef.current = {
        x: rawGazeSmootherRef.current.x * (1 - alpha) + targetX * alpha,
        y: rawGazeSmootherRef.current.y * (1 - alpha) + targetY * alpha,
      };
    }
    
    setRawGazeScreenPosition(rawGazeSmootherRef.current);
  }, [gazeData, currentStep]);

  if (isCalibrated && currentStep === null) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-black/90 rounded-lg p-4 border border-gray-700">
        <div className="text-white text-sm">
          <p className="font-semibold mb-2">✓ Gaze Calibrated</p>
          <button
            onClick={resetCalibration}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
          >
            Recalibrate
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === null) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-700 max-w-md">
          <h2 className="text-white text-2xl font-bold mb-4">Gaze Calibration</h2>
          <p className="text-gray-300 mb-6">
            Look at each corner of the screen when prompted. This will help optimize gaze tracking accuracy.
          </p>
          <button
            onClick={startCalibration}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition-colors"
          >
            Start Calibration
          </button>
        </div>
      </div>
    );
  }

  const currentCorner = CORNERS[currentStep];
  const progress = ((currentStep + 1) / CORNERS.length) * 100;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80">
      {/* Raw gaze preview - shows where user is looking in real-time */}
      {rawGazeScreenPosition && gazeData && (
        <div
          className="absolute pointer-events-none z-[201]"
          style={{
            left: `${rawGazeScreenPosition.x * window.innerWidth}px`,
            top: `${rawGazeScreenPosition.y * window.innerHeight}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Gaze preview dot */}
          <div
            className="absolute rounded-full bg-yellow-400/80 border-2 border-yellow-300"
            style={{
              width: '16px',
              height: '16px',
              left: '-8px',
              top: '-8px',
              boxShadow: '0 0 12px rgba(255, 255, 0, 0.8), 0 0 24px rgba(255, 255, 0, 0.4)',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          />
          {/* Crosshair for better visibility */}
          <div
            className="absolute bg-yellow-400/60"
            style={{
              width: '2px',
              height: '30px',
              left: '-1px',
              top: '-15px',
            }}
          />
          <div
            className="absolute bg-yellow-400/60"
            style={{
              width: '30px',
              height: '2px',
              left: '-15px',
              top: '-1px',
            }}
          />
          {/* Label */}
          <div
            className="absolute bg-yellow-400/20 border border-yellow-400/50 rounded px-2 py-1 text-yellow-300 text-xs whitespace-nowrap"
            style={{
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            Gaze Preview
          </div>
        </div>
      )}

      {/* Corner indicator */}
      <div
        className="absolute w-32 h-32 border-4 border-cyan-400 rounded-lg animate-pulse"
        style={{
          left: `${currentCorner.x * 100}%`,
          top: `${currentCorner.y * 100}%`,
          transform: `translate(${currentCorner.x === 0 ? '0' : '-100'}%, ${currentCorner.y === 0 ? '0' : '-100'}%)`,
          boxShadow: '0 0 40px rgba(0, 255, 255, 0.8)',
        }}
      />

      {/* Instructions - positioned at the corner being calibrated */}
      <div
        className="absolute text-center bg-black/90 rounded-lg p-4 border border-cyan-400/50 min-w-[280px]"
        style={{
          left: `${currentCorner.x * 100}%`,
          top: `${currentCorner.y * 100}%`,
          transform: `translate(${currentCorner.x === 0 ? '20px' : 'calc(-100% - 20px)'}, ${currentCorner.y === 0 ? '20px' : 'calc(-100% - 20px)'})`,
        }}
      >
        <h2 className="text-white text-2xl font-bold mb-2">{currentCorner.name}</h2>
        
        {/* Gaze stability indicator */}
        {gazePosition && stableGazeStartTime.current && (
          <div className="mb-2">
            {Date.now() - stableGazeStartTime.current >= STABLE_GAZE_DURATION ? (
              <p className="text-green-400 text-sm font-semibold animate-pulse">
                ✓ Gaze Stable - Ready to blink
              </p>
            ) : (
              <p className="text-yellow-400 text-xs">
                Keep looking... ({Math.ceil((STABLE_GAZE_DURATION - (Date.now() - stableGazeStartTime.current)) / 1000)}s)
              </p>
            )}
          </div>
        )}
        
        <p className="text-yellow-400 text-xl font-bold mb-2">
          Blink 3 times: {blinkCount}/3
        </p>
        {isBlinking && (
          <p className="text-green-400 text-sm mb-2 animate-pulse">👁️ Blinking...</p>
        )}
        <p className="text-gray-400 text-xs mb-2">({currentStep + 1}/{CORNERS.length})</p>
        <div className="mt-2 w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                num <= blinkCount
                  ? 'bg-cyan-400 border-cyan-400 text-black'
                  : 'border-gray-500 text-gray-500'
              }`}
            >
              {num <= blinkCount ? '✓' : num}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
