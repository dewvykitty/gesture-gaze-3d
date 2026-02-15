'use client';

import React, { useState, useEffect } from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { usePinchGestureContext } from '@/components/Interaction/PinchGestureProvider';
import { DEBUG_MODE } from '@/lib/constants';

export function DebugPanel() {
  const [fps, setFps] = useState(0);
  const [showPanel, setShowPanel] = useState(DEBUG_MODE);
  const { handData, gazeData, isReady, error } = useVision();
  const pinchGesture = usePinchGestureContext();

  // FPS counter
  useEffect(() => {
    if (!showPanel) return;

    let frames = 0;
    let lastTime = performance.now();

    const countFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(frames);
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFPS);
    };

    countFPS();
  }, [showPanel]);

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed top-4 right-4 z-50 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-50 hover:opacity-100"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs font-mono text-xs max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Debug Panel</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="text-gray-400">FPS:</span> {fps}
        </div>
        
        <div>
          <span className="text-gray-400">Webcam:</span>{' '}
          <span className={isReady ? 'text-green-400' : 'text-red-400'}>
            {isReady ? 'Ready' : error || 'Not Ready'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Hand:</span>{' '}
          {handData && handData.length > 0 ? (
            <span className="text-green-400">
              {handData.length} Hand{handData.length > 1 ? 's' : ''} ({handData.map(h => h.handedness).join(', ')})
            </span>
          ) : (
            <span className="text-red-400">Not Detected</span>
          )}
        </div>
        
        <div>
          <span className="text-gray-400">Gaze:</span>{' '}
          {gazeData ? (
            <span className="text-green-400">
              Active ({Math.round(gazeData.confidence * 100)}%)
            </span>
          ) : (
            <span className="text-red-400">Not Detected</span>
          )}
        </div>
        
        <div>
          <span className="text-gray-400">Pinch:</span>{' '}
          <span className={pinchGesture.isPinching ? 'text-green-400' : 'text-gray-400'}>
            {pinchGesture.isPinching ? 'Active' : 'Inactive'}
          </span>
          {' '}
          <span className="text-gray-500">
            ({Math.round(pinchGesture.pinchStrength * 100)}%)
          </span>
        </div>
        
        {gazeData && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-gray-400">Gaze Direction:</div>
            <div>
              X: {gazeData.direction.x.toFixed(2)}, Y: {gazeData.direction.y.toFixed(2)}, Z: {gazeData.direction.z.toFixed(2)}
            </div>
          </div>
        )}
        
        {pinchGesture.isPinching && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-gray-400">Pinch Position:</div>
            <div>
              X: {pinchGesture.pinchPosition.x.toFixed(2)}, Y: {pinchGesture.pinchPosition.y.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
