'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { useBox } from '@react-three/cannon';
import { useInteractionContext } from '@/components/Interaction/InteractionContext';
import { LERP_FACTOR, GLOW_INTENSITY, GLOW_RADIUS } from '@/lib/constants';
import { lerp } from '@/lib/math/vectorUtils';

interface InteractiveObjectProps {
  position: [number, number, number];
  color?: string;
}

export function InteractiveObject({ position, color = '#4a90e2' }: InteractiveObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const { registerObject, unregisterObject, hoveredObject, grabbedObject } = useInteractionContext();
  
  // Physics body
  const [ref, api] = useBox(() => ({
    mass: 1, // Weight of the object
    position: position,
    args: [1, 1, 1], // Box size
    material: {
      friction: 0.4,
      restitution: 0.3, // Bounciness
    },
  }));
  
  // Sync mesh ref with physics body ref and store API for grab controller
  useEffect(() => {
    if (ref.current) {
      meshRef.current = ref.current as Mesh;
      // Store physics API in userData so grab controller can access it
      (ref.current as any).userData.physicsApi = api;
    }
  }, [ref, api]);

  // Register/unregister object
  useEffect(() => {
    if (meshRef.current) {
      registerObject(meshRef.current);
      return () => {
        unregisterObject(meshRef.current!);
      };
    }
  }, [registerObject, unregisterObject]);

  // Update hover state
  useEffect(() => {
    if (meshRef.current) {
      const isCurrentlyHovered = hoveredObject === meshRef.current;
      setIsHovered(isCurrentlyHovered);
    }
  }, [hoveredObject]);

  // Animate glow effect
  useFrame(() => {
    if (!meshRef.current) return;

    const targetGlow = isHovered ? GLOW_INTENSITY : 0;
    const newGlow = lerp(glowIntensity, targetGlow, 0.1);
    setGlowIntensity(newGlow);

    // Scale effect on hover
    const targetScale = isHovered ? 1.1 : 1.0;
    const currentScale = meshRef.current.scale.x;
    const newScale = lerp(currentScale, targetScale, LERP_FACTOR);
    meshRef.current.scale.set(newScale, newScale, newScale);
  });

  const isGrabbed = meshRef.current && grabbedObject === meshRef.current;
  
  // Disable physics when grabbed (kinematic mode)
  useEffect(() => {
    if (isGrabbed) {
      api.mass.set(0); // Make it kinematic (no physics)
      api.velocity.set(0, 0, 0); // Stop any movement
      api.angularVelocity.set(0, 0, 0); // Stop rotation
    } else {
      api.mass.set(1); // Re-enable physics
      // When released, apply a small downward force to make it fall naturally
      api.velocity.set(0, -0.5, 0);
    }
  }, [isGrabbed, api]);

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glowIntensity * 0.3}
        metalness={0.8}
        roughness={0.2}
      />
      {/* Glow effect using a larger transparent mesh */}
      {isHovered && (
        <mesh>
          <boxGeometry args={[1 + GLOW_RADIUS, 1 + GLOW_RADIUS, 1 + GLOW_RADIUS]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={glowIntensity * 0.2}
            emissive={color}
            emissiveIntensity={glowIntensity}
          />
        </mesh>
      )}
    </mesh>
  );
}
