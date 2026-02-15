'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector3 } from 'three';
import { useMemo } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { GAZE_RAY_LENGTH } from '@/lib/constants';

interface GazeRayContextType {
  gazeRay: Raycaster | null;
}

const GazeRayContext = createContext<GazeRayContextType | undefined>(undefined);

// Feature flag: Enable/disable gaze tracking
const ENABLE_GAZE_TRACKING = false;

export function GazeRayProvider({ children }: { children: ReactNode }) {
  const { camera } = useThree();
  const { gazeData } = useVision();

  // Temporarily disable gaze tracking - will re-enable after camera change
  const gazeRay = useMemo(() => {
    if (!ENABLE_GAZE_TRACKING) return null;
    if (!gazeData || !camera) return null;

    // Create ray from camera position in the direction of gaze
    const origin = new Vector3().setFromMatrixPosition(camera.matrixWorld);
    const direction = gazeData.direction.clone();
    
    // Transform direction to world space
    direction.transformDirection(camera.matrixWorld);
    direction.normalize();

    const raycaster = new Raycaster();
    raycaster.set(origin, direction);
    raycaster.far = GAZE_RAY_LENGTH;

    return raycaster;
  }, [gazeData, camera]);

  return (
    <GazeRayContext.Provider value={{ gazeRay }}>
      {children}
    </GazeRayContext.Provider>
  );
}

export function useGazeRay() {
  const context = useContext(GazeRayContext);
  if (context === undefined) {
    throw new Error('useGazeRay must be used within GazeRayProvider');
  }
  return context.gazeRay;
}
