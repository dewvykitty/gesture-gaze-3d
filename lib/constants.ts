// Pinch detection thresholds
export const PINCH_DISTANCE_THRESHOLD = 0.05; // Normalized distance
export const PINCH_STRENGTH_SMOOTHING = 0.1;

// Gaze detection
export const GAZE_CONFIDENCE_THRESHOLD = 0.5;
export const GAZE_RAY_LENGTH = 10;

// Interaction
export const HOVER_DISTANCE = 2;
export const GRAB_SMOOTHING = 0.15;
export const RELEASE_THRESHOLD = 0.1;

// Animation
export const LERP_FACTOR = 0.1;
export const GLOW_INTENSITY = 1.5;
export const GLOW_RADIUS = 0.3;

// MediaPipe
export const HAND_MODEL_COMPLEXITY = 1;
export const HAND_MIN_DETECTION_CONFIDENCE = 0.5;
export const HAND_MIN_TRACKING_CONFIDENCE = 0.5;

// TensorFlow.js Face Mesh
export const FACE_MESH_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';

// Debug
export const DEBUG_MODE = typeof window !== 'undefined' 
  ? new URLSearchParams(window.location.search).get('debug') === 'true'
  : false;
