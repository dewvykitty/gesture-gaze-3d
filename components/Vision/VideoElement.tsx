'use client';

import React from 'react';
import { useVision } from './VisionProvider';

export function VideoElement() {
  const { videoRef } = useVision();

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
