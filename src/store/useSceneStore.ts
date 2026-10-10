import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * High-frequency scene state (camera, hover) kept apart from the main app store,
 * so wheel-zooming or moving the mouse only re-renders the few components that care.
 */
interface SceneState {
  /** Camera altitude in globe radii (globe.gl pointOfView altitude) */
  cameraAltitude: number;
  /** User multiplier for sphere size */
  sphereScale: number;
  hoverId: number | null;
  hoverX: number;
  hoverY: number;
  /** Imperative camera control, registered by useGlobe */
  setCameraAltitudeOnGlobe: ((altitude: number) => void) | null;

  setCameraAltitude: (altitude: number) => void;
  setSphereScale: (scale: number) => void;
  setHover: (id: number | null, x?: number, y?: number) => void;
  registerCameraControl: (fn: ((altitude: number) => void) | null) => void;
}

export const MIN_CAMERA_ALTITUDE = 0.05;
export const MAX_CAMERA_ALTITUDE = 8;

export const useSceneStore = create<SceneState>()(
  persist(
    (set) => ({
      cameraAltitude: 2.5,
      sphereScale: 1,
      hoverId: null,
      hoverX: 0,
      hoverY: 0,
      setCameraAltitudeOnGlobe: null,

      setCameraAltitude: (cameraAltitude) => set({ cameraAltitude }),
      setSphereScale: (sphereScale) => set({ sphereScale }),
      setHover: (hoverId, hoverX = 0, hoverY = 0) => set({ hoverId, hoverX, hoverY }),
      registerCameraControl: (fn) => set({ setCameraAltitudeOnGlobe: fn }),
    }),
    {
      name: 'spacex-orbital-scene',
      partialize: (s) => ({ sphereScale: s.sphereScale }),
    }
  )
);
