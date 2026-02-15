'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { ExponentialSmoother } from '@/lib/math/smoothing';
import { useClickGesture } from '@/components/Interaction/useClickGesture';
import { isFist } from '@/lib/math/fingerDetection';
import { loadClickMode, loadFingerSettings, loadPrimaryHandPreference, loadMaxHands } from '@/lib/storage';

// MediaPipe hand landmark indices
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

export function HandPointer() {
  const { handData } = useVision();
  const clickGesture = useClickGesture(handData);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [secondaryPosition, setSecondaryPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSecondaryExtended, setIsSecondaryExtended] = useState(false);
  const [isFisting, setIsFisting] = useState(false);
  
  const primaryXSmootherRef = useRef<ExponentialSmoother | null>(null);
  const primaryYSmootherRef = useRef<ExponentialSmoother | null>(null);
  const secondaryXSmootherRef = useRef<ExponentialSmoother | null>(null);
  const secondaryYSmootherRef = useRef<ExponentialSmoother | null>(null);

  useEffect(() => {
    // Load finger settings
    const fingerSettings = loadFingerSettings();
    const primaryFingerIndex = getFingerTipIndex(fingerSettings.primary);
    const secondaryFingerIndex = getFingerTipIndex(fingerSettings.secondary);
    const primaryHandPreference = loadPrimaryHandPreference();
    const maxHands = loadMaxHands();

    // Determine which hand to use for pointer
    let primaryHand: HandData | null = null;
    
    if (maxHands === 2 && handData && handData.length === 2) {
      // Two-hand mode: use preference to select pointer hand
      const leftHand = handData.find(h => h.handedness === 'Left');
      const rightHand = handData.find(h => h.handedness === 'Right');
      
      if (primaryHandPreference === 'left') {
        primaryHand = leftHand || rightHand || null;
      } else if (primaryHandPreference === 'right') {
        primaryHand = rightHand || leftHand || null;
      } else {
        // Auto: use first hand
        primaryHand = handData[0] || null;
      }
    } else {
      // Single hand mode: use first hand
      primaryHand = handData && handData.length > 0 ? handData[0] : null;
    }

    if (!primaryHand || primaryHand.landmarks.length < 21) {
      setPointerPosition(null);
      setSecondaryPosition(null);
      setIsSecondaryExtended(false);
      return;
    }

    // Get finger tip positions
    const primaryTip = primaryHand.landmarks[primaryFingerIndex];
    const secondaryTip = primaryHand.landmarks[secondaryFingerIndex];

    // Check if secondary finger is extended (for thumb, use special logic)
    let secondaryExtended = false;
    if (fingerSettings.secondary === 'thumb') {
      const thumbIP = primaryHand.landmarks[3];
      const thumbMCP = primaryHand.landmarks[2];
      secondaryExtended = Math.abs(secondaryTip.x - thumbIP.x) > Math.abs(thumbIP.x - thumbMCP.x);
    } else {
      // For other fingers, check if tip is above PIP joint
      const pipIndex = secondaryFingerIndex - 2; // PIP is 2 indices before tip
      if (pipIndex >= 0 && pipIndex < primaryHand.landmarks.length) {
        const pip = primaryHand.landmarks[pipIndex];
        secondaryExtended = secondaryTip.y < pip.y;
      }
    }

    // Check if fist
    const fisting = isFist(primaryHand.landmarks);
    setIsFisting(fisting);

    // Use finger tip position directly with minimal smoothing for stability
    // Higher alpha (0.8) means more responsive, closer to raw finger tip position
    if (!primaryXSmootherRef.current) {
      primaryXSmootherRef.current = new ExponentialSmoother(primaryTip.x, 0.8);
      primaryYSmootherRef.current = new ExponentialSmoother(primaryTip.y, 0.8);
      secondaryXSmootherRef.current = new ExponentialSmoother(secondaryTip.x, 0.8);
      secondaryYSmootherRef.current = new ExponentialSmoother(secondaryTip.y, 0.8);
    }

    // Update positions using finger tip directly (high alpha = minimal smoothing)
    // Flip X axis: 1 - x (mirror horizontally)
    const smoothedPrimaryX = 1 - primaryXSmootherRef.current.update(primaryTip.x);
    const smoothedPrimaryY = primaryYSmootherRef.current.update(primaryTip.y);
    const smoothedSecondaryX = 1 - secondaryXSmootherRef.current.update(secondaryTip.x);
    const smoothedSecondaryY = secondaryYSmootherRef.current.update(secondaryTip.y);

    // Convert normalized coordinates to screen coordinates
    setPointerPosition({
      x: smoothedPrimaryX * window.innerWidth,
      y: smoothedPrimaryY * window.innerHeight,
    });

    setSecondaryPosition({
      x: smoothedSecondaryX * window.innerWidth,
      y: smoothedSecondaryY * window.innerHeight,
    });

    setIsSecondaryExtended(secondaryExtended);
  }, [handData]);

  if (!pointerPosition) return null;

  return (
    <>
      {/* Index finger pointer - main pointer */}
      <div
        className="fixed pointer-events-none z-[100] transition-opacity duration-200"
        style={{
          left: `${pointerPosition.x}px`,
          top: `${pointerPosition.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Pointer cursor */}
        <div className="relative">
          {/* Outer ring - changes color when clicking or fisting */}
          <div
            className="absolute rounded-full border-2 transition-all duration-200"
            style={{
              width: clickGesture.isClicking ? '24px' : '20px',
              height: clickGesture.isClicking ? '24px' : '20px',
              left: clickGesture.isClicking ? '-12px' : '-10px',
              top: clickGesture.isClicking ? '-12px' : '-10px',
              borderColor: clickGesture.isClicking 
                ? (isFisting && (loadClickMode() === 'fist' || loadClickMode() === 'both') ? '#f97316' : '#10b981') // Orange for fist, green for pinch
                : (isFisting ? '#f97316' : '#60a5fa'), // Orange when fisting, blue otherwise
              boxShadow: clickGesture.isClicking
                ? (isFisting && (loadClickMode() === 'fist' || loadClickMode() === 'both')
                    ? '0 0 15px rgba(249, 115, 22, 0.8), 0 0 30px rgba(249, 115, 22, 0.4)'
                    : '0 0 15px rgba(16, 185, 129, 0.8), 0 0 30px rgba(16, 185, 129, 0.4)')
                : (isFisting
                    ? '0 0 10px rgba(249, 115, 22, 0.6), 0 0 20px rgba(249, 115, 22, 0.3)'
                    : '0 0 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)'),
            }}
          />
          
          {/* Inner dot - changes size when clicking */}
          <div
            className="absolute rounded-full transition-all duration-200"
            style={{
              width: clickGesture.isClicking ? '10px' : '6px',
              height: clickGesture.isClicking ? '10px' : '6px',
              left: clickGesture.isClicking ? '-5px' : '-3px',
              top: clickGesture.isClicking ? '-5px' : '-3px',
              backgroundColor: clickGesture.isClicking
                ? (isFisting && (loadClickMode() === 'fist' || loadClickMode() === 'both') ? '#f97316' : '#10b981')
                : (isFisting ? '#f97316' : '#60a5fa'),
              boxShadow: clickGesture.isClicking
                ? (isFisting && (loadClickMode() === 'fist' || loadClickMode() === 'both')
                    ? '0 0 12px rgba(249, 115, 22, 1)'
                    : '0 0 12px rgba(16, 185, 129, 1)')
                : (isFisting
                    ? '0 0 8px rgba(249, 115, 22, 0.8)'
                    : '0 0 8px rgba(59, 130, 246, 0.8)'),
            }}
          />

          {/* Crosshair lines */}
          <div
            className="absolute transition-opacity duration-200"
            style={{
              width: '2px',
              height: '24px',
              left: '-1px',
              top: '-12px',
              backgroundColor: clickGesture.isClicking ? '#10b981' : 'rgba(59, 130, 246, 0.6)',
              opacity: clickGesture.isClicking ? 0.8 : 0.6,
              boxShadow: clickGesture.isClicking
                ? '0 0 6px rgba(16, 185, 129, 0.6)'
                : '0 0 4px rgba(59, 130, 246, 0.5)',
            }}
          />
          <div
            className="absolute transition-opacity duration-200"
            style={{
              width: '24px',
              height: '2px',
              left: '-12px',
              top: '-1px',
              backgroundColor: clickGesture.isClicking ? '#10b981' : 'rgba(59, 130, 246, 0.6)',
              opacity: clickGesture.isClicking ? 0.8 : 0.6,
              boxShadow: clickGesture.isClicking
                ? '0 0 6px rgba(16, 185, 129, 0.6)'
                : '0 0 4px rgba(59, 130, 246, 0.5)',
            }}
          />
        </div>
      </div>

      {/* Secondary finger indicator - action indicator */}
      {secondaryPosition && (
        <div
          className="fixed pointer-events-none z-[99] transition-opacity duration-200"
          style={{
            left: `${secondaryPosition.x}px`,
            top: `${secondaryPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            opacity: isSecondaryExtended ? 0.8 : 0.3,
          }}
        >
          {/* Secondary finger indicator */}
          <div className="relative">
            {/* Smaller ring for secondary finger */}
            <div
              className="absolute rounded-full border-2 border-orange-400"
              style={{
                width: '14px',
                height: '14px',
                left: '-7px',
                top: '-7px',
                boxShadow: isSecondaryExtended 
                  ? '0 0 8px rgba(251, 146, 60, 0.8), 0 0 16px rgba(251, 146, 60, 0.4)'
                  : '0 0 4px rgba(251, 146, 60, 0.3)',
                transition: 'all 0.2s',
              }}
            />
            
            {/* Inner dot */}
            <div
              className="absolute rounded-full bg-orange-400"
              style={{
                width: '4px',
                height: '4px',
                left: '-2px',
                top: '-2px',
                opacity: isSecondaryExtended ? 1 : 0.5,
                boxShadow: isSecondaryExtended ? '0 0 6px rgba(251, 146, 60, 0.9)' : 'none',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
