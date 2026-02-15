// Simple localStorage utilities for persisting settings

export function saveMaxHands(maxHands: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('maxHands', maxHands.toString());
  }
}

export function loadMaxHands(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('maxHands');
    return saved ? parseInt(saved, 10) : 1;
  }
  return 1;
}

export type ClickMode = 'pinch' | 'fist' | 'both';

export function saveClickMode(mode: ClickMode) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('clickMode', mode);
  }
}

export function loadClickMode(): ClickMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('clickMode') as ClickMode;
    return saved && ['pinch', 'fist', 'both'].includes(saved) ? saved : 'pinch';
  }
  return 'pinch';
}

export type FingerType = 'index' | 'middle' | 'ring' | 'pinky' | 'thumb';

export interface FingerSettings {
  primary: FingerType; // Main pointer finger
  secondary: FingerType; // Secondary action finger
}

export function saveFingerSettings(settings: FingerSettings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fingerSettings', JSON.stringify(settings));
  }
}

export function loadFingerSettings(): FingerSettings {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fingerSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved) as FingerSettings;
        // Validate
        const validFingers: FingerType[] = ['index', 'middle', 'ring', 'pinky', 'thumb'];
        if (validFingers.includes(settings.primary) && validFingers.includes(settings.secondary)) {
          return settings;
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }
  return { primary: 'index', secondary: 'thumb' };
}

export type PrimaryHandPreference = 'left' | 'right' | 'auto';

export function savePrimaryHandPreference(preference: PrimaryHandPreference) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('primaryHandPreference', preference);
  }
}

export function loadPrimaryHandPreference(): PrimaryHandPreference {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('primaryHandPreference') as PrimaryHandPreference;
    return saved && ['left', 'right', 'auto'].includes(saved) ? saved : 'auto';
  }
  return 'auto';
}
