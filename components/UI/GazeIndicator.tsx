'use client';

import React from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { loadCalibration } from './GazeCalibration';

export function GazeIndicator() {
  const { gazeData } = useVision();
  const calibration = loadCalibration();

  // Only show if calibrated and gaze data is available
  if (!gazeData || !calibration) return null;

  // Show visual feedback that gaze tracking is active
  return (
    <div className="fixed top-4 left-4 z-50 bg-green-500/20 border border-green-500 rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      <span className="text-green-400 text-xs font-semibold">Gaze Tracking Active</span>
    </div>
  );
}
