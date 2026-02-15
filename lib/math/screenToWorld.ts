import { Vector3, Camera, Raycaster } from 'three';

/**
 * Convert normalized screen coordinates (0-1) to NDC (-1 to 1)
 */
export function screenToNDC(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: screenX * 2 - 1,
    y: -(screenY * 2 - 1), // Flip Y axis
  };
}

/**
 * Create a raycaster from screen position
 */
export function createRaycasterFromScreen(
  screenX: number,
  screenY: number,
  camera: Camera
): Raycaster {
  const ndc = screenToNDC(screenX, screenY);
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector3(ndc.x, ndc.y, 0), camera);
  return raycaster;
}

/**
 * Convert screen position to world position on a plane
 */
export function screenToWorldPlane(
  screenX: number,
  screenY: number,
  camera: Camera,
  planeZ: number = 0
): Vector3 {
  const raycaster = createRaycasterFromScreen(screenX, screenY, camera);
  
  // Create a plane at the specified Z
  const planeNormal = new Vector3(0, 0, 1);
  const planePoint = new Vector3(0, 0, planeZ);
  
  // Calculate intersection
  const direction = raycaster.ray.direction;
  const origin = raycaster.ray.origin;
  
  const denom = planeNormal.dot(direction);
  if (Math.abs(denom) < 0.0001) {
    // Ray is parallel to plane
    return new Vector3(0, 0, planeZ);
  }
  
  const t = planePoint.clone().sub(origin).dot(planeNormal) / denom;
  return origin.clone().add(direction.multiplyScalar(t));
}
