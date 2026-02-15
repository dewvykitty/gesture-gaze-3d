'use client';

import { useMemo } from 'react';
import { HandData } from '@/types/hand';

// MediaPipe hand landmark indices
const THUMB_TIP = 4;
const THUMB_IP = 3;
const THUMB_MCP = 2;

export interface ThumbAction {
  position: { x: number; y: number };
  isExtended: boolean;
  isActive: boolean; // Thumb is extended and ready for action
}

export function useThumbAction(handData: HandData[]): ThumbAction {
  return useMemo(() => {
    // Use the first hand (primary hand)
    const primaryHand = handData && handData.length > 0 ? handData[0] : null;

    if (!primaryHand || primaryHand.landmarks.length < 5) {
      return {
        position: { x: 0, y: 0 },
        isExtended: false,
        isActive: false,
      };
    }

    const thumbTip = primaryHand.landmarks[THUMB_TIP];
    const thumbIP = primaryHand.landmarks[THUMB_IP];
    const thumbMCP = primaryHand.landmarks[THUMB_MCP];

    // Check if thumb is extended
    const isExtended = Math.abs(thumbTip.x - thumbIP.x) > Math.abs(thumbIP.x - thumbMCP.x);

    // Convert normalized coordinates to screen coordinates
    const screenX = thumbTip.x * window.innerWidth;
    const screenY = thumbTip.y * window.innerHeight;

    return {
      position: { x: screenX, y: screenY },
      isExtended,
      isActive: isExtended, // Active when extended
    };
  }, [handData]);
}
