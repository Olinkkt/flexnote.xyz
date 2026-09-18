// Mobile Haptic Feedback Helper
// Uses navigator.vibrate with safe feature-detection fallback

export function vibrateLight() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {}
}

export function vibrateSuccess() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 20]);
    }
  } catch {}
}

export function vibrateCombo() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 25, 20, 25, 35]);
    }
  } catch {}
}

export function vibrateError() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 50, 40]);
    }
  } catch {}
}
