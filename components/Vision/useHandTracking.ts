'use client';

import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { HandData, HandLandmark } from '@/types/hand';
import { HAND_MODEL_COMPLEXITY, HAND_MIN_DETECTION_CONFIDENCE, HAND_MIN_TRACKING_CONFIDENCE } from '@/lib/constants';

export function useHandTracking(videoElement: HTMLVideoElement | null, maxHands: number = 1) {
  const [handData, setHandData] = useState<HandData[]>([]);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const isInitializingRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    // Cleanup function
    const cleanup = () => {
      // Stop camera first
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
        cameraRef.current = null;
      }
      
      // Close hands instance - set to null FIRST to prevent new operations
      if (handsRef.current) {
        try {
          const handsInstance = handsRef.current;
          // Set ref to null immediately to prevent new operations
          handsRef.current = null;
          // Then close the instance
          handsInstance.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      
      // Clear hand data
      setHandData([]);
      isInitializingRef.current = false;
    };

    // Cleanup existing instance first
    cleanup();

    // Wait longer to ensure WASM is fully released before creating new instance
    const initTimeout = setTimeout(() => {
      if (isInitializingRef.current) return;
      if (!videoElement) return;
      
      isInitializingRef.current = true;

      try {
        const hands = new Hands({
          locateFile: (file) => {
            // Return the file path directly - MediaPipe will handle it
            const baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';
            // Remove any leading slashes
            const cleanFile = file.startsWith('/') ? file.slice(1) : file;
            return `${baseUrl}/${cleanFile}`;
          },
        });

        // Use model complexity 0 for both modes to avoid asset loading issues
        // Complexity 0 is faster and more stable
        hands.setOptions({
          maxNumHands: maxHands,
          modelComplexity: 0, // Always use 0 for stability
          minDetectionConfidence: HAND_MIN_DETECTION_CONFIDENCE,
          minTrackingConfidence: HAND_MIN_TRACKING_CONFIDENCE,
        });

        // Throttle state updates to reduce memory usage
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 33; // ~30 FPS (33ms)

        hands.onResults((results) => {
          // Check if instance is still valid before processing results
          if (handsRef.current !== hands) return;
          
          // Throttle updates
          const now = Date.now();
          if (now - lastUpdateTime < UPDATE_INTERVAL) {
            return;
          }
          lastUpdateTime = now;
          
          try {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              const handsData: HandData[] = results.multiHandLandmarks.map((landmarks, index) => {
                const handLandmarks = landmarks.map((landmark) => ({
                  x: landmark.x,
                  y: landmark.y,
                  z: landmark.z,
                })) as HandLandmark[];

                // Get handedness from MediaPipe results
                const handednessInfo = results.multiHandedness[index];
                let handedness: 'Left' | 'Right' = 'Right'; // Default fallback
                
                // Detect handedness from thumb position
                // For left hand: thumb is on the right side (higher x value)
                // For right hand: thumb is on the left side (lower x value)
                const detectHandednessFromThumb = (landmarks: HandLandmark[]): 'Left' | 'Right' => {
                  if (landmarks.length < 21) return 'Right';
                  
                  const WRIST = 0;
                  const THUMB_TIP = 4;
                  const THUMB_MCP = 2;
                  const INDEX_MCP = 5;
                  const PINKY_MCP = 17;
                  
                  const thumbTip = landmarks[THUMB_TIP];
                  const thumbMcp = landmarks[THUMB_MCP];
                  const indexMcp = landmarks[INDEX_MCP];
                  const pinkyMcp = landmarks[PINKY_MCP];
                  
                  // Calculate palm center (average of MCP joints)
                  const palmCenterX = (indexMcp.x + pinkyMcp.x) / 2;
                  
                  // For left hand: thumb is to the right of palm center (thumb.x > palmCenterX)
                  // For right hand: thumb is to the left of palm center (thumb.x < palmCenterX)
                  // But we need to account for the fact that MediaPipe coordinates are from camera's perspective
                  // In MediaPipe: left hand's thumb is on the right side (higher x), right hand's thumb is on the left side (lower x)
                  
                  // Check if thumb is to the right of palm center
                  const thumbIsRightOfPalm = thumbTip.x > palmCenterX;
                  
                  // Left hand: thumb is on the right side (thumb.x > palmCenterX)
                  // Right hand: thumb is on the left side (thumb.x < palmCenterX)
                  return thumbIsRightOfPalm ? 'Left' : 'Right';
                };
                
                // First try MediaPipe's handedness detection
                if (handednessInfo) {
                  const handednessAny = handednessInfo as any;
                  const displayName = handednessAny.displayName;
                  
                  if (displayName === 'Left' || displayName === 'Right') {
                    handedness = displayName;
                  } else {
                    // Fallback: try categoryName
                    const categoryName = handednessAny.categoryName;
                    if (categoryName === 'LEFT' || categoryName === 'RIGHT') {
                      handedness = categoryName === 'LEFT' ? 'Left' : 'Right';
                    } else {
                      // Use thumb position to detect handedness
                      handedness = detectHandednessFromThumb(handLandmarks);
                    }
                  }
                } else {
                  // No handedness info from MediaPipe, use thumb position
                  handedness = detectHandednessFromThumb(handLandmarks);
                }
                
                // Verify with thumb position (double-check)
                const thumbBasedHandedness = detectHandednessFromThumb(handLandmarks);
                // If MediaPipe and thumb-based detection disagree, prefer thumb-based (more reliable)
                if (handedness !== thumbBasedHandedness) {
                  // Use thumb-based detection as it's more accurate
                  handedness = thumbBasedHandedness;
                }
                
                const confidence = handednessInfo?.score || 0;

                return {
                  landmarks: handLandmarks,
                  confidence,
                  handedness,
                  // Don't store raw landmarks to save memory - only store when needed for drawing
                } as HandData;
              });

              // Filter out duplicate hands (same handedness) - keep the one with higher confidence
              const filteredHands: HandData[] = [];
              const seenHandedness = new Set<'Left' | 'Right'>();
              
              // Sort by confidence (highest first) to prioritize better detections
              const sortedHands = [...handsData].sort((a, b) => b.confidence - a.confidence);
              
              for (const hand of sortedHands) {
                if (!seenHandedness.has(hand.handedness)) {
                  seenHandedness.add(hand.handedness);
                  filteredHands.push(hand);
                }
              }

              setHandData(filteredHands);
            } else {
              setHandData([]);
            }
          } catch (e) {
            // Ignore errors in results processing
            setHandData([]);
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

            // Check if instance is still valid before sending
            const currentHands = handsRef.current;
            if (currentHands && videoElement && videoElement.readyState >= 2) {
              try {
                // Double check that hands instance is still valid
                if (handsRef.current === currentHands) {
                  await currentHands.send({ image: videoElement });
                }
              } catch (e: any) {
                // Silently ignore all errors - instance might be closing or deleted
                // This includes 'deleted', 'undefined', 'buffer' errors
                if (e?.message && 
                    !e.message.includes('deleted') && 
                    !e.message.includes('undefined') &&
                    !e.message.includes('buffer') &&
                    !e.message.includes('Cannot read properties')) {
                  // Only log unexpected errors
                  console.warn('Error sending frame:', e);
                }
              }
            }
          },
          width: 640, // Reduce resolution to save memory
          height: 480,
        });

        camera.start();
        handsRef.current = hands;
        cameraRef.current = camera;
        isInitializingRef.current = false;
      } catch (error) {
        console.error('Error initializing hand tracking:', error);
        isInitializingRef.current = false;
        setHandData([]);
      }
    }, 1000); // Increased delay to ensure WASM is fully released

    cleanupTimeoutRef.current = initTimeout;

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      cleanup();
    };
  }, [videoElement, maxHands]);

  return handData;
}
