'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useWebcam } from './useWebcam';
import { useHandTracking } from './useHandTracking';
import { useFaceMesh } from './useFaceMesh';
import { HandData } from '@/types/hand';
import { GazeData } from '@/types/gaze';
import { loadMaxHands, saveMaxHands } from '@/lib/storage';

interface VisionContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
  permissionState?: PermissionState | null;
  retry?: () => void;
  handData: HandData[];
  gazeData: GazeData | null;
  maxHands: number;
  setMaxHands: (maxHands: number) => void;
}

const VisionContext = createContext<VisionContextType | undefined>(undefined);

export function VisionProvider({ children }: { children: ReactNode }) {
  const { videoRef, isReady, error, permissionState, retry } = useWebcam();
  const [maxHands, setMaxHands] = useState(() => loadMaxHands()); // Load from localStorage
  const handData = useHandTracking(videoRef.current, maxHands);
  const gazeData = useFaceMesh(videoRef.current); // Use Face Mesh for accurate eye tracking

  // Save to localStorage when maxHands changes
  useEffect(() => {
    saveMaxHands(maxHands);
  }, [maxHands]);

  const handleSetMaxHands = (newMaxHands: number) => {
    if (newMaxHands !== maxHands) {
      setMaxHands(newMaxHands);
      // Reload page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <VisionContext.Provider
      value={{
        videoRef,
        isReady,
        error,
        permissionState,
        retry,
        handData,
        gazeData,
        maxHands,
        setMaxHands: handleSetMaxHands,
      }}
    >
      {children}
    </VisionContext.Provider>
  );
}

export function useVision() {
  const context = useContext(VisionContext);
  if (context === undefined) {
    throw new Error('useVision must be used within a VisionProvider');
  }
  return context;
}
