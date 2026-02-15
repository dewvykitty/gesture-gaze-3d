'use client';

import React, { useState, useEffect } from 'react';
import { savePrimaryHandPreference, loadPrimaryHandPreference, PrimaryHandPreference } from '@/lib/storage';

export function PrimaryHandSettings() {
  const [preference, setPreference] = useState<PrimaryHandPreference>('auto');

  useEffect(() => {
    setPreference(loadPrimaryHandPreference());
  }, []);

  const handleChange = (newPreference: PrimaryHandPreference) => {
    setPreference(newPreference);
    savePrimaryHandPreference(newPreference);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        มือหลัก (Pointer)
      </label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="primaryHand"
            value="auto"
            checked={preference === 'auto'}
            onChange={() => handleChange('auto')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-400">อัตโนมัติ (มือแรกที่ตรวจจับได้)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="primaryHand"
            value="left"
            checked={preference === 'left'}
            onChange={() => handleChange('left')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-400">มือซ้าย (Pointer)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="primaryHand"
            value="right"
            checked={preference === 'right'}
            onChange={() => handleChange('right')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-400">มือขวา (Pointer)</span>
        </label>
        <p className="text-xs text-gray-500 mt-2">
          {preference === 'auto' && 'ใช้มือแรกที่ตรวจจับได้เป็น pointer'}
          {preference === 'left' && 'มือซ้ายเป็น pointer, มือขวาใช้กำมือเพื่อคลิก'}
          {preference === 'right' && 'มือขวาเป็น pointer, มือซ้ายใช้กำมือเพื่อคลิก'}
        </p>
      </div>
    </div>
  );
}
