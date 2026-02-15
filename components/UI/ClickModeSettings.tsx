'use client';

import React, { useState, useEffect } from 'react';
import { saveClickMode, loadClickMode, ClickMode } from '@/lib/storage';

export function ClickModeSettings() {
  const [clickMode, setClickMode] = useState<ClickMode>(() => loadClickMode());

  useEffect(() => {
    // Load from storage on mount
    setClickMode(loadClickMode());
  }, []);

  const handleModeChange = (mode: ClickMode) => {
    setClickMode(mode);
    saveClickMode(mode);
  };

  return (
    <div className="bg-black/90 text-white p-4 rounded-lg text-sm border border-gray-700 shadow-2xl min-w-[200px] mb-4">
      <h3 className="font-bold text-base mb-3">โหมดการคลิก</h3>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="clickMode"
            value="pinch"
            checked={clickMode === 'pinch'}
            onChange={() => handleModeChange('pinch')}
            className="w-4 h-4 text-blue-500"
          />
          <span className={clickMode === 'pinch' ? 'text-blue-400 font-semibold' : 'text-gray-400'}>
            👆 Pinch (นิ้วชี้+โป้ง)
          </span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="clickMode"
            value="fist"
            checked={clickMode === 'fist'}
            onChange={() => handleModeChange('fist')}
            className="w-4 h-4 text-blue-500"
          />
          <span className={clickMode === 'fist' ? 'text-blue-400 font-semibold' : 'text-gray-400'}>
            ✊ Fist (กำมือ)
          </span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="clickMode"
            value="both"
            checked={clickMode === 'both'}
            onChange={() => handleModeChange('both')}
            className="w-4 h-4 text-blue-500"
          />
          <span className={clickMode === 'both' ? 'text-blue-400 font-semibold' : 'text-gray-400'}>
            🔄 ทั้งสองแบบ
          </span>
        </label>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
        <div>โหมดปัจจุบัน: <span className="text-blue-400 font-semibold">
          {clickMode === 'pinch' ? 'Pinch' : clickMode === 'fist' ? 'Fist' : 'Both'}
        </span></div>
      </div>
    </div>
  );
}
