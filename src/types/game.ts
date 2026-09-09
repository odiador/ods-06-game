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

export interface SingleCircuitConfig {
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
    co2Factor: number;
}

export const MAIN_CIRCUIT: SingleCircuitConfig = {
    name: 'RED RENOVABLE 2030',
    subtitle: 'ODS 7 · CIRCUITO INTEGRADO',
    description: 'Circuito limpio con aerogeneradores, paneles solares y turbos de viento.',
    themeColor: '#0284C7',
    themeColorHex: 0x0284C7,
    vehicleKey: 'wind_glider',
    trackKey: 'canyon_track',
    borderKey: 'grass_border',
    turboKey: 'wind_gust',
    obstacleKeys: ['track_rock', 'track_log'],
    batteryKey: 'battery',
    sideDecoration: 'turbines',
    energyLabel: 'ENERGIA LIMPIA',
    turboPopup: '¡TURBO +50 km/h!',
    co2Factor: 0.45
};
