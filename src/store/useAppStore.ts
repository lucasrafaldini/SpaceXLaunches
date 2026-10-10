import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  SatelliteRecord,
  SatellitePosition,
  SelectedSatellite,
  FilterState,
  ViewState,
  GlobeConfig,
  UserSettings,
  CatalogStats,
  GroundTrackPoint,
  GroundPass,
  DebrisField,
} from '../types';

interface AppState {
  // Data
  allSatellites: SatelliteRecord[];
  spaceXSatellites: SatelliteRecord[];
  positions: Map<number, SatellitePosition>;
  selectedSatellite: SelectedSatellite | null;
  groundTrack: GroundTrackPoint[];
  nextPasses: GroundPass[];
  debrisFields: DebrisField[];
  stats: CatalogStats | null;
  
  // UI State
  filters: FilterState;
  view: ViewState;
  globeConfig: GlobeConfig;
  settings: UserSettings;
  
  // Loading states
  isLoading: boolean;
  isPropagating: boolean;
  error: string | null;
  
  // Worker
  worker: Worker | null;
  
  // Actions
  setAllSatellites: (satellites: SatelliteRecord[]) => void;
  setSpaceXSatellites: (satellites: SatelliteRecord[]) => void;
  setPositions: (positions: Map<number, SatellitePosition>) => void;
  updatePosition: (noradId: number, position: SatellitePosition) => void;
  selectSatellite: (satellite: SelectedSatellite | null) => void;
  setGroundTrack: (track: GroundTrackPoint[]) => void;
  setNextPasses: (passes: GroundPass[]) => void;
  setDebrisFields: (fields: DebrisField[]) => void;
  setStats: (stats: CatalogStats) => void;
  
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  
  setView: (view: Partial<ViewState>) => void;
  setGlobeConfig: (config: Partial<GlobeConfig>) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  
  setLoading: (loading: boolean) => void;
  setPropagating: (propagating: boolean) => void;
  setError: (error: string | null) => void;
  
  setWorker: (worker: Worker) => void;
  
  // Filtered satellites
  getFilteredSatellites: () => SatelliteRecord[];
  
  // Refresh data
  refreshData: () => void;
  
  // Reset
  reset: () => void;
}

const defaultFilters: FilterState = {
  showStarlink: true,
  showRocketBodies: true,
  showFairings: true,
  showDebris: true,
  showDragon: true,
  showStarship: true,
  showOther: true,
  altitudeMin: 0,
  altitudeMax: 2000,
  inclinationMin: 0,
  inclinationMax: 180,
  searchQuery: '',
  selectedCategories: [],
};

const defaultView: ViewState = {
  latitude: 0,
  longitude: 0,
  altitude: 2.5,
  target: undefined,
  followMode: false,
  timeSpeed: 1,
  currentTime: new Date(),
  isPlaying: true,
};

const defaultGlobeConfig: GlobeConfig = {
  globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
  bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
  showAtmosphere: true,
  showGraticule: false,
  showDayNight: true,
  showSun: true,
  showMoon: false,
  atmosphereColor: '#00d4aa',
  atmosphereAltitude: 0.15,
  emissiveColor: '#111827',
  emissiveIntensity: 0.3,
};

const defaultSettings: UserSettings = {
  theme: 'dark',
  units: 'metric',
  timeFormat: 'utc',
  showOrbits: true,
  showLabels: false,
  showFootprints: false,
  showTerminator: true,
  showAtmosphere: true,
  performanceMode: 'balanced',
  maxDebrisPerField: 200,
  orbitResolution: 100,
  cameraSpeed: 1,
  autoRotate: false,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        allSatellites: [],
        spaceXSatellites: [],
        positions: new Map(),
        selectedSatellite: null,
        groundTrack: [],
        nextPasses: [],
        debrisFields: [],
        stats: null,
        filters: defaultFilters,
        view: defaultView,
        globeConfig: defaultGlobeConfig,
        settings: defaultSettings,
        isLoading: false,
        isPropagating: false,
        error: null,
        worker: null,
        
        // Data actions
        setAllSatellites: (satellites) => set({ allSatellites: satellites }),
        setSpaceXSatellites: (satellites) => set({ spaceXSatellites: satellites }),
        setPositions: (positions) => set({ positions }),
        updatePosition: (noradId, position) => set((state) => {
          const newPositions = new Map(state.positions);
          newPositions.set(noradId, position);
          return { positions: newPositions };
        }),
        selectSatellite: (satellite) => set({ selectedSatellite: satellite }),
        setGroundTrack: (track) => set({ groundTrack: track }),
        setNextPasses: (passes) => set({ nextPasses: passes }),
        setDebrisFields: (fields) => set({ debrisFields: fields }),
        setStats: (stats) => set({ stats }),
        
        // Filter actions
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
        resetFilters: () => set({ filters: defaultFilters }),
        
        // View actions
        setView: (view) => set((state) => ({
          view: { ...state.view, ...view },
        })),
        setGlobeConfig: (config) => set((state) => ({
          globeConfig: { ...state.globeConfig, ...config },
        })),
        setSettings: (settings) => set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
        
        // Loading actions
        setLoading: (isLoading) => set({ isLoading }),
        setPropagating: (isPropagating) => set({ isPropagating }),
        setError: (error) => set({ error }),
        
        // Worker
        setWorker: (worker) => set({ worker }),
        
        // Refresh data
        refreshData: () => {
          if (typeof window !== 'undefined' && (window as any).__refreshData) {
            (window as any).__refreshData(true);
          }
        },
        
        // Computed
        getFilteredSatellites: () => {
          const { spaceXSatellites, filters, positions } = get();
          
          return spaceXSatellites.filter((sat) => {
            // Category filters
            const category = sat.spaceXCategory;
            if (category === 'starlink' && !filters.showStarlink) return false;
            if (category === 'rocket-body' && !filters.showRocketBodies) return false;
            if (category === 'fairing' && !filters.showFairings) return false;
            if (category === 'debris' && !filters.showDebris) return false;
            if (category === 'dragon' && !filters.showDragon) return false;
            if (category === 'starship' && !filters.showStarship) return false;
            if (category === 'other' && !filters.showOther) return false;
            
            // Altitude filter (use current position if available)
            const pos = positions.get(sat.noradCatId);
            const altitude = pos?.altitudeKm ?? sat.apogeeKm;
            if (altitude < filters.altitudeMin || altitude > filters.altitudeMax) return false;
            
            // Inclination filter
            if (sat.inclination < filters.inclinationMin || sat.inclination > filters.inclinationMax) return false;
            
            // Search query
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const name = sat.objectName.toLowerCase();
              const id = sat.noradCatId.toString();
              if (!name.includes(query) && !id.includes(query)) return false;
            }
            
            return true;
          });
        },
        
        // Reset
        reset: () => set({
          allSatellites: [],
          spaceXSatellites: [],
          positions: new Map(),
          selectedSatellite: null,
          groundTrack: [],
          nextPasses: [],
          debrisFields: [],
          stats: null,
          filters: defaultFilters,
          view: defaultView,
          globeConfig: defaultGlobeConfig,
          settings: defaultSettings,
          isLoading: false,
          isPropagating: false,
          error: null,
        }),
      }),
      {
        name: 'spacex-orbital-settings',
        partialize: (state) => ({
          settings: state.settings,
          filters: state.filters,
          globeConfig: state.globeConfig,
        }),
      }
    ),
    { name: 'SpaceX-Orbital-3D' }
  )
);