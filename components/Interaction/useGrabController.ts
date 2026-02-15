'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { InteractionState } from '@/types/interaction';
import { PinchGesture } from '@/types/hand';
import { screenToWorldPlane, createRaycasterFromScreen } from '@/lib/math/screenToWorld';
import { lerpVector3 } from '@/lib/math/vectorUtils';
import { GRAB_SMOOTHING } from '@/lib/constants';
import { useInteractionContext } from './InteractionContext';
import { useInteraction } from './InteractionProvider';
import { playClickSound, playReleaseSound } from '@/lib/audio/clickSound';

export function useGrabController() {
  const { camera } = useThree();
  const { pinchGesture, clickGesture, gazeRay } = useInteraction();
  const { getObjects, hoveredObject, grabbedObject, setHoveredObject, setGrabbedObject } = useInteractionContext();
  const stateRef = useRef<InteractionState>('IDLE');
  const grabOffsetRef = useRef<Vector3 | null>(null);
  const targetPositionRef = useRef<Vector3 | null>(null);
  const initialHandPositionRef = useRef<{ x: number; y: number; z: number } | null>(null); // Store initial hand position when clicked
  const initialObjectPositionRef = useRef<Vector3 | null>(null); // Store initial object position (X, Y, Z) when clicked
  const wasClickingRef = useRef(false);

  // Detect hover state using pointer position (index finger)
  useEffect(() => {
    if (stateRef.current === 'GRABBING') return;

    const interactiveObjects = getObjects();
    if (interactiveObjects.length === 0) {
      if (hoveredObject) {
        setHoveredObject(null);
        stateRef.current = 'IDLE';
      }
      return;
    }

    // Use click gesture position (index finger) for raycasting
    // clickPosition is already in screen coordinates (0-1)
    const pointerRay = createRaycasterFromScreen(
      clickGesture.clickPosition.x,
      clickGesture.clickPosition.y,
      camera
    );

    const intersects = pointerRay.intersectObjects(interactiveObjects, false);
    
    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      if (hoveredObject !== hitObject) {
        setHoveredObject(hitObject);
        stateRef.current = 'HOVER';
      }
    } else {
      if (hoveredObject) {
        setHoveredObject(null);
        stateRef.current = 'IDLE';
      }
    }
  }, [clickGesture.clickPosition, camera, getObjects, hoveredObject, setHoveredObject]);

  // Handle click detection (index + thumb)
  useEffect(() => {
    const isClicking = clickGesture.isClicking;
    const wasClicking = wasClickingRef.current;

    // Detect click: transition from not clicking to clicking
    if (isClicking && !wasClicking && hoveredObject) {
      // Click detected on hovered object
      stateRef.current = 'GRABBING';
      setGrabbedObject(hoveredObject);
      
      // Play click sound
      playClickSound();
      
      // Calculate offset from object center to click point
      const pointerRay = createRaycasterFromScreen(
        clickGesture.clickPosition.x,
        clickGesture.clickPosition.y,
        camera
      );
      
      const intersects = pointerRay.intersectObject(hoveredObject, false);
      if (intersects.length > 0) {
        const intersection = intersects[0];
        grabOffsetRef.current = intersection.point.clone().sub(hoveredObject.position);
      } else {
        grabOffsetRef.current = new Vector3(0, 0, 0);
      }
      
      // Store initial hand position when clicked
      initialHandPositionRef.current = {
        x: clickGesture.clickPosition.x,
        y: clickGesture.clickPosition.y,
        z: clickGesture.clickPosition.z !== undefined ? clickGesture.clickPosition.z : 0,
      };
      // Store initial object position (X, Y, Z) when clicked - this will be the base for all calculations
      initialObjectPositionRef.current = hoveredObject.position.clone();
      targetPositionRef.current = hoveredObject.position.clone();
    } else if (!isClicking && wasClicking && stateRef.current === 'GRABBING') {
      // Release: transition from clicking to not clicking
      stateRef.current = 'RELEASE';
      setGrabbedObject(null);
      grabOffsetRef.current = null;
      targetPositionRef.current = null;
      initialHandPositionRef.current = null;
      initialObjectPositionRef.current = null;
      
      // Play release sound
      playReleaseSound();
      
      // Transition back to IDLE after a brief moment
      setTimeout(() => {
        stateRef.current = 'IDLE';
      }, 100);
    }

    wasClickingRef.current = isClicking;
  }, [clickGesture.isClicking, clickGesture.clickPosition, hoveredObject, camera, setGrabbedObject]);

  // Update grabbed object position
  useFrame(() => {
    if (stateRef.current !== 'GRABBING' || !grabbedObject || !clickGesture.isClicking) return;

    // Use initial object position (when clicked) as base for all calculations
    const initialObjectPos = initialObjectPositionRef.current;
    if (!initialObjectPos) return; // Safety check
    
    const initialHandPos = initialHandPositionRef.current || { x: 0.5, y: 0.5, z: 0 };
    
    // Calculate relative hand movement (delta from initial hand position)
    const handXDelta = clickGesture.clickPosition.x - initialHandPos.x;
    const handYDelta = clickGesture.clickPosition.y - initialHandPos.y;
    const handZDelta = (clickGesture.clickPosition.z !== undefined ? clickGesture.clickPosition.z : 0) - initialHandPos.z;
    
    // Z starts from initial object Z, then add relative hand Z change
    const targetZ = initialObjectPos.z + handZDelta;
    
    // Convert current hand position to world coordinates at the target Z plane
    const currentHandWorldPos = screenToWorldPlane(
      clickGesture.clickPosition.x,
      clickGesture.clickPosition.y,
      camera,
      targetZ
    );
    
    // Convert initial hand position to world coordinates at initial object Z
    const initialHandWorldPos = screenToWorldPlane(
      initialHandPos.x,
      initialHandPos.y,
      camera,
      initialObjectPos.z
    );
    
    // Calculate relative movement in world space (from initial hand position to current hand position)
    const worldDeltaX = currentHandWorldPos.x - initialHandWorldPos.x;
    const worldDeltaY = currentHandWorldPos.y - initialHandWorldPos.y;
    
    // Final position: X, Y, Z start from initial object position (when clicked), then add relative movement
    const finalWorldPos = new Vector3(
      initialObjectPos.x + worldDeltaX,
      initialObjectPos.y + worldDeltaY,
      targetZ
    );

    // Smooth the position update
    if (targetPositionRef.current) {
      const distance = targetPositionRef.current.distanceTo(finalWorldPos);
      // If position changed too much (> 5 units), it's likely a mode switch
      // In that case, update immediately to prevent object from jumping
      if (distance > 5) {
        targetPositionRef.current = finalWorldPos.clone();
      } else {
        targetPositionRef.current = lerpVector3(
          targetPositionRef.current,
          finalWorldPos,
          GRAB_SMOOTHING
        );
      }
    } else {
      targetPositionRef.current = finalWorldPos.clone();
    }

    // Apply offset (if any)
    const finalPosition = targetPositionRef.current.clone();
    if (grabOffsetRef.current) {
      finalPosition.sub(grabOffsetRef.current);
    }

    // For physics objects, we need to set position directly via physics API
    // The physics API is stored in the userData or we can access it via the ref
    // Since @react-three/cannon stores API in userData, we check there
    const physicsApi = (grabbedObject as any).userData?.physicsApi;
    
    if (physicsApi) {
      // Use physics API to set position directly (this will override physics temporarily)
      physicsApi.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
      physicsApi.velocity.set(0, 0, 0); // Stop any physics movement
    } else {
      // Fallback: directly set position for non-physics objects
      grabbedObject.position.lerp(finalPosition, GRAB_SMOOTHING);
    }
  });

  return {
    state: stateRef.current,
    hoveredObject,
    grabbedObject,
  };
}
