import { Events } from 'phaser';

export const EventBus = new Events.EventEmitter();

export const GameEvents = {
    SCORE_UPDATED: 'score-updated',
    PROGRESS_UPDATED: 'progress-updated',
    LIVES_UPDATED: 'lives-updated',
    ITEM_COLLECTED: 'item-collected',
    HAZARD_HIT: 'hazard-hit',
    COMBO_UPDATED: 'combo-updated',
    MUTE_TOGGLED: 'mute-toggled',
    SPEED_UPDATED: 'speed-updated',
    DISTANCE_UPDATED: 'distance-updated',
    GAME_OVER: 'game-over',
    GAME_WIN: 'game-win'
} as const;
