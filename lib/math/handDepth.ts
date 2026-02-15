import { HandLandmark } from '@/types/hand';

// MediaPipe hand landmark indices
const WRIST = 0;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const THUMB_MCP = 2;
const THUMB_TIP = 4;

/**
 * Calculate hand depth based on hand size and Z coordinate
 * Returns normalized depth (0 = far, 1 = near)
 */
export function calculateHandDepth(landmarks: HandLandmark[]): number {
  if (landmarks.length < 21) return 0.5; // Default middle depth

  // Method 1: Use hand size (distance from wrist to middle finger tip)
  // Larger hand = closer to camera
  const wrist = landmarks[WRIST];
  const middleTip = landmarks[MIDDLE_TIP];
  const handSize = Math.sqrt(
    Math.pow(middleTip.x - wrist.x, 2) +
    Math.pow(middleTip.y - wrist.y, 2) +
    Math.pow(middleTip.z - wrist.z, 2)
  );

  // Method 2: Use palm width (distance between index and pinky MCP)
  const indexMCP = landmarks[INDEX_MCP];
  const pinkyMCP = landmarks[17]; // PINKY_MCP
  const palmWidth = Math.sqrt(
    Math.pow(pinkyMCP.x - indexMCP.x, 2) +
    Math.pow(pinkyMCP.y - indexMCP.y, 2) +
    Math.pow(pinkyMCP.z - indexMCP.z, 2)
  );

  // Method 3: Use Z coordinate (relative depth from MediaPipe)
  // MediaPipe Z is relative depth, negative = closer
  const avgZ = landmarks.reduce((sum, lm) => sum + lm.z, 0) / landmarks.length;

  // Combine methods: normalize and average
  // Hand size: typical range 0.1-0.3 (normalized)
  // Palm width: typical range 0.05-0.15 (normalized)
  // Z coordinate: typical range -0.1 to 0.1
  
  // Normalize hand size (assume range 0.1-0.3)
  const normalizedSize = Math.max(0, Math.min(1, (handSize - 0.1) / 0.2));
  
  // Normalize palm width (assume range 0.05-0.15)
  const normalizedWidth = Math.max(0, Math.min(1, (palmWidth - 0.05) / 0.1));
  
  // Normalize Z (invert because negative Z = closer)
  const normalizedZ = Math.max(0, Math.min(1, (-avgZ + 0.1) / 0.2));

  // Weighted average: Z coordinate is most reliable
  const depth = normalizedZ * 0.5 + normalizedSize * 0.3 + normalizedWidth * 0.2;
  
  return Math.max(0, Math.min(1, depth));
}

/**
 * Calculate hand scale factor (for detecting hand expansion/contraction)
 * Returns scale factor (1.0 = normal, >1.0 = expanded, <1.0 = contracted)
 */
export function calculateHandScale(landmarks: HandLandmark[]): number {
  if (landmarks.length < 21) return 1.0;

  // Use distance from wrist to middle finger tip as base scale
  const wrist = landmarks[WRIST];
  const middleTip = landmarks[MIDDLE_TIP];
  const baseDistance = Math.sqrt(
    Math.pow(middleTip.x - wrist.x, 2) +
    Math.pow(middleTip.y - wrist.y, 2) +
    Math.pow(middleTip.z - wrist.z, 2)
  );

  // Typical distance is around 0.2-0.25 (normalized)
  // Use this as reference scale
  const referenceDistance = 0.225;
  const scale = baseDistance / referenceDistance;

  return Math.max(0.5, Math.min(2.0, scale)); // Clamp between 0.5x and 2x
}
