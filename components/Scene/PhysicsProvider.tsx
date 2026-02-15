'use client';

import React, { ReactNode } from 'react';
import { Physics } from '@react-three/cannon';

interface PhysicsProviderProps {
  children: ReactNode;
}

export function PhysicsProvider({ children }: PhysicsProviderProps) {
  return (
    <Physics
      gravity={[0, -9.81, 0]} // Earth gravity
      defaultContactMaterial={{
        friction: 0.4,
        restitution: 0.3, // Bounciness
      }}
    >
      {children}
    </Physics>
  );
}
