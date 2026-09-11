export type EnergyItemType = 'solar' | 'wind' | 'battery' | 'hydro';
export type HazardItemType = 'coal' | 'oil' | 'co2' | 'surge';

export interface EnergyItemData {
    key: EnergyItemType;
    label: string;
    points: number;
    progress: number;
    glowColor: number;
}

export interface HazardItemData {
    key: HazardItemType;
    label: string;
    penalty: number;
    damage: number;
}

export interface TouchControlsState {
    left: boolean;
    right: boolean;
    up?: boolean;
    down?: boolean;
}

declare global {
    interface Window {
        __touchControls?: TouchControlsState;
        __gameActive?: boolean;
        __phaserGame?: Phaser.Game;
    }
}

export type GameModeId = 'race' | 'catcher';

export interface ApplianceComparison {
    appliance: string;
    icon: string;
    description: string;
}

export function getApplianceEquivalence(kwh: number): ApplianceComparison[] {
    const fridgeDays = Math.max(1, Math.round((kwh / 1.1) * 10) / 10);
    const washCycles = Math.max(1, Math.round(kwh / 1.2));
    const acHours = Math.max(1, Math.round(kwh / 1.0));
    const phoneCharges = Math.max(1, Math.round(kwh / 0.015));
    const tvHours = Math.max(1, Math.round(kwh / 0.08));

    return [
        {
            appliance: 'NEVERA EFICIENTE',
            icon: '•',
            description: `Mantiene funcionando una nevera moderna durante ${fridgeDays} dias continuos (24h).`
        },
        {
            appliance: 'LAVADORA DE ROPA',
            icon: '•',
            description: `Alcanza para alimentar ${washCycles} ciclos completos de lavado de ropa.`
        },
        {
            appliance: 'AIRE ACONDICIONADO',
            icon: '•',
            description: `Equivale a ${acHours} horas de aire acondicionado (12.000 BTU) a toda potencia.`
        },
        {
            appliance: 'CARGAS DE SMARTPHONE',
            icon: '•',
            description: `Permite cargar completamente un telefono movil unas ${phoneCharges.toLocaleString()} veces.`
        },
        {
            appliance: 'SMART TV 55 PULGADAS',
            icon: '•',
            description: `Mantiene encendido un televisor LED durante unas ${tvHours.toLocaleString()} horas de transmision.`
        }
    ];
}

export const ROTATING_LESSONS = [
    {
        title: 'CURVA DE PATO Y BATERIAS BESS',
        text: 'La energia solar abunda al mediodia pero la demanda maxima ocurre de noche. Los bancos de baterias (BESS) almacenan el excedente solar para suministrarlo en la noche sin encender plantas termicas de gas o carbon.'
    },
    {
        title: 'PREDICCION DE VIENTO CON IA',
        text: 'El viento es variable. La ingenieria de sistemas utiliza redes neuronales CNN-LSTM para pronosticar velocidad y direccion con 24 horas de antelacion, permitiendo a la red electrica balancear la carga sin sobrecargas.'
    },
    {
        title: 'INERCIA SINCRONA E HIDROELECTRICIDAD',
        text: 'Las centrales hidroelectricas aportan masa rotatoria fisica que estabiliza la frecuencia de la red (60 Hz). El almacenamiento por bombeo actua como una gigantesca bateria natural de agua.'
    },
    {
        title: 'MICRO-REDES Y RESILIENCIA ELECTRICA',
        text: 'Los sistemas distribuidos con fuentes solares y eolicas locales pueden aislarse de la red principal durante emergencias, garantizando luz continua a hospitales y comunidades vulnerables.'
    },
    {
        title: 'DESCARBONIZACION Y ODS 7',
        text: 'Cada kWh limpio generado desplaza en promedio 0.45 kg de emisiones de dioxido de carbono (CO2), frenando el calentamiento global y asegurando energia limpia y asequible para todos.'
    }
];

export type BiomeId = 'wind' | 'solar' | 'hydro' | 'grid';

export interface SingleCircuitConfig {
    round?: number;
    id?: BiomeId;
    name: string;
    stageName?: string;
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
    sideDecoration: 'turbines' | 'solar_towers' | 'hydro_pylons' | 'grid_towers';
    energyLabel: string;
    turboPopup: string;
    co2Factor: number;
    cutoffDescription?: string;
    targetDistance?: number;
    qualifyCutoffPct?: number;
}

export type TournamentRoundConfig = SingleCircuitConfig;

export const TOURNAMENT_ROUNDS: Record<number, TournamentRoundConfig> = {
    1: {
        round: 1,
        id: 'wind',
        name: 'COLINAS EOLICAS',
        stageName: 'ETAPA 1: CLASIFICATORIA',
        subtitle: 'ODS 7 · ENERGIA EOLICA',
        description: 'Vientos rapidos, aerogeneradores rotativos y rafagas dinamicas.',
        themeColor: '#0284C7',
        themeColorHex: 0x0284C7,
        vehicleKey: 'wind_glider',
        trackKey: 'canyon_track',
        borderKey: 'grass_border',
        turboKey: 'wind_gust',
        obstacleKeys: ['track_rock', 'track_log'],
        batteryKey: 'battery',
        sideDecoration: 'turbines',
        energyLabel: 'ENERGIA EOLICA',
        turboPopup: '¡TURBO EOLICO +50 km/h!',
        co2Factor: 0.42,
        cutoffDescription: 'CLASIFICA EL TOP 50% (MAX 25 PILOTOS)',
        targetDistance: 2030,
        qualifyCutoffPct: 0.5
    },
    2: {
        round: 2,
        id: 'solar',
        name: 'VALLE SOLAR',
        stageName: 'ETAPA 2: CUARTOS DE FINAL',
        subtitle: 'ODS 7 · ENERGIA FOTOVOLTAICA',
        description: 'Radiacion termosolar, paneles fotovoltaicos y sobrecargas de energia.',
        themeColor: '#D97706',
        themeColorHex: 0xD97706,
        vehicleKey: 'solar_speeder',
        trackKey: 'solar_track',
        borderKey: 'solar_border',
        turboKey: 'solar_flare',
        obstacleKeys: ['solar_dust', 'track_rock'],
        batteryKey: 'solar',
        sideDecoration: 'solar_towers',
        energyLabel: 'ENERGIA SOLAR',
        turboPopup: '¡PULSO SOLAR +50 km/h!',
        co2Factor: 0.48,
        cutoffDescription: 'CLASIFICA EL TOP 50% (MAX 12 PILOTOS)',
        targetDistance: 2030,
        qualifyCutoffPct: 0.5
    },
    3: {
        round: 3,
        id: 'hydro',
        name: 'RAPIDOS HIDROELECTRICOS',
        stageName: 'ETAPA 3: SEMIFINAL',
        subtitle: 'ODS 7 · ENERGIA HIDRAULICA',
        description: 'Canales de alta pendiente, pilones de control y corrientes turbinadas.',
        themeColor: '#0284C7',
        themeColorHex: 0x0284C7,
        vehicleKey: 'hydro_foil',
        trackKey: 'hydro_track',
        borderKey: 'hydro_border',
        turboKey: 'hydro_current',
        obstacleKeys: ['hydro_vortex', 'track_log'],
        batteryKey: 'hydro',
        sideDecoration: 'hydro_pylons',
        energyLabel: 'ENERGIA HIDRICA',
        turboPopup: '¡SURGE HIDRICO +50 km/h!',
        co2Factor: 0.52,
        cutoffDescription: 'CLASIFICA EL TOP 50% (MAX 6 FINALISTAS)',
        targetDistance: 2030,
        qualifyCutoffPct: 0.5
    },
    4: {
        round: 4,
        id: 'grid',
        name: 'RED INTELIGENTE 2030',
        stageName: 'ETAPA 4: GRAN FINAL',
        subtitle: 'ODS 7 · BESS Y RED DE ALTA RESILIENCIA',
        description: 'Superconductores, almacenamiento masivo BESS y carrera por el podio de oro.',
        themeColor: '#10B981',
        themeColorHex: 0x10B981,
        vehicleKey: 'grid_speeder',
        trackKey: 'grid_track',
        borderKey: 'grid_border',
        turboKey: 'grid_surge',
        obstacleKeys: ['grid_overload', 'track_rock'],
        batteryKey: 'battery',
        sideDecoration: 'grid_towers',
        energyLabel: 'RED INTELIGENTE',
        turboPopup: '¡HIPER-IMPULSO BESS +50 km/h!',
        co2Factor: 0.55,
        cutoffDescription: '¡GRAN FINAL POR EL PODIO (TOP 3)!',
        targetDistance: 2030,
        qualifyCutoffPct: 1.0
    }
};

export const MAIN_CIRCUIT: SingleCircuitConfig = TOURNAMENT_ROUNDS[1];

export function computeTournamentMaxRounds(totalPlayers: number, singleMapMode?: boolean): number {
    if (singleMapMode) return 1;
    if (totalPlayers <= 2) return 1;
    if (totalPlayers < 10) return 2;
    return 4;
}

export function computeQualificationCutoff(round: number, maxRounds: number, totalPlayers: number): number {
    if (round >= maxRounds) {
        return Math.min(3, totalPlayers);
    }
    if (totalPlayers === 3 && round === 1) {
        return 2;
    }
    return Math.max(2, Math.ceil(totalPlayers * 0.5));
}

export function getCutoffDescription(round: number, maxRounds: number, totalPlayers: number): string {
    if (maxRounds === 1) {
        return '¡FINAL DIRECTA (DUELO 1 VS 1)!';
    }
    if (round >= maxRounds) {
        return '¡GRAN FINAL POR EL PODIO!';
    }
    if (totalPlayers === 3 && round === 1) {
        return 'CLASIFICAN LOS 2 MEJORES A LA FINAL';
    }
    const cutoff = computeQualificationCutoff(round, maxRounds, totalPlayers);
    return `CLASIFICA EL TOP 50% (MAX ${cutoff} PILOTOS)`;
}

export function getStartingGridX(slotIndex: number, totalPlayers: number): number {
    if (totalPlayers <= 1) return 240;
    if (totalPlayers === 2) {
        return slotIndex === 0 ? 190 : 290;
    }
    if (totalPlayers === 3) {
        const slots3 = [180, 240, 300];
        return slots3[slotIndex % 3];
    }
    const minX = 160;
    const maxX = 320;
    const slots = Math.min(totalPlayers, 6);
    const step = (maxX - minX) / Math.max(1, slots - 1);
    return Math.round(minX + (slotIndex % slots) * step);
}
