'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { usePinchGesture } from './usePinchGesture';
import { useGazeRay } from './GazeRayProvider';
import { useClickGesture, ClickGesture } from './useClickGesture';
import { PinchGesture } from '@/types/hand';
import { Raycaster } from 'three';

interface InteractionContextType {
  pinchGesture: PinchGesture;
  clickGesture: ClickGesture;
  gazeRay: Raycaster | null;
}

const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const { handData } = useVision();
  const pinchGesture = usePinchGesture(handData);
  const clickGesture = useClickGesture(handData);
  const gazeRay = useGazeRay();

  return (
    <InteractionContext.Provider
      value={{
        pinchGesture,
        clickGesture,
        gazeRay,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction() {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
}
