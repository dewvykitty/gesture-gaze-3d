/**
 * Generate and play a click sound using Web Audio API
 */
export function playClickSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Click sound: short, high-pitched beep
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';

    // Envelope: quick attack, quick decay
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05); // Decay
    gainNode.gain.setValueAtTime(0, now + 0.1); // Release

    oscillator.start(now);
    oscillator.stop(now + 0.1);

    // Cleanup
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Could not play click sound:', error);
  }
}

/**
 * Generate and play a release sound (softer than click)
 */
export function playReleaseSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Release sound: softer, lower-pitched
    oscillator.frequency.value = 600; // Frequency in Hz
    oscillator.type = 'sine';

    // Envelope: quick attack, quick decay
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08); // Decay
    gainNode.gain.setValueAtTime(0, now + 0.12); // Release

    oscillator.start(now);
    oscillator.stop(now + 0.12);

    // Cleanup
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Could not play release sound:', error);
  }
}
