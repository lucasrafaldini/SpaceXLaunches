/// <reference types="vite/client" />
/// <reference lib="webworker" />

import type { SatelliteRecord, SatellitePosition, WorkerMessage } from '../types';
import { json2satrec, twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong } from 'satellite.js';

const satRecords = new Map<number, any>();

let currentTime = new Date();
let propagationInterval: ReturnType<typeof setInterval> | null = null;
let currentSpeed = 1;
let isRunning = false;
let lastTick = 0;

// Earth rotation rate (rad/s), used to turn ECI velocity into ECF velocity
const EARTH_ROTATION = 7.2921159e-5;
// globe.gl units: globe radius = 100 ↔ 6371 km
const KM_TO_GLOBE = 100 / 6371;
// Full position objects (lat/lng/alt/velocity/sunlit) feed the UI panels only
const FULL_UPDATE_EVERY_MS = 2000;
let lastFullUpdate = 0;

/** Unit vector to the Sun in ECI (low-precision almanac, plenty for eclipse shading) */
function sunDirection(date: Date) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const lon = ((280.46 + 0.9856474 * d) * Math.PI) / 180;
  const obl = ((23.439 - 0.0000004 * d) * Math.PI) / 180;
  return { x: Math.cos(lon), y: Math.sin(lon) * Math.cos(obl), z: Math.sin(lon) * Math.sin(obl) };
}

function isSunlit(p: { x: number; y: number; z: number }, sun: { x: number; y: number; z: number }) {
  const dist = Math.hypot(p.x, p.y, p.z);
  const dot = (sun.x * p.x + sun.y * p.y + sun.z * p.z) / dist;
  if (dot >= 0) return true;
  return Math.acos(-dot) > Math.asin(6371 / dist);
}

/**
 * One SGP4 pass over every satellite. Always produces the compact render frame
 * ([x, y, z, vx, vy, vz] in globe.gl scene coordinates, Earth-fixed, velocity per
 * simulated second); optionally also the full per-satellite positions for the UI.
 */
function propagateAll(full: boolean) {
  const n = satRecords.size;
  const ids = new Int32Array(n);
  const buf = new Float32Array(n * 6);
  const positions = full ? new Map<number, SatellitePosition>() : null;
  const gmst = gstime(currentTime);
  const c = Math.cos(gmst);
  const s = Math.sin(gmst);
  const sun = full ? sunDirection(currentTime) : null;
  const timestamp = currentTime.getTime();
  let k = 0;

  for (const [noradId, satrec] of satRecords) {
    let pv: any;
    try {
      pv = propagate(satrec, currentTime);
    } catch {
      continue;
    }
    const p = pv?.position;
    const v = pv?.velocity;
    if (!p || !v || !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) continue;

    // ECI -> ECF (rotation by GMST), velocity includes the frame's rotation
    const ex = p.x * c + p.y * s;
    const ey = -p.x * s + p.y * c;
    const ez = p.z;
    const vx = v.x * c + v.y * s + EARTH_ROTATION * ey;
    const vy = -v.x * s + v.y * c - EARTH_ROTATION * ex;

    // ECF -> globe.gl scene axes (x: lng 90°E, y: north pole, z: lng 0°)
    const o = k * 6;
    buf[o] = ey * KM_TO_GLOBE;
    buf[o + 1] = ez * KM_TO_GLOBE;
    buf[o + 2] = ex * KM_TO_GLOBE;
    buf[o + 3] = vy * KM_TO_GLOBE;
    buf[o + 4] = v.z * KM_TO_GLOBE;
    buf[o + 5] = vx * KM_TO_GLOBE;
    ids[k++] = noradId;

    if (positions && sun) {
      const gd = eciToGeodetic(p, gmst);
      const sunlit = isSunlit(p, sun);
      positions.set(noradId, {
        noradCatId: noradId,
        latitude: degreesLat(gd.latitude),
        longitude: degreesLong(gd.longitude),
        altitudeKm: gd.height,
        velocityKms: Math.hypot(v.x, v.y, v.z),
        eciX: p.x,
        eciY: p.y,
        eciZ: p.z,
        ecfX: ex,
        ecfY: ey,
        ecfZ: ez,
        timestamp,
        isSunlit: sunlit,
        isEclipsed: !sunlit,
      });
    }
  }

  return { ids: ids.slice(0, k), buf: buf.slice(0, k * 6), positions, timestamp };
}

function publish(forceFull = false) {
  const now = Date.now();
  const full = forceFull || now - lastFullUpdate >= FULL_UPDATE_EVERY_MS;
  if (full) lastFullUpdate = now;
  const { ids, buf, positions, timestamp } = propagateAll(full);

  self.postMessage(
    { type: 'FRAME', payload: { ids, buf, simTime: timestamp, speed: currentSpeed, running: isRunning } },
    { transfer: [ids.buffer, buf.buffer] }
  );
  if (positions) self.postMessage({ type: 'POSITIONS_UPDATE', payload: { positions, timestamp } });
}

function generateGroundTrack(noradId: number, points = 100) {
  const satrec = satRecords.get(noradId);
  if (!satrec) return [];

  // satrec.no is the mean motion in rad/min
  const period = satrec.no ? (2 * Math.PI) / satrec.no : 95;
  const stepMs = (period / points) * 60 * 1000;
  const track: { latitude: number; longitude: number; altitudeKm: number; timestamp: number }[] = [];

  for (let i = 0; i <= points; i++) {
    const time = new Date(currentTime.getTime() + i * stepMs);
    const pv: any = propagate(satrec, time);
    if (!pv?.position) continue;
    const gd = eciToGeodetic(pv.position, gstime(time));
    track.push({
      latitude: degreesLat(gd.latitude),
      longitude: degreesLong(gd.longitude),
      altitudeKm: gd.height,
      timestamp: time.getTime(),
    });
  }
  return track;
}

function createSatRec(sat: SatelliteRecord) {
  if (sat.tleLine1?.length >= 69 && sat.tleLine2?.length >= 69) {
    return twoline2satrec(sat.tleLine1, sat.tleLine2);
  }
  return json2satrec({
    NORAD_CAT_ID: sat.noradCatId,
    OBJECT_NAME: sat.objectName,
    OBJECT_ID: sat.objectId,
    EPOCH: sat.epoch,
    MEAN_MOTION: sat.meanMotion,
    ECCENTRICITY: sat.eccentricity,
    INCLINATION: sat.inclination,
    RA_OF_ASC_NODE: sat.raOfAscNode,
    ARG_OF_PERICENTER: sat.argOfPericenter,
    MEAN_ANOMALY: sat.meanAnomaly,
    BSTAR: sat.bstar,
    MEAN_MOTION_DOT: sat.meanMotionDot,
    MEAN_MOTION_DDOT: sat.meanMotionDDot,
    ELEMENT_SET_NO: 999,
  } as any);
}

function bankElapsedTime() {
  const now = Date.now();
  if (isRunning) currentTime = new Date(currentTime.getTime() + (now - lastTick) * currentSpeed);
  lastTick = now;
}

function startPropagationLoop() {
  if (propagationInterval) clearInterval(propagationInterval);
  propagationInterval = null;
  bankElapsedTime();
  isRunning = currentSpeed > 0;
  publish();
  if (!isRunning) return;

  // Frames only need to be frequent enough to keep the main thread's extrapolation accurate
  const intervalMs = Math.max(250, 1000 / Math.max(1, currentSpeed / 10));
  propagationInterval = self.setInterval(() => {
    bankElapsedTime();
    publish();
  }, intervalMs);
}

function stopPropagationLoop() {
  if (propagationInterval) clearInterval(propagationInterval);
  propagationInterval = null;
  bankElapsedTime();
  isRunning = false;
  publish(true);
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT': {
      satRecords.clear();
      for (const sat of payload.satellites as SatelliteRecord[]) {
        try {
          const satrec = createSatRec(sat);
          if (satrec && !satrec.error) satRecords.set(sat.noradCatId, satrec);
        } catch {
          // Skip malformed element sets
        }
      }
      publish(true);
      break;
    }

    case 'SET_TIME': {
      currentTime = new Date(payload.time);
      lastTick = Date.now();
      publish(true);
      break;
    }

    case 'GET_POSITIONS': {
      publish(true);
      break;
    }

    case 'GET_GROUND_TRACK': {
      const { noradId, points } = payload;
      self.postMessage({ type: 'GROUND_TRACK', payload: { noradId, track: generateGroundTrack(noradId, points) } });
      break;
    }

    case 'START_PROPAGATION': {
      startPropagationLoop();
      break;
    }

    case 'STOP_PROPAGATION': {
      stopPropagationLoop();
      break;
    }

    case 'SET_SPEED': {
      const wasRunning = isRunning;
      bankElapsedTime();
      currentSpeed = payload.speed ?? 1;
      if (wasRunning || payload.resume) startPropagationLoop();
      break;
    }
  }
};

self.postMessage({ type: 'READY', payload: {} });
