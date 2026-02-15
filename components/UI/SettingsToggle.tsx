'use client';

import React, { useState } from 'react';

interface SettingsToggleProps {
  children: React.ReactNode;
  label?: string;
}

export function SettingsToggle({ children, label = 'ตั้งค่า' }: SettingsToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-[60] bg-black/90 text-white p-3 rounded-lg border border-gray-700 shadow-2xl hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
        aria-label={label}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-sm font-semibold">{label}</span>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 z-[55] max-h-[calc(100vh-80px)] overflow-y-auto">
          {children}
        </div>
      )}
    </>
  );
}
