// Core orbital mechanics types
export interface TLE {
  name: string;
  line1: string;
  line2: string;
  noradId: number;
  internationalDesignator: string;
}

export interface OMM {
  CCSDS_OMM_VERS: string;
  COMMENT: string;
  CREATION_DATE: string;
  ORIGINATOR: string;
  OBJECT_NAME: string;
  OBJECT_ID: string;
  CENTER_NAME: string;
  REF_FRAME: string;
  TIME_SYSTEM: string;
  MEAN_ELEMENT_THEORY: string;
  EPOCH: string;
  MEAN_MOTION: string;
  ECCENTRICITY: string;
  INCLINATION: string;
  RA_OF_ASC_NODE: string;
  ARG_OF_PERICENTER: string;
  MEAN_ANOMALY: string;
  EPHEMERIS_TYPE: string;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: string;
  REV_AT_EPOCH: string;
  BSTAR: string;
  MEAN_MOTION_DOT: string;
  MEAN_MOTION_DDOT: string;
  SEMIMAJOR_AXIS?: string;
  PERIOD?: string;
  APOAPSIS?: string;
  PERIAPSIS?: string;
  TLE_LINE1?: string;
  TLE_LINE2?: string;
  DECAY_DATE?: string;
  // Additional fields from CelesTrak SATCAT enrichment
  object_type?: string;
  rcs_size?: string;
  country_code?: string;
  launch_date?: string;
}

export interface SatelliteRecord {
  // CelesTrak / Space-Track fields
  objectName: string;
  objectId: string;
  noradCatId: number;
  objectType: 'PAYLOAD' | 'ROCKET BODY' | 'DEBRIS' | 'UNKNOWN' | 'TBA';
  rcsSize: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  countryCode: string;
  launchDate: string | null;
  
  // Orbital elements
  epoch: string;
  meanMotion: number;
  eccentricity: number;
  inclination: number;
  raOfAscNode: number;
  argOfPericenter: number;
  meanAnomaly: number;
  bstar: number;
  meanMotionDot: number;
  meanMotionDDot: number;
  
  // Derived
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  
  // Raw TLE
  tleLine1: string;
  tleLine2: string;
  
  // Source group
  group: string;
  
  // SpaceX specific
  isSpaceX: boolean;
  spaceXCategory?: 'starlink' | 'rocket-body' | 'fairing' | 'debris' | 'dragon' | 'starship' | 'other';
}

// Real-time position
export interface SatellitePosition {
  noradCatId: number;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKms: number;
  azimuth?: number;
  elevation?: number;
  // ECI coordinates for orbit rendering
  eciX: number;
  eciY: number;
  eciZ: number;
  // ECF coordinates
  ecfX: number;
  ecfY: number;
  ecfZ: number;
  timestamp: number;
  // Visibility
  isSunlit: boolean;
  isEclipsed: boolean;
}

// Ground track point
export interface GroundTrackPoint {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  timestamp: number;
}

// Orbit path for rendering
export interface OrbitPath {
  noradCatId: number;
  points: GroundTrackPoint[];
  color: string;
  opacity: number;
  width: number;
}

// Debris field
export interface DebrisField {
  name: string;
  description: string;
  eventDate: string;
  noradIds: number[];
  color: string;
  objectCount: number;
}

// Filter options
export interface FilterState {
  showStarlink: boolean;
  showRocketBodies: boolean;
  showFairings: boolean;
  showDebris: boolean;
  showDragon: boolean;
  showStarship: boolean;
  showOther: boolean;
  altitudeMin: number;
  altitudeMax: number;
  inclinationMin: number;
  inclinationMax: number;
  searchQuery: string;
  selectedCategories: string[];
}

// Selected satellite details
export interface SelectedSatellite extends SatelliteRecord {
  position?: SatellitePosition;
  groundTrack?: GroundTrackPoint[];
  nextPasses?: GroundPass[];
  tleAgeHours: number;
  dataFreshness: 'fresh' | 'stale' | 'expired';
}

export interface GroundPass {
  aos: number; // Acquisition of signal - rise time
  tca: number; // Time of closest approach - peak
  los: number; // Loss of signal - set time
  maxElevation: number;
  maxAzimuth: number;
  duration: number; // seconds
}

// View state
export interface ViewState {
  latitude: number;
  longitude: number;
  altitude: number;
  target?: SelectedSatellite;
  followMode: boolean;
  timeSpeed: number;
  currentTime: Date;
  isPlaying: boolean;
}

// Globe visualization config
export interface GlobeConfig {
  globeImageUrl: string;
  bumpImageUrl: string;
  backgroundImageUrl: string;
  showAtmosphere: boolean;
  showGraticule: boolean;
  showDayNight: boolean;
  showSun: boolean;
  showMoon: boolean;
  atmosphereColor: string;
  atmosphereAltitude: number;
  emissiveColor: string;
  emissiveIntensity: number;
}

// API response types
export interface CelesTrakGroupResponse {
  [key: string]: OMM[];
}

export interface SpaceXTLEGroups {
  starlink: OMM[];
  'starlink-leo': OMM[];
  'starlink-v2': OMM[];
  'rocket-bodies': OMM[];
  debris: OMM[];
  'cosmos-2251-debris': OMM[];
  'iridium-33-debris': OMM[];
  'fengyun-1c-debris': OMM[];
  'last-30-days': OMM[];
}

// Worker messages
export interface WorkerMessage {
  type: 'PROPAGATE' | 'INIT' | 'UPDATE_TLE' | 'SET_TIME' | 'GET_POSITIONS' | 'START_PROPAGATION' | 'STOP_PROPAGATION' | 'SET_SPEED' | 'GET_GROUND_TRACK' | 'SET_IMPORTANT';
  payload: any;
}

export interface PropagationResult {
  positions: Map<number, SatellitePosition>;
  timestamp: number;
}

// Settings
export interface UserSettings {
  theme: 'dark' | 'light' | 'auto';
  units: 'metric' | 'imperial';
  timeFormat: 'utc' | 'local';
  showOrbits: boolean;
  showLabels: boolean;
  showFootprints: boolean;
  showTerminator: boolean;
  showAtmosphere: boolean;
  performanceMode: 'quality' | 'balanced' | 'performance';
  maxDebrisPerField: number;
  orbitResolution: number;
  cameraSpeed: number;
  autoRotate: boolean;
}

// Statistics
export interface CatalogStats {
  totalObjects: number;
  spaceXObjects: number;
  starlinkActive: number;
  starlinkTotal: number;
  rocketBodies: number;
  fairings: number;
  debris: number;
  dragon: number;
  starship: number;
  other: number;
  lastUpdate: Date;
  dataSource: string;
}