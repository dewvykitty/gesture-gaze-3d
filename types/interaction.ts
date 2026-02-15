import { Object3D } from 'three';

export type InteractionState = 'IDLE' | 'HOVER' | 'GRABBING' | 'RELEASE';

export interface InteractionContext {
  state: InteractionState;
  hoveredObject: Object3D | null;
  grabbedObject: Object3D | null;
  grabOffset: { x: number; y: number; z: number } | null;
}
