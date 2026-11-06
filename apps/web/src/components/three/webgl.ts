let cached: boolean | undefined;

export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== undefined) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    cached = false;
  }
  return cached;
}
