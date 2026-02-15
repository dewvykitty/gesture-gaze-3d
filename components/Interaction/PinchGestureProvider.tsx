'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { usePinchGesture } from './usePinchGesture';
import { PinchGesture } from '@/types/hand';

interface PinchGestureContextType {
  pinchGesture: PinchGesture;
}

const PinchGestureContext = createContext<PinchGestureContextType | undefined>(undefined);

export function PinchGestureProvider({ children }: { children: ReactNode }) {
  const { handData } = useVision();
  const pinchGesture = usePinchGesture(handData); // handData is now an array

  return (
    <PinchGestureContext.Provider value={{ pinchGesture }}>
      {children}
    </PinchGestureContext.Provider>
  );
}

export function usePinchGestureContext() {
  const context = useContext(PinchGestureContext);
  if (context === undefined) {
    throw new Error('usePinchGestureContext must be used within a PinchGestureProvider');
  }
  return context.pinchGesture;
}
