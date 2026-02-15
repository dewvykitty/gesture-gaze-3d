import { Vector3 } from 'three';

export interface GazeData {
  direction: Vector3;
  confidence: number;
  headRotation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  eyeCenter?: { x: number; y: number; z: number };
  leftEyeCenter?: { x: number; y: number; z: number };
  rightEyeCenter?: { x: number; y: number; z: number };
  // Store full face landmarks for advanced visualization
  faceLandmarks?: Array<{ x: number; y: number; z: number }>;
}

export interface GazeRay {
  origin: Vector3;
  direction: Vector3;
}
