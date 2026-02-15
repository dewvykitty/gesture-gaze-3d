'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { HandData } from '@/types/hand';
import { distance3D } from '@/lib/math/vectorUtils';
import { PINCH_DISTANCE_THRESHOLD } from '@/lib/constants';
import { Vector2Smoother } from '@/lib/math/smoothing';
import { ExponentialSmoother } from '@/lib/math/smoothing';
import { isFist, getPalmCenter } from '@/lib/math/fingerDetection';
import { calculateHandDepth, calculateHandScale } from '@/lib/math/handDepth';
import { loadClickCalibration } from '@/lib/math/clickCalibration';
import { loadClickMode, loadFingerSettings, loadPrimaryHandPreference, loadMaxHands, ClickMode, PrimaryHandPreference } from '@/lib/storage';

// MediaPipe hand landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

// Map finger type to landmark index
function getFingerTipIndex(finger: 'index' | 'middle' | 'ring' | 'pinky' | 'thumb'): number {
  switch (finger) {
    case 'thumb': return THUMB_TIP;
    case 'index': return INDEX_TIP;
    case 'middle': return MIDDLE_TIP;
    case 'ring': return RING_TIP;
    case 'pinky': return PINKY_TIP;
    default: return INDEX_TIP;
  }
}

// Use finger tip position directly with minimal smoothing (high alpha = more responsive)
const clickPositionSmoother = new Vector2Smoother(0.8);
const clickStrengthSmoother = new ExponentialSmoother(0, 0.3);

export interface ClickGesture {
  isClicking: boolean;
  clickPosition: { x: number; y: number; z?: number };
  clickStrength: number;
  clickMode: 'pinch' | 'fist' | 'both';
  handDepth: number; // 0 = far, 1 = near
  handScale: number; // Hand expansion/contraction
}

export function useClickGesture(handData: HandData[]): ClickGesture {
  // Click state tracking for debouncing (use ref to persist across renders)
  const clickStateRef = useRef({
    isClickingRaw: false,
    isClickingDebounced: false,
    clickStartTime: 0,
    releaseStartTime: 0,
  });

  const [debouncedClicking, setDebouncedClicking] = React.useState(false);

  // Load settings
  const clickMode = loadClickMode();
  const fingerSettings = loadFingerSettings();
  const calibration = loadClickCalibration();

  // Debounce logic with useEffect
  useEffect(() => {
    const primaryHandPreference = loadPrimaryHandPreference();
    const maxHands = loadMaxHands();
    
    // Determine which hand to use for pointer and click (same logic as useMemo)
    let pointerHand: HandData | null = null;
    let clickHand: HandData | null = null;
    
    if (maxHands === 2 && handData && handData.length === 2) {
      const leftHand = handData.find(h => h.handedness === 'Left');
      const rightHand = handData.find(h => h.handedness === 'Right');
      
      if (primaryHandPreference === 'left') {
        pointerHand = leftHand || rightHand || null;
        clickHand = rightHand || leftHand || null;
      } else if (primaryHandPreference === 'right') {
        pointerHand = rightHand || leftHand || null;
        clickHand = leftHand || rightHand || null;
      } else {
        pointerHand = handData[0] || null;
        clickHand = handData[1] || null;
      }
    } else {
      pointerHand = handData && handData.length > 0 ? handData[0] : null;
      clickHand = pointerHand;
    }
    
    if (!pointerHand || pointerHand.landmarks.length < 9) {
      clickStateRef.current.isClickingRaw = false;
      setDebouncedClicking(false);
      return;
    }

    const primaryFingerIndex = getFingerTipIndex(fingerSettings.primary);
    const secondaryFingerIndex = getFingerTipIndex(fingerSettings.secondary);
    const primaryTip = pointerHand.landmarks[primaryFingerIndex];
    const secondaryTip = pointerHand.landmarks[secondaryFingerIndex];

    const pinchThreshold = calibration.pinchThreshold || PINCH_DISTANCE_THRESHOLD;
    const distance = distance3D(primaryTip, secondaryTip);
    const isPinchingRaw = distance < pinchThreshold;
    
    // Check fist on click hand (if different from pointer hand)
    let isFisting = false;
    if (clickHand && clickHand !== pointerHand) {
      // Two-hand mode: check fist on click hand
      isFisting = isFist(clickHand.landmarks);
    } else {
      // Single hand mode: check fist on same hand
      isFisting = isFist(pointerHand.landmarks);
    }

    let isClickingRaw = false;
    if (clickMode === 'pinch') {
      isClickingRaw = isPinchingRaw;
    } else if (clickMode === 'fist') {
      isClickingRaw = isFisting;
    } else if (clickMode === 'both') {
      isClickingRaw = isPinchingRaw || isFisting;
    }

    const now = Date.now();
    const clickDelay = calibration.clickDelay || 100;
    const releaseDelay = calibration.releaseDelay || 150;

    // Detect transitions
    if (isClickingRaw && !clickStateRef.current.isClickingRaw) {
      clickStateRef.current.clickStartTime = now;
    }
    if (!isClickingRaw && clickStateRef.current.isClickingRaw) {
      clickStateRef.current.releaseStartTime = now;
    }
    clickStateRef.current.isClickingRaw = isClickingRaw;

    // Apply debouncing
    if (isClickingRaw && clickStateRef.current.clickStartTime > 0) {
      const timeSinceClickStart = now - clickStateRef.current.clickStartTime;
      if (timeSinceClickStart >= clickDelay) {
        setDebouncedClicking(true);
      }
    }

    if (!isClickingRaw && clickStateRef.current.releaseStartTime > 0) {
      const timeSinceReleaseStart = now - clickStateRef.current.releaseStartTime;
      if (timeSinceReleaseStart >= releaseDelay) {
        setDebouncedClicking(false);
        clickStateRef.current.clickStartTime = 0;
        clickStateRef.current.releaseStartTime = 0;
      }
    }
  }, [handData, clickMode, fingerSettings, calibration]);

  return useMemo(() => {
    const primaryFingerIndex = getFingerTipIndex(fingerSettings.primary);
    const secondaryFingerIndex = getFingerTipIndex(fingerSettings.secondary);
    const primaryHandPreference = loadPrimaryHandPreference();
    const maxHands = loadMaxHands();
    
    // Determine which hand to use for pointer and which for click
    let pointerHand: HandData | null = null;
    let clickHand: HandData | null = null;
    
    if (maxHands === 2 && handData && handData.length === 2) {
      // Two-hand mode: use preference to select pointer hand
      const leftHand = handData.find(h => h.handedness === 'Left');
      const rightHand = handData.find(h => h.handedness === 'Right');
      
      if (primaryHandPreference === 'left') {
        pointerHand = leftHand || rightHand || null;
        clickHand = rightHand || leftHand || null;
      } else if (primaryHandPreference === 'right') {
        pointerHand = rightHand || leftHand || null;
        clickHand = leftHand || rightHand || null;
      } else {
        // Auto: use first hand as pointer, second as click
        pointerHand = handData[0] || null;
        clickHand = handData[1] || null;
      }
    } else {
      // Single hand mode: use the same hand for both
      pointerHand = handData && handData.length > 0 ? handData[0] : null;
      clickHand = pointerHand;
    }
    
    // Use pointer hand for position calculation
    const primaryHand = pointerHand;
    
    if (!primaryHand || primaryHand.landmarks.length < 9) {
      clickPositionSmoother.reset(0.5, 0.5);
      clickStrengthSmoother.reset(0);
      return {
        isClicking: false,
        clickPosition: { x: 0.5, y: 0.5, z: 0 },
        clickStrength: 0,
        clickMode,
        handDepth: 0.5,
        handScale: 1.0,
      };
    }

    const primaryTip = primaryHand.landmarks[primaryFingerIndex];
    const secondaryTip = primaryHand.landmarks[secondaryFingerIndex];

    // Check pinch gesture (primary + secondary fingers) on pointer hand
    // Use calibrated threshold if available
    const pinchThreshold = calibration.pinchThreshold || PINCH_DISTANCE_THRESHOLD;
    const distance = distance3D(primaryTip, secondaryTip);
    const isPinchingRaw = distance < pinchThreshold;
    
    // Check fist gesture on click hand (if different from pointer hand)
    let isFisting = false;
    if (clickHand && clickHand !== pointerHand) {
      // Two-hand mode: check fist on click hand
      isFisting = isFist(clickHand.landmarks);
    } else {
      // Single hand mode: check fist on same hand
      isFisting = isFist(primaryHand.landmarks);
    }

    const isClicking = debouncedClicking;

    // Calculate click strength
    let clickStrength = 0;
    if (clickMode === 'pinch') {
      const maxDistance = pinchThreshold * 2;
      const rawStrength = 1 - Math.min(distance / maxDistance, 1);
      clickStrength = clickStrengthSmoother.update(isClicking ? rawStrength : 0);
    } else if (clickMode === 'fist') {
      clickStrength = clickStrengthSmoother.update(isClicking ? 1 : 0);
    } else if (clickMode === 'both') {
      if (isPinchingRaw) {
        const maxDistance = pinchThreshold * 2;
        const rawStrength = 1 - Math.min(distance / maxDistance, 1);
        clickStrength = clickStrengthSmoother.update(rawStrength);
      } else if (isFisting) {
        clickStrength = clickStrengthSmoother.update(1);
      } else {
        clickStrength = clickStrengthSmoother.update(0);
      }
    }

    // Calculate click position (X, Y)
    // Always use pointer hand position for click position (even when clicking with other hand)
    let clickX: number;
    let clickY: number;
    
    // MediaPipe coordinates: (0,0) is top-left, (1,1) is bottom-right
    // X: 0 = left, 1 = right (need to flip for mirror effect)
    // Y: 0 = top, 1 = bottom (no flip needed, already correct)
    if (isFisting && (clickMode === 'fist' || clickMode === 'both') && clickHand && clickHand !== pointerHand) {
      // Two-hand mode: fist detected on click hand, but use pointer hand position
      // This allows pointing with one hand and clicking with the other
      clickX = 1 - primaryTip.x; // Use pointer hand position
      clickY = primaryTip.y;
    } else if (isFisting && (clickMode === 'fist' || clickMode === 'both')) {
      // Single hand mode: fist on same hand, use center of palm
      const palmCenter = getPalmCenter(primaryHand.landmarks);
      if (palmCenter) {
        clickX = 1 - palmCenter.x; // Flip X for mirror effect
        clickY = palmCenter.y; // Y is already correct
      } else {
        // Fallback to wrist if palm center calculation fails
        const wrist = primaryHand.landmarks[WRIST];
        clickX = 1 - wrist.x;
        clickY = wrist.y;
      }
    } else if (isPinchingRaw && (clickMode === 'pinch' || clickMode === 'both')) {
      // Use average of primary and secondary for pinch (more accurate)
      const avgX = (primaryTip.x + secondaryTip.x) / 2;
      const avgY = (primaryTip.y + secondaryTip.y) / 2;
      clickX = 1 - avgX; // Flip X for mirror effect
      clickY = avgY; // Y is already correct
    } else {
      // Always use primary finger position for consistency
      // This prevents position jumps when switching between pinch and fist
      clickX = 1 - primaryTip.x; // Flip X for mirror effect
      clickY = primaryTip.y; // Y is already correct
    }
    
    // Calculate hand depth and scale
    const handDepth = calculateHandDepth(primaryHand.landmarks);
    const handScale = calculateHandScale(primaryHand.landmarks);
    
    // Calculate Z depth: use hand depth (0 = far, 1 = near)
    // Map to 3D world space: -3 (far) to 3 (near) for better control
    // Use hand scale as additional factor: expanded hand = closer
    // SWAPPED: Invert Z axis (near = negative, far = positive)
    const scaleFactor = (handScale - 1.0) * 0.5; // Scale contribution: -0.25 to 0.25
    const baseZ = (handDepth - 0.5) * 6; // Base range: -3 to 3
    const clickZ = -(baseZ + scaleFactor); // SWAPPED: Invert sign (Combined: -3.25 to 3.25 → 3.25 to -3.25)
    
    const smoothedPosition = clickPositionSmoother.update(clickX, clickY);

    return {
      isClicking,
      clickPosition: { ...smoothedPosition, z: clickZ },
      clickStrength,
      clickMode,
      handDepth,
      handScale,
    };
  }, [handData, debouncedClicking, clickMode, fingerSettings, calibration]);
}
