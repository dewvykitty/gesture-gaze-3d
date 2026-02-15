export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  confidence: number;
  handedness: 'Left' | 'Right';
}

export interface PinchGesture {
  isPinching: boolean;
  pinchPosition: { x: number; y: number };
  pinchStrength: number;
}
