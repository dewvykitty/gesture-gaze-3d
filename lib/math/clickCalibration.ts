/**
 * Click calibration data
 * Stores thresholds and timing for click detection
 */
export interface ClickCalibrationData {
  pinchThreshold: number; // Distance threshold for pinch detection
  fistThreshold: number; // Threshold for fist detection (number of closed fingers)
  clickDelay: number; // Delay before registering click (ms)
  releaseDelay: number; // Delay before registering release (ms)
  timestamp: number;
}

const DEFAULT_PINCH_THRESHOLD = 0.05; // Default MediaPipe normalized distance
const DEFAULT_FIST_THRESHOLD = 0; // Default: all fingers must be closed (0 extended fingers)
const DEFAULT_CLICK_DELAY = 100; // 100ms delay before click
const DEFAULT_RELEASE_DELAY = 150; // 150ms delay before release (longer to prevent jitter)

/**
 * Save click calibration to localStorage
 */
export function saveClickCalibration(calibration: ClickCalibrationData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('clickCalibration', JSON.stringify(calibration));
  }
}

/**
 * Load click calibration from localStorage
 */
export function loadClickCalibration(): ClickCalibrationData {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('clickCalibration');
    if (saved) {
      try {
        const calibration = JSON.parse(saved) as ClickCalibrationData;
      // Validate calibration data
      if (
        typeof calibration.pinchThreshold === 'number' &&
        typeof calibration.fistThreshold === 'number' &&
        typeof calibration.clickDelay === 'number' &&
        typeof calibration.releaseDelay === 'number'
      ) {
        return calibration;
      }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }
  // Return default calibration
  return {
    pinchThreshold: DEFAULT_PINCH_THRESHOLD,
    fistThreshold: DEFAULT_FIST_THRESHOLD,
    clickDelay: DEFAULT_CLICK_DELAY,
    releaseDelay: DEFAULT_RELEASE_DELAY,
    timestamp: Date.now(),
  };
}

/**
 * Reset click calibration to defaults
 */
export function resetClickCalibration(): ClickCalibrationData {
  const defaultCalibration: ClickCalibrationData = {
    pinchThreshold: DEFAULT_PINCH_THRESHOLD,
    fistThreshold: DEFAULT_FIST_THRESHOLD,
    clickDelay: DEFAULT_CLICK_DELAY,
    releaseDelay: DEFAULT_RELEASE_DELAY,
    timestamp: Date.now(),
  };
  saveClickCalibration(defaultCalibration);
  return defaultCalibration;
}
