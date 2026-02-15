'use client';

import React, { useState, useEffect } from 'react';
import { saveFingerSettings, loadFingerSettings, FingerSettings, FingerType } from '@/lib/storage';

const FINGER_OPTIONS: { value: FingerType; label: string; icon: string }[] = [
  { value: 'index', label: 'นิ้วชี้', icon: '👆' },
  { value: 'middle', label: 'นิ้วกลาง', icon: '👉' },
  { value: 'ring', label: 'นิ้วนาง', icon: '✋' },
  { value: 'pinky', label: 'นิ้วก้อย', icon: '🤏' },
  { value: 'thumb', label: 'นิ้วโป้ง', icon: '👍' },
];

export function FingerSettings() {
  const [settings, setSettings] = useState<FingerSettings>(() => loadFingerSettings());

  useEffect(() => {
    // Load from storage on mount
    setSettings(loadFingerSettings());
  }, []);

  const handlePrimaryChange = (finger: FingerType) => {
    const newSettings = { ...settings, primary: finger };
    setSettings(newSettings);
    saveFingerSettings(newSettings);
  };

  const handleSecondaryChange = (finger: FingerType) => {
    const newSettings = { ...settings, secondary: finger };
    setSettings(newSettings);
    saveFingerSettings(newSettings);
  };

  return (
    <div className="bg-black/90 text-white p-4 rounded-lg text-sm border border-gray-700 shadow-2xl min-w-[240px]">
      <h3 className="font-bold text-base mb-3">ตั้งค่านิ้ว</h3>
      
      <div className="space-y-4">
        {/* Primary Finger */}
        <div>
          <label className="text-gray-400 text-xs mb-2 block">นิ้วหลัก (Pointer):</label>
          <div className="space-y-1.5">
            {FINGER_OPTIONS.map((finger) => (
              <label key={finger.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="primaryFinger"
                  value={finger.value}
                  checked={settings.primary === finger.value}
                  onChange={() => handlePrimaryChange(finger.value)}
                  className="w-4 h-4 text-blue-500"
                />
                <span className={settings.primary === finger.value ? 'text-blue-400 font-semibold' : 'text-gray-400'}>
                  {finger.icon} {finger.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Secondary Finger */}
        <div className="pt-2 border-t border-gray-700">
          <label className="text-gray-400 text-xs mb-2 block">นิ้วรอง (Action):</label>
          <div className="space-y-1.5">
            {FINGER_OPTIONS.map((finger) => (
              <label key={finger.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="secondaryFinger"
                  value={finger.value}
                  checked={settings.secondary === finger.value}
                  onChange={() => handleSecondaryChange(finger.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className={settings.secondary === finger.value ? 'text-orange-400 font-semibold' : 'text-gray-400'}>
                  {finger.icon} {finger.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
        <div>หลัก: <span className="text-blue-400 font-semibold">
          {FINGER_OPTIONS.find(f => f.value === settings.primary)?.label}
        </span></div>
        <div>รอง: <span className="text-orange-400 font-semibold">
          {FINGER_OPTIONS.find(f => f.value === settings.secondary)?.label}
        </span></div>
      </div>
    </div>
  );
}
