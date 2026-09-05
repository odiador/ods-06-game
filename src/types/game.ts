export type EnergyItemType = 'solar' | 'wind' | 'battery' | 'hydro';
export type HazardItemType = 'coal' | 'oil' | 'co2' | 'surge';

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
    }
}
