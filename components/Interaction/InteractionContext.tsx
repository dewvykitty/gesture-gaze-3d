'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Object3D } from 'three';

interface InteractionContextType {
  registerObject: (obj: Object3D) => void;
  unregisterObject: (obj: Object3D) => void;
  getObjects: () => Object3D[];
  hoveredObject: Object3D | null;
  grabbedObject: Object3D | null;
  setHoveredObject: (obj: Object3D | null) => void;
  setGrabbedObject: (obj: Object3D | null) => void;
}

const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

export function InteractionContextProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<Set<Object3D>>(new Set());
  const [hoveredObject, setHoveredObject] = useState<Object3D | null>(null);
  const [grabbedObject, setGrabbedObject] = useState<Object3D | null>(null);

  const registerObject = useCallback((obj: Object3D) => {
    setObjects((prev) => new Set([...prev, obj]));
  }, []);

  const unregisterObject = useCallback((obj: Object3D) => {
    setObjects((prev) => {
      const next = new Set(prev);
      next.delete(obj);
      return next;
    });
  }, []);

  const getObjects = useCallback(() => {
    return Array.from(objects);
  }, [objects]);

  return (
    <InteractionContext.Provider
      value={{
        registerObject,
        unregisterObject,
        getObjects,
        hoveredObject,
        grabbedObject,
        setHoveredObject,
        setGrabbedObject,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteractionContext() {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteractionContext must be used within InteractionContextProvider');
  }
  return context;
}
