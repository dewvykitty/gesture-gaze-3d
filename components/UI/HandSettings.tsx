'use client';

import React, { useState, useRef } from 'react';

interface HandSettingsProps {
  maxHands: number;
  onMaxHandsChange: (maxHands: number) => void;
}

export function HandSettings({ maxHands, onMaxHandsChange }: HandSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold transition-colors"
      >
        ⚙️ Settings
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-black/90 rounded-lg p-4 shadow-2xl border border-gray-700 min-w-[200px]">
          <div className="mb-4">
            <label className="text-white text-sm font-semibold block mb-2">
              Number of Hands
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (maxHands !== 1) {
                    setIsOpen(false);
                    onMaxHandsChange(1);
                  }
                }}
                className={`flex-1 px-3 py-2 rounded ${
                  maxHands === 1
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors`}
              >
                1 Hand
              </button>
              <button
                onClick={() => {
                  if (maxHands !== 2) {
                    setIsOpen(false);
                    onMaxHandsChange(2);
                  }
                }}
                className={`flex-1 px-3 py-2 rounded ${
                  maxHands === 2
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors`}
              >
                2 Hands
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {maxHands === 1 ? 'Faster performance' : 'Slower but supports both hands'}
            </p>
            <p className="text-yellow-400 text-xs mt-2">
              ⚠️ Changing mode requires page reload
            </p>
            <button
              onClick={() => {
                if (maxHands === 1) {
                  onMaxHandsChange(2);
                } else {
                  onMaxHandsChange(1);
                }
                // Reload page after a short delay to ensure clean state
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }}
              className="w-full mt-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-colors"
            >
              Apply & Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
