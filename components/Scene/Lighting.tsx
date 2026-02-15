'use client';

import React from 'react';
import { useThree } from '@react-three/fiber';

export function Lighting() {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.4} />
      
      {/* Main directional light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Fill light for softer shadows */}
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      
      {/* Point light for accent */}
      <pointLight position={[0, 10, 0]} intensity={0.5} distance={20} />
    </>
  );
}
