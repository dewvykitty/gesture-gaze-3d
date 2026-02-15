import { Vector2, Vector3 } from 'three';

/**
 * Calculate distance between two 2D points
 */
export function distance2D(a: Vector2 | { x: number; y: number }, b: Vector2 | { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two 3D points
 */
export function distance3D(a: Vector3 | { x: number; y: number; z: number }, b: Vector3 | { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a value to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Vector3 linear interpolation
 */
export function lerpVector3(start: Vector3, end: Vector3, factor: number): Vector3 {
  return new Vector3(
    lerp(start.x, end.x, factor),
    lerp(start.y, end.y, factor),
    lerp(start.z, end.z, factor)
  );
}
