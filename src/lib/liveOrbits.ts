/**
 * Latest propagation frame from the worker, kept outside React/zustand so the
 * render loop can read it every animation frame without triggering re-renders.
 */
export interface OrbitFrame {
  ids: Int32Array;
  /** [x, y, z, vx, vy, vz] per satellite, globe.gl scene units, velocity per simulated second */
  buf: Float32Array;
  simTime: number;
  speed: number;
  running: boolean;
  /** performance.now() when the frame arrived */
  receivedAt: number;
  /** noradId -> index into ids/buf */
  index: Map<number, number>;
}

let frame: OrbitFrame | null = null;
let version = 0;

export function setOrbitFrame(data: Omit<OrbitFrame, 'receivedAt' | 'index'>) {
  // Reuse the id index when the satellite set hasn't changed
  let index: Map<number, number>;
  if (frame && frame.ids.length === data.ids.length && frame.ids.every((id, i) => id === data.ids[i])) {
    index = frame.index;
  } else {
    index = new Map();
    data.ids.forEach((id, i) => index.set(id, i));
    version++;
  }
  frame = { ...data, receivedAt: performance.now(), index };
}

export function getOrbitFrame() {
  return frame;
}

/** Changes whenever the set/order of satellites in the frame changes */
export function getOrbitFrameVersion() {
  return version;
}

/** Simulated seconds elapsed since the frame was computed */
export function getFrameElapsedSec(now = performance.now()) {
  if (!frame || !frame.running) return 0;
  return ((now - frame.receivedAt) / 1000) * frame.speed;
}
