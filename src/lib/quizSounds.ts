let ctx: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    unlocked = false;
  }
  return ctx;
}

/**
 * Must be called from a direct user gesture (click/tap) handler
 * to unlock audio on iOS Safari.
 */
export function unlockAudio() {
  if (unlocked) return;
  try {
    const audioCtx = getAudioContext();
    // iOS requires playing a silent buffer inside a user gesture
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    unlocked = true;
  } catch (e) {
    console.warn('Audio unlock failed:', e);
  }
}

// Auto-unlock on first user interaction
if (typeof window !== 'undefined') {
  const handler = () => {
    unlockAudio();
    window.removeEventListener('touchstart', handler, true);
    window.removeEventListener('touchend', handler, true);
    window.removeEventListener('click', handler, true);
  };
  window.addEventListener('touchstart', handler, true);
  window.addEventListener('touchend', handler, true);
  window.addEventListener('click', handler, true);
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const audioCtx = getAudioContext();
    
    // Crucial: Resume context if suspended (common on iOS/Chrome)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

export function playCorrectSound() {
  playTone(523, 0.15, 'sine', 0.25);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.25), 100);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 200);
}

export function playWrongSound() {
  playTone(300, 0.2, 'square', 0.15);
  setTimeout(() => playTone(250, 0.35, 'square', 0.15), 150);
}

export function playRevealSound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'sine', 0.2), i * 120);
  });
  setTimeout(() => playTone(1047, 0.6, 'triangle', 0.3), 500);
}
