'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { ExponentialSmoother } from '@/lib/math/smoothing';
import { loadCalibration, CalibrationData } from './GazeCalibration';

// Bilinear interpolation to map gaze coordinates to screen coordinates
// Uses 4 calibration points (corners) for accurate mapping
// This uses inverse bilinear interpolation to find the screen position
function bilinearInterpolation(
  gazeX: number,
  gazeY: number,
  topLeft: { x: number; y: number; screenX: number; screenY: number },
  topRight: { x: number; y: number; screenX: number; screenY: number },
  bottomRight: { x: number; y: number; screenX: number; screenY: number },
  bottomLeft: { x: number; y: number; screenX: number; screenY: number }
): { x: number; y: number } {
  // Use perspective transformation (simplified bilinear mapping)
  // Map from gaze space (4 corners) to screen space (unit square)
  
  // Calculate the bounding box in gaze space
  const minX = Math.min(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
  const maxX = Math.max(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
  const minY = Math.min(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y);
  const maxY = Math.max(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y);

  // Normalize gaze coordinates to [0, 1] within the bounding box
  let normalizedX = (gazeX - minX) / (maxX - minX + 0.0001);
  let normalizedY = (gazeY - minY) / (maxY - minY + 0.0001);

  // Clamp to [0, 1]
  normalizedX = Math.max(0, Math.min(1, normalizedX));
  normalizedY = Math.max(0, Math.min(1, normalizedY));

  // Use bilinear interpolation to map to screen coordinates
  // Interpolate horizontally first (top and bottom edges)
  const topScreenX = topLeft.screenX + (topRight.screenX - topLeft.screenX) * normalizedX;
  const topScreenY = topLeft.screenY + (topRight.screenY - topLeft.screenY) * normalizedX;
  
  const bottomScreenX = bottomLeft.screenX + (bottomRight.screenX - bottomLeft.screenX) * normalizedX;
  const bottomScreenY = bottomLeft.screenY + (bottomRight.screenY - bottomLeft.screenY) * normalizedX;

  // Then interpolate vertically
  const screenX = topScreenX + (bottomScreenX - topScreenX) * normalizedY;
  const screenY = topScreenY + (bottomScreenY - topScreenY) * normalizedY;

  return { x: screenX, y: screenY };
}

export function GazeCursor() {
  const { gazeData } = useVision();
  const [cursorPosition, setCursorPosition] = useState({ x: 0.5, y: 0.5 });
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const xSmootherRef = useRef<ExponentialSmoother | null>(null);
  const ySmootherRef = useRef<ExponentialSmoother | null>(null);

  // Load calibration on mount
  useEffect(() => {
    const cal = loadCalibration();
    setCalibration(cal);
  }, []);

  // Listen for calibration updates
  useEffect(() => {
    const handleStorageChange = () => {
      const cal = loadCalibration();
      setCalibration(cal);
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check periodically in case calibration happens in same window
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!gazeData) return;
    
    // Don't show cursor if not calibrated
    if (!calibration) return;

    // Initialize smoothers with faster response (higher alpha = less smoothing)
    if (!xSmootherRef.current) {
      xSmootherRef.current = new ExponentialSmoother(0, 0.4); // Increased from 0.15 to 0.4
      ySmootherRef.current = new ExponentialSmoother(0, 0.4);
    }

    const gazeX = gazeData.direction.x;
    const gazeY = gazeData.direction.y;

    let targetX: number;
    let targetY: number;

    if (calibration) {
      // Use bilinear interpolation with 4 calibration points for accurate mapping
      if (calibration.corners && calibration.corners.length === 4) {
        // Use bilinear interpolation for more accurate mapping
        const corners = calibration.corners;
        
        // Find which quadrant the current gaze point is in
        // Use bilinear interpolation to map gaze to screen coordinates
        const result = bilinearInterpolation(
          gazeX,
          gazeY,
          corners[0], // Top Left
          corners[1], // Top Right
          corners[2], // Bottom Right
          corners[3]  // Bottom Left
        );
        
        targetX = result.x;
        targetY = result.y;
      } else {
        // Fallback: use linear mapping if corners not available
        const rangeX = calibration.maxX - calibration.minX;
        const rangeY = calibration.maxY - calibration.minY;

        if (rangeX > 0 && rangeY > 0) {
          // Normalize gaze values to [0, 1] range
          const normalizedX = (gazeX - calibration.minX) / rangeX;
          const normalizedY = (gazeY - calibration.minY) / rangeY;

          // Clamp to [0, 1]
          targetX = Math.max(0, Math.min(1, normalizedX));
          targetY = Math.max(0, Math.min(1, normalizedY));
        } else {
          // Fallback if calibration range is invalid
          targetX = 0.5;
          targetY = 0.5;
        }
      }
    } else {
      // Fallback: use simple mapping without calibration
      const sensitivity = 0.5; // Increased sensitivity for faster response
      targetX = 0.5 + gazeX * sensitivity;
      targetY = 0.5 - gazeY * sensitivity; // Flip Y axis
    }

    // Clamp to screen bounds
    const clampedX = Math.max(0, Math.min(1, targetX));
    const clampedY = Math.max(0, Math.min(1, targetY));

    // Smooth the movement (with faster response)
    const smoothedX = xSmootherRef.current.update(clampedX);
    const smoothedY = ySmootherRef.current.update(clampedY);

    setCursorPosition({ x: smoothedX, y: smoothedY });
  }, [gazeData, calibration]);

  // Don't show cursor if not calibrated or no gaze data
  if (!gazeData || !calibration) return null;

  // Convert normalized coordinates to pixel coordinates
  const pixelX = cursorPosition.x * window.innerWidth;
  const pixelY = cursorPosition.y * window.innerHeight;

  return (
    <div
      className="fixed pointer-events-none z-[100] transition-opacity duration-200"
      style={{
        left: `${pixelX}px`,
        top: `${pixelY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Crosshair cursor */}
      <div className="relative">
        {/* Outer ring with glow */}
        <div
          className="absolute rounded-full border-2 border-cyan-400"
          style={{
            width: '24px',
            height: '24px',
            left: '-12px',
            top: '-12px',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.6), 0 0 20px rgba(0, 255, 255, 0.3)',
          }}
        />
        
        {/* Inner dot */}
        <div
          className="absolute rounded-full bg-cyan-400"
          style={{
            width: '8px',
            height: '8px',
            left: '-4px',
            top: '-4px',
            boxShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
          }}
        />

        {/* Crosshair lines */}
        <div
          className="absolute bg-cyan-400"
          style={{
            width: '2px',
            height: '20px',
            left: '-1px',
            top: '-10px',
            opacity: 0.6,
            boxShadow: '0 0 4px rgba(0, 255, 255, 0.5)',
          }}
        />
        <div
          className="absolute bg-cyan-400"
          style={{
            width: '20px',
            height: '2px',
            left: '-10px',
            top: '-1px',
            opacity: 0.6,
            boxShadow: '0 0 4px rgba(0, 255, 255, 0.5)',
          }}
        />
      </div>
    </div>
  );
}
