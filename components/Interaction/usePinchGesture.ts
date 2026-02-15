'use client';

import { useMemo } from 'react';
import { HandData, PinchGesture } from '@/types/hand';
import { distance3D } from '@/lib/math/vectorUtils';
import { PINCH_DISTANCE_THRESHOLD, PINCH_STRENGTH_SMOOTHING } from '@/lib/constants';
import { Vector2Smoother } from '@/lib/math/smoothing';
import { ExponentialSmoother } from '@/lib/math/smoothing';

// MediaPipe hand landmark indices
const THUMB_TIP = 4;
const INDEX_TIP = 8;

const pinchPositionSmoother = new Vector2Smoother(PINCH_STRENGTH_SMOOTHING);
const pinchStrengthSmoother = new ExponentialSmoother(0, PINCH_STRENGTH_SMOOTHING);

export function usePinchGesture(handData: HandData[]): PinchGesture {
  return useMemo(() => {
    // Use the first hand (or primary hand) for pinch detection
    const primaryHand = handData.length > 0 ? handData[0] : null;
    
    if (!primaryHand || primaryHand.landmarks.length < 9) {
      pinchPositionSmoother.reset(0.5, 0.5);
      pinchStrengthSmoother.reset(0);
      return {
        isPinching: false,
        pinchPosition: { x: 0.5, y: 0.5 },
        pinchStrength: 0,
      };
    }

    const thumbTip = primaryHand.landmarks[THUMB_TIP];
    const indexTip = primaryHand.landmarks[INDEX_TIP];

    const distance = distance3D(thumbTip, indexTip);
    const isPinching = distance < PINCH_DISTANCE_THRESHOLD;
    
    // Calculate pinch strength (0-1, where 1 is fully pinched)
    const maxDistance = PINCH_DISTANCE_THRESHOLD * 2;
    const rawStrength = 1 - Math.min(distance / maxDistance, 1);
    const pinchStrength = pinchStrengthSmoother.update(isPinching ? rawStrength : 0);

    // Calculate pinch position (average of thumb and index tips)
    const pinchX = (thumbTip.x + indexTip.x) / 2;
    const pinchY = (thumbTip.y + indexTip.y) / 2;
    const smoothedPosition = pinchPositionSmoother.update(pinchX, pinchY);

    return {
      isPinching,
      pinchPosition: smoothedPosition,
      pinchStrength,
    };
  }, [handData]);
}
