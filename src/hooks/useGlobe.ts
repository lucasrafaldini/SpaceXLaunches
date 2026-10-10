import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import type { SatelliteRecord, SatellitePosition, FilterState } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from '../store/useSceneStore';
import { getOrbitFrame, getOrbitFrameVersion, getFrameElapsedSec } from '../lib/liveOrbits';
import { categoryOf } from '../lib/categories';

type GlobeInstance = InstanceType<typeof Globe>;

const GLOBE_RADIUS = 100;
const SELECTED_SCALE = 2.6;
const PICK_RADIUS_PX = 14;
const CLICK_MOVE_TOLERANCE_PX = 5;
// Cap linear extrapolation if worker frames stall (e.g. background tab)
const MAX_EXTRAPOLATION_SEC = 120;

/** Spheres keep a readable on-screen size: shrink when zooming in, grow when zooming out */
function zoomScaleFor(cameraDistance: number) {
  return THREE.MathUtils.clamp((cameraDistance - GLOBE_RADIUS) / 150, 0.06, 4);
}

/**
 * Satellites are drawn as point sprites shaded like little spheres: one vertex per
 * object instead of hundreds of triangles, so ~11k objects stay cheap to render.
 */
function createSatelliteMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: 1 },
      uPixelScale: { value: 500 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aRadius;
      uniform float uScale;
      uniform float uPixelScale;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(2.0, 2.0 * aRadius * uScale * uPixelScale / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        uv.y = -uv.y;
        float r2 = dot(uv, uv);
        if (r2 > 1.0) discard;
        vec3 n = vec3(uv, sqrt(1.0 - r2));
        vec3 l = normalize(vec3(-0.35, 0.45, 0.82));
        float diffuse = max(dot(n, l), 0.0);
        float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
        float rim = pow(1.0 - n.z, 3.0);
        vec3 col = vColor * (0.42 + 0.7 * diffuse) + spec * 0.45 + vColor * rim * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/** Faint procedural star field (replaces a 900 KB background image) */
function createStarField() {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u) * 3000;
    positions.set([r * Math.cos(t), u * 3000, r * Math.sin(t)], i * 3);
    const b = 0.25 + Math.random() ** 3 * 0.75;
    colors.set([b, b * 0.97, b * 0.9], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false })
  );
}

export function useGlobe(containerRef: React.RefObject<HTMLDivElement | null>) {
  const globeRef = useRef<GlobeInstance | null>(null);

  const spaceXSatellites = useAppStore((s) => s.spaceXSatellites);
  const filters = useAppStore((s) => s.filters);
  const positions = useAppStore((s) => s.positions);
  const selectedSatellite = useAppStore((s) => s.selectedSatellite);
  const groundTrack = useAppStore((s) => s.groundTrack);
  const showOrbits = useAppStore((s) => s.settings.showOrbits);
  const view = useAppStore((s) => s.view);

  // Only depend on positions when the altitude filter actually needs them
  const altitudeFilterActive = filters.altitudeMin > 0 || filters.altitudeMax < 2000;
  const altitudePositions = altitudeFilterActive ? positions : null;
  const filteredSats = useMemo(
    () => filterSatellites(spaceXSatellites, filters, altitudePositions),
    [spaceXSatellites, filters, altitudePositions]
  );

  // Values the render loop reads every frame
  const filteredRef = useRef<SatelliteRecord[]>(filteredSats);
  const dirtyRef = useRef(true);
  const selectedIdRef = useRef<number | null>(null);
  const followRef = useRef(false);

  useEffect(() => {
    filteredRef.current = filteredSats;
    dirtyRef.current = true;
  }, [filteredSats]);

  useEffect(() => {
    selectedIdRef.current = selectedSatellite?.noradCatId ?? null;
  }, [selectedSatellite]);

  useEffect(() => {
    followRef.current = view.followMode;
  }, [view.followMode]);

  // Initialize globe + satellite layer + render loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const globe = new Globe(container);
    globeRef.current = globe;

    // Cap the pixel ratio: rendering at 3× on retina costs a lot and looks the same
    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    globe
      .globeImageUrl('/textures/earth.jpg')
      .backgroundColor('#050505')
      .showAtmosphere(true)
      .atmosphereColor('#d8d2c4')
      .atmosphereAltitude(0.14)
      .showGraticules(false)
      // Satellites are picked by our own screen-space picker; globe.gl's per-move raycasting is costly
      .enablePointerInteraction(false);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) globe.width(width).height(height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const initialAltitude = useAppStore.getState().view.altitude;
    globe.pointOfView({ lat: 0, lng: 0, altitude: initialAltitude }, 0);

    const controls = globe.controls() as { minDistance: number; maxDistance: number };
    controls.minDistance = GLOBE_RADIUS * (1 + MIN_CAMERA_ALTITUDE);
    controls.maxDistance = GLOBE_RADIUS * (1 + MAX_CAMERA_ALTITUDE);

    // Keep the zoom slider in sync with wheel / pinch zoom
    const sceneStore = useSceneStore.getState();
    sceneStore.setCameraAltitude(initialAltitude);
    globe.onZoom((pov: { altitude: number }) => useSceneStore.getState().setCameraAltitude(pov.altitude));
    sceneStore.registerCameraControl((altitude: number) => {
      const pov = globe.pointOfView();
      globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude }, 0);
    });

    const stars = createStarField();
    globe.scene().add(stars);

    // --- Satellites: a single Points object, one vertex per object ---
    const material = createSatelliteMaterial();
    const geometry = new THREE.BufferGeometry();
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    globe.scene().add(points);

    // Per-satellite data, rebuilt when filters or the worker's satellite set change
    let slots = new Int32Array(0); // point -> index into frame buffer
    let instanceIds = new Int32Array(0);
    let worldPos = new Float32Array(0);
    let positionAttr: THREE.BufferAttribute | null = null;
    let builtVersion = -1;

    const rgb = { r: 0, g: 0, b: 0 };
    const tmpColor = new THREE.Color();
    const rebuild = () => {
      const frame = getOrbitFrame();
      if (!frame) return;
      const sats = filteredRef.current;
      const nextSlots = new Int32Array(sats.length);
      const nextIds = new Int32Array(sats.length);
      const colors = new Float32Array(sats.length * 3);
      const radii = new Float32Array(sats.length);
      let n = 0;
      for (const sat of sats) {
        const idx = frame.index.get(sat.noradCatId);
        if (idx === undefined) continue;
        const cat = categoryOf(sat);
        nextSlots[n] = idx;
        nextIds[n] = sat.noradCatId;
        radii[n] = cat.radius;
        // Shader outputs colors as-is, so keep them in sRGB
        tmpColor.set(cat.color).getRGB(rgb, THREE.SRGBColorSpace);
        colors[n * 3] = rgb.r;
        colors[n * 3 + 1] = rgb.g;
        colors[n * 3 + 2] = rgb.b;
        n++;
      }
      slots = nextSlots.slice(0, n);
      instanceIds = nextIds.slice(0, n);
      worldPos = new Float32Array(n * 3);
      positionAttr = new THREE.BufferAttribute(worldPos, 3);
      positionAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', positionAttr);
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors.slice(0, n * 3), 3));
      geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii.slice(0, n), 1));
      geometry.setDrawRange(0, n);
      builtVersion = getOrbitFrameVersion();
      dirtyRef.current = false;
    };

    // Selected satellite marker: bright core + pulsing halo
    const markerGeometry = new THREE.SphereGeometry(1, 24, 16);
    const marker = new THREE.Group();
    const markerCore = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0xfaf6ee }));
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const markerHalo = new THREE.Mesh(markerGeometry, haloMaterial);
    marker.add(markerCore, markerHalo);
    marker.visible = false;
    globe.scene().add(marker);

    const camera = globe.camera() as THREE.PerspectiveCamera;
    let raf = 0;
    let lastFollow = 0;

    // --- Screen-space picking: nearest visible sphere within a few pixels of the cursor ---
    let pointerX = 0;
    let pointerY = 0;
    let pointerInside = false;
    let pointerDirty = false;
    const viewProj = new THREE.Matrix4();

    const pick = () => {
      const scene = useSceneStore.getState();
      if (!pointerInside || slots.length === 0) {
        if (scene.hoverId !== null) scene.setHover(null);
        container.style.cursor = '';
        return;
      }
      const rect = container.getBoundingClientRect();
      const mx = pointerX - rect.left;
      const my = pointerY - rect.top;
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      let best = -1;
      let bestD2 = PICK_RADIUS_PX * PICK_RADIUS_PX;
      viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const e = viewProj.elements;

      for (let i = 0; i < slots.length; i++) {
        const x = worldPos[i * 3];
        const y = worldPos[i * 3 + 1];
        const z = worldPos[i * 3 + 2];
        // Inline projection (Vector3.project is too slow for ~11k points per mouse move)
        const w = e[3] * x + e[7] * y + e[11] * z + e[15];
        if (w <= 0) continue;
        const sx = (((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) / 2) * rect.width;
        const sy = ((1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) / 2) * rect.height;
        const d2 = (sx - mx) ** 2 + (sy - my) ** 2;
        if (d2 >= bestD2) continue;

        // Hidden behind the Earth? (segment camera -> satellite crosses the globe)
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        const t = -(cx * dx + cy * dy + cz * dz) / (dx * dx + dy * dy + dz * dz);
        if (t > 0 && t < 1) {
          const px = cx + t * dx;
          const py = cy + t * dy;
          const pz = cz + t * dz;
          if (px * px + py * py + pz * pz < GLOBE_RADIUS * GLOBE_RADIUS) continue;
        }
        best = i;
        bestD2 = d2;
      }

      const id = best >= 0 ? instanceIds[best] : null;
      if (id !== null || scene.hoverId !== null) scene.setHover(id, pointerX, pointerY);
      container.style.cursor = id !== null ? 'pointer' : '';
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const frame = getOrbitFrame();
      if (!frame) return;
      if (dirtyRef.current || builtVersion !== getOrbitFrameVersion()) rebuild();
      if (!positionAttr) return;

      const dt = Math.min(getFrameElapsedSec(now), MAX_EXTRAPOLATION_SEC);
      const zoomScale = zoomScaleFor(camera.position.length()) * useSceneStore.getState().sphereScale;
      const buf = frame.buf;

      for (let i = 0; i < slots.length; i++) {
        const o = slots[i] * 6;
        worldPos[i * 3] = buf[o] + buf[o + 3] * dt;
        worldPos[i * 3 + 1] = buf[o + 1] + buf[o + 4] * dt;
        worldPos[i * 3 + 2] = buf[o + 2] + buf[o + 5] * dt;
      }
      positionAttr.needsUpdate = true;
      material.uniforms.uScale.value = zoomScale;
      material.uniforms.uPixelScale.value =
        globe.renderer().domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

      // Selected marker follows its satellite
      const selectedId = selectedIdRef.current;
      const selIdx = selectedId !== null ? frame.index.get(selectedId) : undefined;
      if (selIdx !== undefined) {
        const o = selIdx * 6;
        marker.position.set(buf[o] + buf[o + 3] * dt, buf[o + 1] + buf[o + 4] * dt, buf[o + 2] + buf[o + 5] * dt);
        const sat = useAppStore.getState().selectedSatellite;
        const cat = sat ? categoryOf(sat) : null;
        marker.scale.setScalar((cat?.radius ?? 0.5) * SELECTED_SCALE * zoomScale);
        markerHalo.scale.setScalar(1.8 + Math.sin(now / 300) * 0.35);
        if (cat) haloMaterial.color.set(cat.color);
        marker.visible = true;

        // Follow mode: keep the camera over the satellite at the current zoom
        if (followRef.current && now - lastFollow > 30) {
          lastFollow = now;
          const geo = globe.toGeoCoords({ x: marker.position.x, y: marker.position.y, z: marker.position.z });
          const pov = globe.pointOfView();
          globe.pointOfView({ lat: geo.lat, lng: geo.lng, altitude: pov.altitude }, 0);
        }
      } else {
        marker.visible = false;
      }

      if (pointerDirty) {
        pointerDirty = false;
        pick();
      }
    };
    raf = requestAnimationFrame(tick);

    let downX = 0;
    let downY = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerInside = true;
      pointerDirty = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
      pointerDirty = true;
    };
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_MOVE_TOLERANCE_PX) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerInside = true;
      pick();
      const id = useSceneStore.getState().hoverId;
      if (id === null) useAppStore.getState().selectSatellite(null);
      else selectById(id);
    };
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      useSceneStore.getState().registerCameraControl(null);
      useSceneStore.getState().setHover(null);
      geometry.dispose();
      material.dispose();
      markerGeometry.dispose();
      haloMaterial.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      globe._destructor();
      globeRef.current = null;
      // globe.gl doesn't remove its canvas; avoid stacked canvases on remount (StrictMode)
      container.innerHTML = '';
    };
  }, [containerRef]);

  // Orbit path of the selected satellite
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (showOrbits && selectedSatellite && groundTrack.length > 0) {
      const color = categoryOf(selectedSatellite).color;
      globe
        .pathsData([{ path: groundTrack.map((p) => ({ lat: p.latitude, lng: p.longitude, altitude: p.altitudeKm / 6371 })) }])
        .pathPoints('path')
        .pathPointLat('lat')
        .pathPointLng('lng')
        .pathPointAlt('altitude')
        .pathColor(() => [`${color}00`, color])
        .pathStroke(0.45)
        .pathDashLength(0.5)
        .pathDashGap(0.02)
        .pathDashAnimateTime(12000)
        .pathTransitionDuration(0);
    } else {
      globe.pathsData([]);
    }
  }, [showOrbits, selectedSatellite, groundTrack]);

  // Camera moves requested through the store (reset, center on satellite)
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || view.followMode) return;
    globe.pointOfView({ lat: view.latitude, lng: view.longitude, altitude: view.altitude }, 1000);
  }, [view.latitude, view.longitude, view.altitude, view.followMode]);

  return { filteredCount: filteredSats.length };
}

function selectById(id: number) {
  const { spaceXSatellites, positions, selectSatellite } = useAppStore.getState();
  const sat = spaceXSatellites.find((s) => s.noradCatId === id);
  if (!sat) return;
  selectSatellite({
    ...sat,
    position: positions.get(id),
    tleAgeHours: (Date.now() - new Date(sat.epoch).getTime()) / (1000 * 60 * 60),
    dataFreshness: 'fresh',
  });
}

export function useGlobeControls() {
  const setView = useAppStore((s) => s.setView);

  const resetView = useCallback(() => {
    // Tiny jitter so the camera effect re-runs even if the values didn't change
    setView({ latitude: 0, longitude: Math.random() * 1e-4, altitude: 2.5, followMode: false });
  }, [setView]);

  const toggleFollow = useCallback(() => {
    setView({ followMode: !useAppStore.getState().view.followMode });
  }, [setView]);

  const zoomBy = useCallback((factor: number) => {
    const { cameraAltitude, setCameraAltitudeOnGlobe } = useSceneStore.getState();
    setCameraAltitudeOnGlobe?.(
      THREE.MathUtils.clamp(cameraAltitude * factor, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE)
    );
  }, []);

  const zoomIn = useCallback(() => zoomBy(0.8), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.25), [zoomBy]);

  return { resetView, toggleFollow, zoomIn, zoomOut };
}

export function filterSatellites(
  satellites: SatelliteRecord[],
  filters: FilterState,
  positions: Map<number, SatellitePosition> | null
): SatelliteRecord[] {
  const query = filters.searchQuery.trim().toLowerCase();
  return satellites.filter((sat) => {
    if (!filters[categoryOf(sat).filterKey]) return false;

    if (positions) {
      const altitude = positions.get(sat.noradCatId)?.altitudeKm ?? sat.apogeeKm;
      if (altitude < filters.altitudeMin || altitude > filters.altitudeMax) return false;
    }

    if (sat.inclination < filters.inclinationMin || sat.inclination > filters.inclinationMax) return false;

    if (query && !sat.objectName.toLowerCase().includes(query) && !sat.noradCatId.toString().includes(query)) {
      return false;
    }
    return true;
  });
}
