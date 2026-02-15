import { HandLandmark } from '@/types/hand';

// MediaPipe hand landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

/**
 * Check if a finger is extended (up)
 */
function isFingerExtended(
  landmarks: HandLandmark[],
  tipIndex: number,
  pipIndex: number,
  mcpIndex: number
): boolean {
  if (landmarks.length < 21) return false;

  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  const mcp = landmarks[mcpIndex];

  // Finger is extended if tip is above PIP joint
  return tip.y < pip.y;
}

/**
 * Check if thumb is extended
 */
function isThumbExtended(landmarks: HandLandmark[]): boolean {
  if (landmarks.length < 21) return false;

  const thumbTip = landmarks[THUMB_TIP];
  const thumbIP = landmarks[THUMB_IP];
  const thumbMCP = landmarks[THUMB_MCP];
  const wrist = landmarks[WRIST];

  // Calculate distances
  const tipToIP = Math.sqrt(
    Math.pow(thumbTip.x - thumbIP.x, 2) +
    Math.pow(thumbTip.y - thumbIP.y, 2) +
    Math.pow(thumbTip.z - thumbIP.z, 2)
  );
  const IPToMCP = Math.sqrt(
    Math.pow(thumbIP.x - thumbMCP.x, 2) +
    Math.pow(thumbIP.y - thumbMCP.y, 2) +
    Math.pow(thumbIP.z - thumbMCP.z, 2)
  );
  const tipToWrist = Math.sqrt(
    Math.pow(thumbTip.x - wrist.x, 2) +
    Math.pow(thumbTip.y - wrist.y, 2) +
    Math.pow(thumbTip.z - wrist.z, 2)
  );
  const IPToWrist = Math.sqrt(
    Math.pow(thumbIP.x - wrist.x, 2) +
    Math.pow(thumbIP.y - wrist.y, 2) +
    Math.pow(thumbIP.z - wrist.z, 2)
  );

  // Thumb is extended if:
  // 1. Tip is further from wrist than IP joint (tip is extended outward)
  // 2. Tip to IP distance is greater than IP to MCP distance (thumb is straightened)
  return tipToWrist > IPToWrist && tipToIP > IPToMCP * 0.8;
}

/**
 * Count extended fingers
 */
export function countExtendedFingers(landmarks: HandLandmark[]): number {
  if (landmarks.length < 21) return 0;

  let count = 0;

  // Thumb
  if (isThumbExtended(landmarks)) count++;

  // Index finger
  if (isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP)) count++;

  // Middle finger
  if (isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP)) count++;

  // Ring finger
  if (isFingerExtended(landmarks, RING_TIP, RING_PIP, RING_MCP)) count++;

  // Pinky
  if (isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP)) count++;

  return count;
}

/**
 * Get detailed finger status
 */
export interface FingerStatus {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  total: number;
}

export function getFingerStatus(landmarks: HandLandmark[]): FingerStatus {
  if (landmarks.length < 21) {
    return {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      total: 0,
    };
  }

  const thumb = isThumbExtended(landmarks);
  const index = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middle = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ring = isFingerExtended(landmarks, RING_TIP, RING_PIP, RING_MCP);
  const pinky = isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP);

  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    total: [thumb, index, middle, ring, pinky].filter(Boolean).length,
  };
}

/**
 * Check if hand is in fist position (all fingers closed)
 */
export function isFist(landmarks: HandLandmark[]): boolean {
  if (landmarks.length < 21) return false;
  
  const fingerStatus = getFingerStatus(landmarks);
  
  // Fist: all fingers (including thumb) are closed
  // For thumb, we check if it's NOT extended
  // Allow some tolerance - if 4 or more fingers are closed, consider it a fist
  const closedFingers = [
    !fingerStatus.thumb,
    !fingerStatus.index,
    !fingerStatus.middle,
    !fingerStatus.ring,
    !fingerStatus.pinky,
  ].filter(Boolean).length;
  
  // Require at least 4 out of 5 fingers to be closed (more lenient)
  // This handles cases where thumb might be slightly extended
  const isFistStrict = closedFingers === 5; // All closed
  const isFistLenient = closedFingers >= 4 && fingerStatus.total <= 1; // 4+ closed, max 1 extended
  
  return isFistStrict || isFistLenient;
}

/**
 * Calculate center of palm (average of MCP joints)
 */
export function getPalmCenter(landmarks: HandLandmark[]): { x: number; y: number; z: number } | null {
  if (landmarks.length < 21) return null;
  
  const indexMcp = landmarks[INDEX_MCP];
  const middleMcp = landmarks[MIDDLE_MCP];
  const ringMcp = landmarks[RING_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];
  
  // Average of MCP joints gives center of palm
  return {
    x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
    y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
    z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
  };
}
