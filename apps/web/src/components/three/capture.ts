/** Lets UI code outside the <Canvas> grab a PNG of the current 3D view (for share cards). */
type CaptureFn = () => string | null;
let current: CaptureFn | null = null;

export function registerCapture(fn: CaptureFn | null) {
  current = fn;
}

export function captureScene(): string | null {
  try {
    return current ? current() : null;
  } catch {
    return null;
  }
}
