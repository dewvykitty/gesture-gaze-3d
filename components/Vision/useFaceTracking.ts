'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { GazeData } from '@/types/gaze';
import { Vector3 } from 'three';

// Simplified face tracking using head pose estimation
// For a production app, you'd use MediaPipe Face Mesh or a more sophisticated model
export function useFaceTracking(videoElement: HTMLVideoElement | null) {
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    // Create canvas for face detection
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    canvasRef.current = canvas;

    // Simplified head pose estimation
    // In a real implementation, you'd use MediaPipe Face Mesh or TensorFlow.js face detection
    const estimateHeadPose = () => {
      if (!ctx || !videoElement || videoElement.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(estimateHeadPose);
        return;
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Simplified: Use center of frame as reference
      // For demo purposes, we'll simulate head direction based on center
      // In production, use MediaPipe Face Mesh for accurate head pose
      // This creates a forward-looking gaze that can be adjusted by moving head
      const faceCenterX = canvas.width / 2;
      const faceCenterY = canvas.height / 2;
      
      // Normalize to -1 to 1 range (centered at 0)
      const normalizedX = 0; // Center of screen
      const normalizedY = 0; // Center of screen
      
      // Estimate gaze direction (simplified - forward-looking with subtle variation)
      // Yaw: horizontal rotation (-1 left, 1 right)
      // Pitch: vertical rotation (-1 up, 1 down)
      // For Phase A demo, we use a forward-looking direction
      // Phase B will add actual head tracking
      const yaw = normalizedX * 0.2; // Subtle horizontal variation
      const pitch = normalizedY * 0.15; // Subtle vertical variation
      
      // Create direction vector
      const direction = new Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        -Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();

      setGazeData({
        direction,
        confidence: 0.8, // Simplified confidence
        headRotation: {
          pitch,
          yaw,
          roll: 0,
        },
      });

      animationFrameRef.current = requestAnimationFrame(estimateHeadPose);
    };

    estimateHeadPose();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement]);

  return gazeData;
}
