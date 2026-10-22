/**
 * Build-time stand-in for `three/webgpu` and `three/tsl` (aliased in vite.config.ts).
 *
 * three-globe / three-render-objects import the WebGPU renderer statically, which drags
 * ~800 KB of WebGPU/TSL code into the bundle. This app always renders with WebGL and never
 * uses the GPU heatmap layer, so these entry points are never reached at runtime.
 */
const unsupported = (name: string) =>
  class {
    constructor() {
      throw new Error(`${name} is not available: this build renders with WebGL only.`);
    }
  };

export const WebGPURenderer = unsupported('WebGPURenderer');
export const StorageInstancedBufferAttribute = unsupported('StorageInstancedBufferAttribute');
