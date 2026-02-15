'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { getFingerStatus } from '@/lib/math/fingerDetection';

// Helper function to draw a finger
function drawFinger(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }>,
  indices: number[],
  color: string,
  lineWidth: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  
  for (let i = 0; i < indices.length - 1; i++) {
    const start = landmarks[indices[i]];
    const end = landmarks[indices[i + 1]];
    
    if (i === 0) {
      ctx.moveTo(start.x, start.y);
    }
    ctx.lineTo(end.x, end.y);
  }
  
  ctx.stroke();
  
  // Draw joints as circles
  ctx.fillStyle = color;
  for (let i = 1; i < indices.length; i++) {
    const point = landmarks[indices[i]];
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function HandPreview() {
  const { videoRef, handData, gazeData, isReady } = useVision();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate finger status for first hand (if available)
  const fingerStatus = useMemo(() => {
    if (!handData || handData.length === 0 || handData[0].landmarks.length < 21) {
      return null;
    }
    return getFingerStatus(handData[0].landmarks);
  }, [handData]);

  useEffect(() => {
    if (!isReady || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    updateCanvasSize();
    video.addEventListener('loadedmetadata', updateCanvasSize);

    let animationFrameId: number | null = null;
    let lastDrawTime = 0;
    const TARGET_FPS = 30; // Limit to 30 FPS to reduce CPU/RAM usage
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const draw = (timestamp: number) => {
      if (!ctx || !video || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Throttle drawing to target FPS
      const elapsed = timestamp - lastDrawTime;
      if (elapsed < FRAME_INTERVAL) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = timestamp;

      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw hand skeletons for all detected hands
      if (handData && handData.length > 0) {
        handData.forEach((hand, handIndex) => {
          if (hand.landmarks.length === 0) return;

          ctx.save();
          ctx.scale(-1, 1); // Mirror horizontally
          ctx.translate(-canvas.width, 0);

          // Convert normalized coordinates to canvas coordinates
          const landmarks = hand.landmarks.map((landmark) => ({
            x: landmark.x * canvas.width,
            y: landmark.y * canvas.height,
          }));

          // Different color schemes for each hand
          const handColorSchemes = [
            {
              thumb: '#FF6B6B',    // Red
              index: '#4ECDC4',     // Cyan/Blue
              middle: '#45B7D1',    // Blue
              ring: '#96CEB4',      // Green
              pinky: '#FFEAA7',      // Yellow
            },
            {
              thumb: '#FF8E8E',    // Light Red
              index: '#6ED4D4',     // Light Cyan
              middle: '#6BC5E0',    // Light Blue
              ring: '#B4E4C4',      // Light Green
              pinky: '#FFF2B7',     // Light Yellow
            },
          ];

          const fingerColors = handColorSchemes[handIndex % handColorSchemes.length];

          // Draw each finger with different colors
          // Thumb (0-4)
          drawFinger(ctx, landmarks, [0, 1, 2, 3, 4], fingerColors.thumb, 4);
          
          // Index finger (5-8)
          drawFinger(ctx, landmarks, [0, 5, 6, 7, 8], fingerColors.index, 4);
          
          // Middle finger (9-12)
          drawFinger(ctx, landmarks, [0, 9, 10, 11, 12], fingerColors.middle, 4);
          
          // Ring finger (13-16)
          drawFinger(ctx, landmarks, [0, 13, 14, 15, 16], fingerColors.ring, 4);
          
          // Pinky (17-20)
          drawFinger(ctx, landmarks, [0, 17, 18, 19, 20], fingerColors.pinky, 4);

          // Draw palm connections
          ctx.strokeStyle = handIndex === 0 ? '#FFFFFF' : '#CCCCCC';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(landmarks[0].x, landmarks[0].y);
          ctx.lineTo(landmarks[5].x, landmarks[5].y);
          ctx.lineTo(landmarks[9].x, landmarks[9].y);
          ctx.lineTo(landmarks[13].x, landmarks[13].y);
          ctx.lineTo(landmarks[17].x, landmarks[17].y);
          ctx.lineTo(landmarks[0].x, landmarks[0].y);
          ctx.stroke();

          ctx.restore();
        });
      }


      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isReady, videoRef, handData, gazeData]);

  if (!isReady) return null;

  const hasHand = handData && handData.length > 0;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/90 rounded-lg overflow-hidden shadow-2xl border border-gray-700">
      <div className="px-3 py-1 bg-gray-800 text-white text-xs font-semibold flex items-center justify-between">
        <span>Hand & Gaze Preview</span>
        <div className="flex gap-2">
          {hasHand && (
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">
              {handData.length} Hand{handData.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="relative bg-black">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: '320px',
            height: '240px',
            objectFit: 'contain',
          }}
        />
        {!hasHand && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/50 text-sm">Waiting for hand...</span>
          </div>
        )}
      </div>
    </div>
  );
}
