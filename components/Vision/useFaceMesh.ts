'use client';

import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { GazeData } from '@/types/gaze';
import { Vector3 } from 'three';

// Face Mesh landmark indices for eyes
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const LEFT_EYE_LEFT = 33;
const LEFT_EYE_RIGHT = 133;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const RIGHT_EYE_LEFT = 362;
const RIGHT_EYE_RIGHT = 263;
const NOSE_TIP = 1;
const FOREHEAD = 10;

export function useFaceMesh(videoElement: HTMLVideoElement | null) {
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        // Base URL for Face Mesh assets
        const baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';
        
        // Remove any leading slashes from file path
        const cleanFile = file.startsWith('/') ? file.slice(1) : file;
        
        // Ensure we're using face_mesh assets, not hands assets
        // If file contains 'hands', replace with 'face_mesh'
        const correctedFile = cleanFile.includes('hands') 
          ? cleanFile.replace(/hands/g, 'face_mesh')
          : cleanFile;
        
        return `${baseUrl}/${correctedFile}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false, // Disable refine for better performance
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Throttle state updates to reduce memory usage
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 33; // ~30 FPS (33ms)

    faceMesh.onResults((results) => {
      // Throttle updates
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_INTERVAL) {
        return;
      }
      lastUpdateTime = now;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Calculate eye centers
        const leftEyeCenter = {
          x: (landmarks[LEFT_EYE_LEFT].x + landmarks[LEFT_EYE_RIGHT].x) / 2,
          y: (landmarks[LEFT_EYE_TOP].y + landmarks[LEFT_EYE_BOTTOM].y) / 2,
          z: (landmarks[LEFT_EYE_LEFT].z + landmarks[LEFT_EYE_RIGHT].z) / 2,
        };

        const rightEyeCenter = {
          x: (landmarks[RIGHT_EYE_LEFT].x + landmarks[RIGHT_EYE_RIGHT].x) / 2,
          y: (landmarks[RIGHT_EYE_TOP].y + landmarks[RIGHT_EYE_BOTTOM].y) / 2,
          z: (landmarks[RIGHT_EYE_LEFT].z + landmarks[RIGHT_EYE_RIGHT].z) / 2,
        };

        // Calculate center between eyes (reference point)
        const eyeCenter = {
          x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
          y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
          z: (leftEyeCenter.z + rightEyeCenter.z) / 2,
        };

        // Calculate eye gaze direction using eye corner positions
        // When eyes move, the relative positions of eye corners change
        // We use the asymmetry of eye corners to detect eye movement
        
        // Calculate eye width and height for each eye
        const leftEyeWidth = Math.abs(landmarks[LEFT_EYE_RIGHT].x - landmarks[LEFT_EYE_LEFT].x);
        const leftEyeHeight = Math.abs(landmarks[LEFT_EYE_BOTTOM].y - landmarks[LEFT_EYE_TOP].y);
        const rightEyeWidth = Math.abs(landmarks[RIGHT_EYE_RIGHT].x - landmarks[RIGHT_EYE_LEFT].x);
        const rightEyeHeight = Math.abs(landmarks[RIGHT_EYE_BOTTOM].y - landmarks[RIGHT_EYE_TOP].y);

        // Calculate eye aspect ratio (EAR) - when eyes move, the visible area changes
        const leftEAR = leftEyeHeight / (leftEyeWidth + 0.0001);
        const rightEAR = rightEyeHeight / (rightEyeWidth + 0.0001);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Calculate eye position relative to face center
        // When eyes look left/right, the eye center moves relative to face center
        const faceCenter = {
          x: (landmarks[LEFT_EYE_LEFT].x + landmarks[RIGHT_EYE_RIGHT].x) / 2,
          y: eyeCenter.y,
          z: eyeCenter.z,
        };

        // Calculate gaze direction from eye center deviation from face center
        // This represents where the eyes are looking
        const eyeGazeX = (leftEyeCenter.x + rightEyeCenter.x) / 2 - faceCenter.x;
        const eyeGazeY = eyeCenter.y - faceCenter.y;
        
        // Use eye corner asymmetry to detect vertical gaze
        // When looking up/down, top and bottom corners move differently
        const leftEyeVerticalOffset = (landmarks[LEFT_EYE_TOP].y + landmarks[LEFT_EYE_BOTTOM].y) / 2 - leftEyeCenter.y;
        const rightEyeVerticalOffset = (landmarks[RIGHT_EYE_TOP].y + landmarks[RIGHT_EYE_BOTTOM].y) / 2 - rightEyeCenter.y;
        const eyeGazeZ = (leftEyeVerticalOffset + rightEyeVerticalOffset) / 2;

        // Create gaze direction vector
        // Scale for sensitivity (eye movements are smaller than head movements)
        const sensitivity = 8.0; // Higher sensitivity for eye tracking
        const gazeDirection = {
          x: eyeGazeX * sensitivity,
          y: eyeGazeY * sensitivity,
          z: eyeGazeZ * sensitivity * 0.5, // Less sensitive for depth
        };

        // Normalize direction vector
        const length = Math.sqrt(
          gazeDirection.x ** 2 + gazeDirection.y ** 2 + gazeDirection.z ** 2
        );

        if (length > 0) {
          const direction = new Vector3(
            gazeDirection.x / length,
            -gazeDirection.y / length, // Flip Y for screen coordinates
            -gazeDirection.z / length
          );

          // Normalize the final direction
          direction.normalize();

          // Calculate pitch and yaw from eye gaze direction
          const yaw = Math.atan2(direction.x, -direction.z);
          const pitch = Math.asin(direction.y);

          // Store landmarks only when calibration is active (checked via ref)
          // This is set by GazeCalibration component when needed
          const shouldStoreLandmarks = (window as any).__gazeCalibrationActive === true;

          setGazeData({
            direction,
            confidence: 0.9,
            headRotation: {
              pitch,
              yaw,
              roll: 0,
            },
            // Store eye positions for visualization
            eyeCenter: eyeCenter,
            leftEyeCenter: leftEyeCenter,
            rightEyeCenter: rightEyeCenter,
            // Only store landmarks when calibration is active to save memory
            faceLandmarks: shouldStoreLandmarks ? landmarks.map((lm) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
            })) : undefined,
          } as GazeData & {
            eyeCenter: { x: number; y: number; z: number };
            leftEyeCenter: { x: number; y: number; z: number };
            rightEyeCenter: { x: number; y: number; z: number };
            faceLandmarks?: Array<{ x: number; y: number; z: number }>;
          });
        }
      } else {
        setGazeData(null);
      }
    });

    // Throttle frame processing to reduce CPU/RAM usage
    let lastFrameTime = 0;
    const FRAME_THROTTLE = 33; // ~30 FPS (33ms between frames)

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        const now = Date.now();
        if (now - lastFrameTime < FRAME_THROTTLE) {
          return; // Skip frame if too soon
        }
        lastFrameTime = now;

        if (faceMeshRef.current && videoElement) {
          try {
            await faceMeshRef.current.send({ image: videoElement });
          } catch (e) {
            // Silently ignore errors
          }
        }
      },
      width: 640, // Reduce resolution to save memory
      height: 480,
    });

    camera.start();
    faceMeshRef.current = faceMesh;
    cameraRef.current = camera;

    return () => {
      try {
        if (cameraRef.current) {
          cameraRef.current.stop();
        }
        if (faceMeshRef.current) {
          faceMeshRef.current.close();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      faceMeshRef.current = null;
      cameraRef.current = null;
    };
  }, [videoElement]);

  return gazeData;
}
