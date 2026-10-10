import type { SatelliteRecord, CatalogStats } from '../types';

/**
 * SpaceX catalog sources. CSV is ~3× smaller than JSON. Small sources load first so
 * the globe is populated in about a second; the ~11k Starlinks stream in afterwards.
 * Starlink comes from CelesTrak's supplemental feed (SpaceX-provided ephemerides):
 * it's faster to serve and more accurate than the regular GP group.
 */
interface Source {
  key: string;
  url: string;
  /** Keep only rows whose name matches (NAME= queries are substring searches) */
  accept?: RegExp;
}

const FAST_SOURCES: Source[] = [
  { key: 'falcon', url: '/api/celestrak?NAME=FALCON&FORMAT=csv', accept: /^FALCON (9|HEAVY)\b/ },
  { key: 'dragon', url: '/api/celestrak?NAME=DRAGON&FORMAT=csv', accept: /DRAGON/ },
  { key: 'starship', url: '/api/celestrak?NAME=STARSHIP&FORMAT=csv', accept: /STARSHIP|SUPER HEAVY/ },
];
const STARLINK_SOURCE: Source = { key: 'starlink', url: '/api/celestrak-sup?FILE=starlink&FORMAT=csv', accept: /^STARLINK/ };

/** CelesTrak publishes new elements every 2 hours */
const FRESH_FOR_MS = 2 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 30000;

// ---------- Tiny IndexedDB cache (localStorage is capped at ~5 MB and blocks the main thread) ----------

interface CachedSource {
  key: string;
  csv: string;
  fetchedAt: number;
}

const DB_NAME = 'spacex-orbital';
const STORE = 'sources';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readCache(key: string): Promise<CachedSource | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CachedSource) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCache(entry: CachedSource): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry);
  } catch {
    // Private mode / quota: the app still works, it just refetches next time
  }
}

// ---------- Parsing ----------

function categorize(name: string): SatelliteRecord['spaceXCategory'] {
  if (name.startsWith('STARLINK')) return 'starlink';
  if (name.includes('DRAGON')) return 'dragon';
  if (name.includes('STARSHIP') || name.includes('SUPER HEAVY')) return 'starship';
  if (name.includes('FAIRING')) return 'fairing';
  if (name.includes(' DEB')) return 'debris';
  if (name.includes('FALCON')) return 'rocket-body';
  return 'other';
}

function objectTypeOf(name: string): SatelliteRecord['objectType'] {
  if (name.includes(' DEB')) return 'DEBRIS';
  if (name.includes('R/B')) return 'ROCKET BODY';
  return 'PAYLOAD';
}

const MU = 398600.4418; // km³/s²
const EARTH_EQ_RADIUS = 6378.137;

export function parseCsv(csv: string, source: Source): SatelliteRecord[] {
  const lines = csv.split(/\r?\n/);
  const header = lines[0]?.split(',') ?? [];
  if (header[0] !== 'OBJECT_NAME') return [];
  const col = (name: string) => header.indexOf(name);
  const c = {
    name: col('OBJECT_NAME'),
    id: col('OBJECT_ID'),
    epoch: col('EPOCH'),
    n: col('MEAN_MOTION'),
    e: col('ECCENTRICITY'),
    i: col('INCLINATION'),
    raan: col('RA_OF_ASC_NODE'),
    argp: col('ARG_OF_PERICENTER'),
    m: col('MEAN_ANOMALY'),
    norad: col('NORAD_CAT_ID'),
    bstar: col('BSTAR'),
    ndot: col('MEAN_MOTION_DOT'),
    nddot: col('MEAN_MOTION_DDOT'),
  };

  const records: SatelliteRecord[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = line.split(',');
    const name = f[c.name]?.trim().toUpperCase() ?? '';
    if (source.accept && !source.accept.test(name)) continue;

    const meanMotion = parseFloat(f[c.n]);
    const eccentricity = parseFloat(f[c.e]);
    const inclination = parseFloat(f[c.i]);
    const noradCatId = parseInt(f[c.norad], 10);
    if (!(meanMotion > 0) || !(eccentricity >= 0 && eccentricity < 1) || !isFinite(inclination) || !noradCatId) continue;

    // Semi-major axis from mean motion (rev/day) -> apogee/perigee altitude
    const nRad = (meanMotion * 2 * Math.PI) / 86400;
    const a = Math.cbrt(MU / (nRad * nRad));

    records.push({
      objectName: f[c.name].trim(),
      objectId: f[c.id]?.trim() ?? '',
      noradCatId,
      objectType: objectTypeOf(name),
      rcsSize: null,
      countryCode: 'US',
      launchDate: null,
      epoch: f[c.epoch],
      meanMotion,
      eccentricity,
      inclination,
      raOfAscNode: parseFloat(f[c.raan]) || 0,
      argOfPericenter: parseFloat(f[c.argp]) || 0,
      meanAnomaly: parseFloat(f[c.m]) || 0,
      bstar: parseFloat(f[c.bstar]) || 0,
      meanMotionDot: parseFloat(f[c.ndot]) || 0,
      meanMotionDDot: parseFloat(f[c.nddot]) || 0,
      periodMin: 1440 / meanMotion,
      apogeeKm: a * (1 + eccentricity) - EARTH_EQ_RADIUS,
      perigeeKm: a * (1 - eccentricity) - EARTH_EQ_RADIUS,
      tleLine1: '',
      tleLine2: '',
      group: source.key,
      isSpaceX: true,
      spaceXCategory: categorize(name),
    });
  }
  return records;
}

async function download(source: Source): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(source.url, { signal: controller.signal });
    const text = await res.text();
    // "No GP data found" is a valid answer (e.g. no Starship in orbit right now): cache it as empty
    if (text.includes('No GP data')) return '';
    if (!res.ok) return null;
    return text.startsWith('OBJECT_NAME') ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Service ----------

export type SourceUpdate = (key: string, records: SatelliteRecord[]) => void;

export class SatelliteService {
  private bySource = new Map<string, SatelliteRecord[]>();
  private lastUpdate = 0;

  /**
   * Emits each source as soon as it's available: cached copies first (instant),
   * then fresh downloads for anything older than 2 h. Resolves when all are done.
   */
  async load(onUpdate: SourceUpdate, forceRefresh = false): Promise<void> {
    const sources = [...FAST_SOURCES, STARLINK_SOURCE];

    const tasks = sources.map(async (source) => {
      const cached = forceRefresh ? null : await readCache(source.key);
      if (cached) this.apply(source, cached.csv, cached.fetchedAt, onUpdate);
      if (cached && Date.now() - cached.fetchedAt < FRESH_FOR_MS) return;

      const csv = await download(source);
      if (csv === null) return;
      const fetchedAt = Date.now();
      this.apply(source, csv, fetchedAt, onUpdate);
      void writeCache({ key: source.key, csv, fetchedAt });
    });

    await Promise.all(tasks);
  }

  private apply(source: Source, csv: string, fetchedAt: number, onUpdate: SourceUpdate) {
    const records = parseCsv(csv, source);
    this.bySource.set(source.key, records);
    this.lastUpdate = Math.max(this.lastUpdate, fetchedAt);
    onUpdate(source.key, records);
  }

  getAll(): SatelliteRecord[] {
    // Deduplicate by NORAD id (a Dragon could also match another query)
    const byId = new Map<number, SatelliteRecord>();
    for (const records of this.bySource.values()) for (const r of records) byId.set(r.noradCatId, r);
    return [...byId.values()];
  }

  getStats(): CatalogStats {
    const all = this.getAll();
    const count = (cat: SatelliteRecord['spaceXCategory']) => all.filter((s) => s.spaceXCategory === cat).length;
    const starlink = count('starlink');
    return {
      totalObjects: all.length,
      spaceXObjects: all.length,
      starlinkActive: starlink,
      starlinkTotal: starlink,
      rocketBodies: count('rocket-body'),
      fairings: count('fairing'),
      debris: count('debris'),
      dragon: count('dragon'),
      starship: count('starship'),
      other: count('other'),
      lastUpdate: new Date(this.lastUpdate || Date.now()),
      dataSource: 'CelesTrak',
    };
  }
}

export const satelliteService = new SatelliteService();
