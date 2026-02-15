'use client';

import React from 'react';
import { useVision } from '@/components/Vision/VisionProvider';
import { useClickGesture } from '@/components/Interaction/useClickGesture';
import { useThumbAction } from '@/components/Interaction/useThumbAction';
import { getFingerStatus, isFist } from '@/lib/math/fingerDetection';
import { loadClickMode, loadFingerSettings, loadPrimaryHandPreference, loadMaxHands } from '@/lib/storage';
// Note: InteractionContext is inside Canvas, so we'll create a separate context for status
// For now, we'll show finger status without interaction state

export function FingerStatusPanel() {
  const { handData } = useVision();
  const clickGesture = useClickGesture(handData);
  const thumbAction = useThumbAction(handData);
  // Note: hoveredObject and grabbedObject are inside Canvas context
  // We'll show finger status without interaction state for now

  // Get finger status
  const primaryHand = handData && handData.length > 0 ? handData[0] : null;
  const fingerStatus = primaryHand && primaryHand.landmarks.length >= 21
    ? getFingerStatus(primaryHand.landmarks)
    : null;
  
  // Load finger settings
  const fingerSettings = loadFingerSettings();
  
  // Get finger labels
  const getFingerLabel = (finger: string) => {
    const labels: Record<string, string> = {
      'thumb': 'นิ้วโป้ง',
      'index': 'นิ้วชี้',
      'middle': 'นิ้วกลาง',
      'ring': 'นิ้วนาง',
      'pinky': 'นิ้วก้อย',
    };
    return labels[finger] || finger;
  };
  
  const getFingerIcon = (finger: string) => {
    const icons: Record<string, string> = {
      'thumb': '👍',
      'index': '👆',
      'middle': '👉',
      'ring': '✋',
      'pinky': '🤏',
    };
    return icons[finger] || '👆';
  };

  if (!primaryHand || !fingerStatus) {
    return (
      <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-3 rounded-lg text-sm border border-gray-700">
        <div className="text-gray-400">รอการตรวจจับมือ...</div>
      </div>
    );
  }

  // Check if fist
  const isFisting = primaryHand && isFist(primaryHand.landmarks);
  const clickMode = loadClickMode();

  // Determine current action
  const getActionStatus = () => {
    if (clickGesture.isClicking) {
      if (isFisting && (clickMode === 'fist' || clickMode === 'both')) {
        return { text: 'กำลังคลิก (กำมือ)', color: 'text-green-400', icon: '✊' };
      }
      return { text: 'กำลังคลิก', color: 'text-green-400', icon: '👆' };
    }
    if (isFisting) {
      return { text: 'กำมือ', color: 'text-orange-400', icon: '✊' };
    }
    if (fingerStatus.index) {
      return { text: 'กำลังชี้', color: 'text-blue-400', icon: '👉' };
    }
    return { text: 'รอคำสั่ง', color: 'text-gray-400', icon: '✋' };
  };

  const actionStatus = getActionStatus();

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/90 text-white p-4 rounded-lg text-sm border border-gray-700 shadow-2xl min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{actionStatus.icon}</span>
        <h3 className="font-bold text-base">สถานะนิ้ว</h3>
      </div>

      <div className="space-y-2">
        {/* Main Action Status */}
        <div className="pb-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">การกระทำ:</span>
            <span className={`font-semibold ${actionStatus.color}`}>
              {actionStatus.text}
            </span>
          </div>
          {clickGesture.isClicking && (
            <div className="text-xs text-gray-500 mt-1">
              ความแรง: {Math.round(clickGesture.clickStrength * 100)}%
            </div>
          )}
        </div>

        {/* Primary Finger Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">{getFingerIcon(fingerSettings.primary)}</span>
            <span className="text-gray-400">นิ้วหลัก ({getFingerLabel(fingerSettings.primary)}):</span>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const isExtended = fingerStatus ? (fingerStatus[fingerSettings.primary as keyof typeof fingerStatus] as boolean) : false;
              return (
                <>
                  <span className={isExtended ? 'text-green-400' : 'text-gray-500'}>
                    {isExtended ? 'ยืดออก' : 'งอ'}
                  </span>
                  {clickGesture.isClicking && (
                    <span className="text-green-400 animate-pulse">●</span>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Secondary Finger Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-orange-400">{getFingerIcon(fingerSettings.secondary)}</span>
            <span className="text-gray-400">นิ้วรอง ({getFingerLabel(fingerSettings.secondary)}):</span>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const isExtended = fingerStatus ? (fingerStatus[fingerSettings.secondary as keyof typeof fingerStatus] as boolean) : false;
              return (
                <>
                  <span className={isExtended ? 'text-green-400' : 'text-gray-500'}>
                    {isExtended ? 'ยืดออก' : 'งอ'}
                  </span>
                  {clickGesture.isClicking && (
                    <span className="text-green-400 animate-pulse">●</span>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Fist Status */}
        {isFisting && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">กำมือ:</span>
              <span className="text-orange-400 font-semibold">
                ✓ กำลังกำมือ
              </span>
            </div>
          </div>
        )}

        {/* Click Status */}
        {clickGesture.isClicking && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">คลิก:</span>
              <span className="text-green-400 font-semibold animate-pulse">
                กำลังคลิก ({Math.round(clickGesture.clickStrength * 100)}%)
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              โหมด: {clickGesture.clickMode === 'pinch' ? 'Pinch' : clickGesture.clickMode === 'fist' ? 'Fist' : 'Both'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ตำแหน่ง: ({Math.round(clickGesture.clickPosition.x * 100) / 100}, {Math.round(clickGesture.clickPosition.y * 100) / 100})
            </div>
          </div>
        )}

        {/* Other Fingers */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-1">นิ้วอื่นๆ:</div>
          <div className="flex gap-3 text-xs">
            <div className={fingerStatus.middle ? 'text-green-400' : 'text-gray-600'}>
              กลาง: {fingerStatus.middle ? '✓' : '✗'}
            </div>
            <div className={fingerStatus.ring ? 'text-green-400' : 'text-gray-600'}>
              นาง: {fingerStatus.ring ? '✓' : '✗'}
            </div>
            <div className={fingerStatus.pinky ? 'text-green-400' : 'text-gray-600'}>
              ก้อย: {fingerStatus.pinky ? '✓' : '✗'}
            </div>
          </div>
        </div>

        {/* Hand Info */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">ข้อมูลมือ:</div>
          {handData && handData.length > 0 && (
            <div className="space-y-1">
              {handData.map((hand, index) => {
                const handName = hand.handedness === 'Left' ? 'มือซ้าย' : 'มือขวา';
                const isPointer = index === 0; // First hand is typically pointer
                const maxHands = loadMaxHands();
                const primaryHandPreference = loadPrimaryHandPreference();
                
                // Determine if this hand is pointer or click hand
                let handRole = '';
                if (maxHands === 2 && handData.length === 2) {
                  const leftHand = handData.find(h => h.handedness === 'Left');
                  const rightHand = handData.find(h => h.handedness === 'Right');
                  
                  if (primaryHandPreference === 'left' && hand.handedness === 'Left') {
                    handRole = ' (Pointer)';
                  } else if (primaryHandPreference === 'right' && hand.handedness === 'Right') {
                    handRole = ' (Pointer)';
                  } else if (primaryHandPreference === 'left' && hand.handedness === 'Right') {
                    handRole = ' (Click)';
                  } else if (primaryHandPreference === 'right' && hand.handedness === 'Left') {
                    handRole = ' (Click)';
                  } else if (primaryHandPreference === 'auto' && index === 0) {
                    handRole = ' (Pointer)';
                  } else if (primaryHandPreference === 'auto' && index === 1) {
                    handRole = ' (Click)';
                  }
                } else if (index === 0) {
                  handRole = ' (Pointer)';
                }
                
                return (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${hand.handedness === 'Left' ? 'text-blue-400' : 'text-green-400'}`}>
                        {handName}
                      </span>
                      {handRole && (
                        <span className="text-yellow-400 text-xs">
                          {handRole}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {Math.round(hand.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
