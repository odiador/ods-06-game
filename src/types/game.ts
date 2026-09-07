export type EnergyItemType = 'solar' | 'wind' | 'battery' | 'hydro';
export type HazardItemType = 'coal' | 'oil' | 'co2' | 'surge';

export type BiomeMode = 'wind' | 'solar' | 'hydro';

export interface BiomeConfig {
    id: BiomeMode;
    name: string;
    subtitle: string;
    description: string;
    themeColor: string;
    themeColorHex: number;
    vehicleKey: string;
    trackKey: string;
    borderKey: string;
    turboKey: string;
    obstacleKeys: string[];
    batteryKey: string;
    sideDecoration: 'turbines' | 'solar_towers' | 'hydro_pylons';
    energyLabel: string;
    turboPopup: string;
    co2Factor: number; // kg CO2 avoided per kWh
    academicTopic: string;
    academicText: string[];
}

export const BIOMES: Record<BiomeMode, BiomeConfig> = {
    wind: {
        id: 'wind',
        name: 'COLINAS EÓLICAS',
        subtitle: 'ODS 7 · ENERGÍA EÓLICA',
        description: 'Vientos rápidos, ráfagas dinámicas y aerogeneradores rotativos.',
        themeColor: '#00E5FF',
        themeColorHex: 0x00E5FF,
        vehicleKey: 'wind_glider',
        trackKey: 'canyon_track',
        borderKey: 'grass_border',
        turboKey: 'wind_gust',
        obstacleKeys: ['track_rock', 'track_log'],
        batteryKey: 'battery',
        sideDecoration: 'turbines',
        energyLabel: 'ENERGÍA EÓLICA',
        turboPopup: '¡TURBO EÓLICO +170 km/h!',
        co2Factor: 0.42,
        academicTopic: 'PREDICCIÓN DE VIENTO CON DEEP LEARNING (CNN-LSTM):',
        academicText: [
            'LECCIÓN DE INGENIERÍA Y SOSTENIBILIDAD:',
            'El viento es estocástico y variable. La ingeniería',
            'de sistemas aplica redes neuronales CNN-LSTM para',
            'predecir velocidad y dirección, permitiendo a la red',
            'despachar generación limpia sin picos de sobrecarga.'
        ]
    },
    solar: {
        id: 'solar',
        name: 'VALLE SOLAR',
        subtitle: 'ODS 7 · ENERGÍA FOTOVOLTAICA',
        description: 'Radiación extrema, pistas de cuarzo y pulsos de sobrecarga solar.',
        themeColor: '#FACC15',
        themeColorHex: 0xFACC15,
        vehicleKey: 'solar_speeder',
        trackKey: 'solar_track',
        borderKey: 'solar_border',
        turboKey: 'solar_flare',
        obstacleKeys: ['solar_dust', 'track_rock'],
        batteryKey: 'solar',
        sideDecoration: 'solar_towers',
        energyLabel: 'ENERGÍA SOLAR',
        turboPopup: '¡SOBRECARGA SOLAR +170 km/h!',
        co2Factor: 0.48,
        academicTopic: 'CONTROL MPPT Y GESTIÓN DE LA CURVA DE PATO:',
        academicText: [
            'LECCIÓN DE INGENIERÍA Y SOSTENIBILIDAD:',
            'La generación solar pico al mediodía genera el',
            'desafío de la Curva de Pato. Con algoritmos de',
            'seguimiento del punto de máxima potencia (MPPT) y BESS',
            'se almacena el excedente para las horas pico nocturnas.'
        ]
    },
    hydro: {
        id: 'hydro',
        name: 'RÁPIDOS HIDROELÉCTRICOS',
        subtitle: 'ODS 7 · ENERGÍA HIDRÁULICA',
        description: 'Canales de alta pendiente, corrientes turbinadas y remolinos.',
        themeColor: '#38BDF8',
        themeColorHex: 0x38BDF8,
        vehicleKey: 'hydro_foil',
        trackKey: 'hydro_track',
        borderKey: 'hydro_border',
        turboKey: 'hydro_current',
        obstacleKeys: ['hydro_vortex', 'track_log'],
        batteryKey: 'hydro',
        sideDecoration: 'hydro_pylons',
        energyLabel: 'ENERGÍA HÍDRICA',
        turboPopup: '¡SURGE HIDROCINÉTICO +170 km/h!',
        co2Factor: 0.52,
        academicTopic: 'ALMACENAMIENTO POR BOMBEO E INERCIA SÍNCRONA:',
        academicText: [
            'LECCIÓN DE INGENIERÍA Y SOSTENIBILIDAD:',
            'Las centrales hidroeléctricas de bombeo (PSH) actúan',
            'como baterías de agua a escala de gigavatios. Su inercia',
            'síncrona estabiliza la frecuencia de la red nacional ante',
            'intermitencias súbitas de fuentes renovables variables.'
        ]
    }
};

export interface EnergyItemData {
    key: EnergyItemType;
    label: string;
    points: number;
    progress: number; // Percentage toward clean transition
    glowColor: number;
}

export interface HazardItemData {
    key: HazardItemType;
    label: string;
    penalty: number; // Negative progress
    damage: number;  // Grid stability damage
}

export interface TouchControlsState {
    left: boolean;
    right: boolean;
}

declare global {
    interface Window {
        __touchControls?: TouchControlsState;
        __gameActive?: boolean;
        __selectedBiome?: BiomeMode;
    }
}
