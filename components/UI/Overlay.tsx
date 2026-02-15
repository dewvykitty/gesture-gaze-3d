'use client';

import React from 'react';
import { useVision } from '@/components/Vision/VisionProvider';

export function Overlay() {
  const { isReady, error, permissionState, retry } = useVision();

  if (isReady) return null;

  const handleRetry = async () => {
    try {
      await retry();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) {
      return {
        name: 'Chrome',
        steps: [
          'Click the lock icon (🔒) or camera icon (📷) in the address bar',
          'Find "Camera" in the permissions list',
          'Change it from "Block" to "Allow"',
          'Click "Retry" button below',
        ],
      };
    } else if (userAgent.includes('firefox')) {
      return {
        name: 'Firefox',
        steps: [
          'Click the shield icon in the address bar',
          'Find "Camera" permission',
          'Change it to "Allow"',
          'Click "Retry" button below',
        ],
      };
    } else if (userAgent.includes('edge')) {
      return {
        name: 'Edge',
        steps: [
          'Click the lock icon (🔒) in the address bar',
          'Find "Camera" in the permissions',
          'Change it to "Allow"',
          'Click "Retry" button below',
        ],
      };
    } else {
      return {
        name: 'Browser',
        steps: [
          'Look for camera or permission icon in the address bar',
          'Allow camera access',
          'Click "Retry" button below',
        ],
      };
    }
  };

  const instructions = getBrowserInstructions();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="text-center text-white max-w-md mx-4">
        {error ? (
          <>
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-4">
              <h2 className="text-2xl font-bold mb-4 text-red-400">Camera Error</h2>
              <p className="text-gray-300 mb-4 text-sm">{error}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2 font-semibold">
                How to fix in {instructions.name}:
              </p>
              <ol className="text-left text-sm text-gray-400 space-y-2 list-decimal list-inside">
                {instructions.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            {permissionState === 'denied' && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-300">
                  ⚠️ Camera permission is blocked. You may need to reset it in browser settings:
                </p>
                <p className="text-xs text-yellow-400 mt-1">
                  {instructions.name === 'Chrome' && 'chrome://settings/content/camera'}
                  {instructions.name === 'Edge' && 'edge://settings/content/camera'}
                  {instructions.name === 'Firefox' && 'about:preferences#privacy → Permissions → Camera'}
                </p>
              </div>
            )}
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              Request Camera Access
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Initializing Camera</h2>
            <p className="text-gray-400">Please allow camera access when prompted...</p>
          </>
        )}
      </div>
    </div>
  );
}
