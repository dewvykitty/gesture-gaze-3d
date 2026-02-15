'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Lighting } from './Lighting';
import { InteractiveObject } from './InteractiveObject';
import { PhysicsProvider } from './PhysicsProvider';
import { useGrabController } from '@/components/Interaction/useGrabController';
import { InteractionContextProvider } from '@/components/Interaction/InteractionContext';
import { GazeRayProvider } from '@/components/Interaction/GazeRayProvider';
import { InteractionProvider } from '@/components/Interaction/InteractionProvider';
import { usePlane } from '@react-three/cannon';

function GroundPlane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -2, 0],
    args: [20, 20],
    type: 'Static', // Ground doesn't move
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

function SceneContent() {
  const { grabbedObject } = useGrabController();

  // Disable orbit controls when grabbing
  const enableOrbit = !grabbedObject;

  return (
    <>
      <Lighting />
      
      {/* Ground plane with physics */}
      <GroundPlane />

      {/* Interactive cube */}
      <InteractiveObject position={[0, 0, 0]} color="#4a90e2" />

      {/* Additional decorative objects */}
      <InteractiveObject position={[-3, 0, -2]} color="#e24a4a" />
      <InteractiveObject position={[3, 0, -2]} color="#4ae24a" />

      <OrbitControls
        enablePan={enableOrbit}
        enableZoom={enableOrbit}
        enableRotate={enableOrbit}
        minDistance={5}
        maxDistance={15}
      />

      <Environment preset="night" />
    </>
  );
}

export function CanvasScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 10], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a0a' }}
    >
      <GazeRayProvider>
        <InteractionProvider>
          <InteractionContextProvider>
            <PhysicsProvider>
              <Suspense fallback={null}>
                <SceneContent />
              </Suspense>
            </PhysicsProvider>
          </InteractionContextProvider>
        </InteractionProvider>
      </GazeRayProvider>
    </Canvas>
  );
}
