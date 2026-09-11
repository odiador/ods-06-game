import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface Player {
    id: string;
    ws: WebSocket;
    name: string;
    roomCode: string;
    isHost: boolean;
    color: number;
    x: number;
    distance: number;
    speed: number;
    finished: boolean;
    finishTimeMs: number;
    rank: number;
    isQualified?: boolean;
}

export interface PlayerPublicInfo {
    id: string;
    name: string;
    isHost: boolean;
    color: number;
    x: number;
    distance: number;
    speed: number;
    finished: boolean;
    finishTimeMs: number;
    rank: number;
    isQualified?: boolean;
}

export interface Room {
    code: string;
    status: 'lobby' | 'countdown' | 'racing' | 'finished';
    currentRound: number;
    maxRounds: number;
    players: Map<string, Player>;
    createdAt: number;
}

export function computeTournamentMaxRounds(totalPlayers: number): number {
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

export const MAX_PLAYERS_PER_ROOM = 50;

const BASE_PALETTE = [
    0x0284C7, // Cyan / Sky Blue
    0xF59E0B, // Amber / Gold
    0x10B981, // Emerald Green
    0xEC4899, // Pink / Magenta
    0x8B5CF6, // Purple
    0x06B6D4, // Turquoise
    0xEF4444, // Red
    0x84CC16, // Lime
    0xF97316, // Orange
    0x6366F1, // Indigo
    0x14B8A6, // Teal
    0xE11D48, // Rose
];

export function getPlayerColor(index: number): number {
    if (index < BASE_PALETTE.length) return BASE_PALETTE[index];
    const hue = (index * 137.5) % 360;
    // HSV to RGB (s=0.85, v=0.95)
    const c = 0.95 * 0.85;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = 0.95 - c;
    let r = 0, g = 0, b = 0;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);
    return (red << 16) | (green << 8) | blue;
}

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private wss?: WebSocketServer;

    public init(httpServer: HttpServer): void {
        if (this.wss) return;

        this.wss = new WebSocketServer({
            noServer: true,
        });

        httpServer.on('upgrade', (request, socket, head) => {
            const url = new URL(request.url || '', `http://${request.headers.host}`);
            // Only handle /ws or default socket upgrade
            if (url.pathname === '/ws' || url.pathname === '/ws/') {
                this.wss?.handleUpgrade(request, socket, head, (ws) => {
                    this.wss?.emit('connection', ws, request);
                });
            }
        });

        this.wss.on('connection', (ws) => {
            let currentPlayerId: string | null = null;
            let currentRoomCode: string | null = null;

            ws.on('message', (raw) => {
                try {
                    const message = JSON.parse(raw.toString());
                    this.handleMessage(ws, message, (playerId, roomCode) => {
                        currentPlayerId = playerId;
                        currentRoomCode = roomCode;
                    });
                } catch (err) {
                    console.error('[RoomServer] Error parsing message:', err);
                }
            });

            ws.on('close', () => {
                if (currentRoomCode && currentPlayerId) {
                    this.leaveRoom(currentRoomCode, currentPlayerId);
                }
            });

            ws.on('error', (err) => {
                console.warn('[RoomServer] Socket error:', err);
            });
        });

        console.log('[RoomServer] WebSocket server initialized on /ws');
    }

    private handleMessage(
        ws: WebSocket,
        msg: any,
        setSession: (playerId: string, roomCode: string) => void
    ): void {
        switch (msg.type) {
            case 'JOIN_ROOM': {
                const roomCode = String(msg.roomCode || 'ODS7').trim().toUpperCase().slice(0, 8);
                const playerName = String(msg.playerName || 'Piloto').trim().slice(0, 12) || 'Piloto';
                const playerId = Math.random().toString(36).substring(2, 9);

                const room = this.getOrCreateRoom(roomCode);
                if (room.status === 'countdown' || room.status === 'racing') {
                    this.sendTo(ws, {
                        type: 'ROOM_ERROR',
                        message: 'CARRERA EN CURSO (NO SE PUEDE UNIR)'
                    });
                    return;
                }

                if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
                    this.sendTo(ws, {
                        type: 'ROOM_ERROR',
                        message: 'SALA LLENA (MAX 50 PILOTOS)'
                    });
                    return;
                }

                const isHost = room.players.size === 0;
                const playerColor = getPlayerColor(room.players.size);
                const startingX = getStartingGridX(room.players.size, room.players.size + 1);

                const player: Player = {
                    id: playerId,
                    ws,
                    name: playerName,
                    roomCode,
                    isHost,
                    color: playerColor,
                    x: startingX,
                    distance: 0,
                    speed: 45,
                    finished: false,
                    finishTimeMs: 0,
                    rank: 0,
                    isQualified: true,
                };

                room.players.set(playerId, player);
                setSession(playerId, roomCode);
                room.maxRounds = computeTournamentMaxRounds(room.players.size);

                // Confirm join to client
                this.sendTo(ws, {
                    type: 'ROOM_JOINED',
                    playerId,
                    roomCode,
                    isHost,
                    players: this.getPublicPlayers(room),
                    status: room.status,
                    maxRounds: room.maxRounds,
                    round: room.currentRound,
                });

                // Notify others in room
                this.broadcast(roomCode, {
                    type: 'ROOM_UPDATE',
                    roomCode,
                    players: this.getPublicPlayers(room),
                    status: room.status,
                    maxRounds: room.maxRounds,
                    round: room.currentRound,
                }, playerId);

                break;
            }

            case 'START_RACE': {
                const roomCode = String(msg.roomCode || '').toUpperCase();
                const room = this.rooms.get(roomCode);
                if (!room) return;

                const playerId = String(msg.playerId || '');
                const player = playerId ? room.players.get(playerId) : undefined;
                if (player && !player.isHost) {
                    this.sendTo(ws, {
                        type: 'ROOM_ERROR',
                        message: 'SOLO EL ANFITRION PUEDE CONTINUAR A LA SIGUIENTE RONDA'
                    });
                    return;
                }

                if (room.status === 'countdown' || room.status === 'racing') {
                    return;
                }

                let round = Number(msg.round) || room.currentRound || 1;
                if (round === 1 || round > room.maxRounds) {
                    round = 1;
                    room.maxRounds = computeTournamentMaxRounds(room.players.size);
                    for (const p of room.players.values()) {
                        p.isQualified = true;
                        p.finished = false;
                        p.finishTimeMs = 0;
                        p.distance = 0;
                        p.speed = 45;
                        p.rank = 0;
                    }
                }
                room.currentRound = round;
                room.status = 'countdown';

                // Determine active racers for this round (Round 1: all players, Round > 1: only qualified)
                const activeRacers = this.getActivePlayers(room);
                const totalActive = activeRacers.length;

                // Reset player race stats for the round and assign starting grid positions
                let pIndex = 0;
                for (const p of activeRacers) {
                    p.finished = false;
                    p.finishTimeMs = 0;
                    p.distance = 0;
                    p.speed = 45;
                    p.rank = 0;
                    p.x = getStartingGridX(pIndex, totalActive);
                    pIndex++;
                }

                // Ensure non-active spectators do not carry finished stats
                for (const p of room.players.values()) {
                    if (!activeRacers.includes(p)) {
                        p.finished = false;
                        p.finishTimeMs = 0;
                        p.rank = 0;
                        p.distance = 0;
                    }
                }

                const now = Date.now();
                const countdownSeconds = 3;
                const startAt = now + 3500;

                this.broadcast(roomCode, {
                    type: 'RACE_COUNTDOWN',
                    round,
                    maxRounds: room.maxRounds,
                    countdownSeconds,
                    startAt,
                    serverTime: now,
                    players: activeRacers.map(p => this.toPublicPlayer(p))
                });

                // Auto transition to racing at exact startAt
                const delayMs = Math.max(0, startAt - Date.now());
                setTimeout(() => {
                    if (this.rooms.has(roomCode)) {
                        if (room.status === 'countdown') {
                            room.status = 'racing';
                            this.broadcast(roomCode, {
                                type: 'RACE_STARTED',
                                round,
                                maxRounds: room.maxRounds,
                                startAt,
                            });
                        }
                    }
                }, delayMs);
                break;
            }

            case 'LEAVE_ROOM': {
                const roomCode = String(msg.roomCode || '').toUpperCase();
                const playerId = String(msg.playerId || '');
                if (roomCode && playerId) {
                    this.leaveRoom(roomCode, playerId);
                }
                break;
            }

            case 'PLAYER_UPDATE': {
                const roomCode = String(msg.roomCode || '').toUpperCase();
                const playerId = String(msg.playerId || '');
                const room = this.rooms.get(roomCode);
                if (!room) return;

                const player = room.players.get(playerId);
                if (!player) return;

                if (typeof msg.x === 'number') player.x = msg.x;
                if (typeof msg.distance === 'number') player.distance = msg.distance;
                if (typeof msg.speed === 'number') player.speed = msg.speed;

                // Broadcast player position to all peers in the room
                this.broadcast(roomCode, {
                    type: 'PLAYERS_STATE',
                    players: this.getActivePlayers(room).map(p => this.toPublicPlayer(p)),
                }, playerId);
                break;
            }

            case 'FINISH_RACE': {
                const roomCode = String(msg.roomCode || '').toUpperCase();
                const playerId = String(msg.playerId || '');
                const room = this.rooms.get(roomCode);
                if (!room) return;

                const player = room.players.get(playerId);
                if (!player || player.finished) return;

                const activeRacers = this.getActivePlayers(room);
                const alreadyFinished = activeRacers.filter(p => p.finished).length;
                player.finished = true;
                player.finishTimeMs = Number(msg.timeMs) || Date.now();
                player.rank = Math.min(activeRacers.length, alreadyFinished + 1);

                const finishedList = activeRacers
                    .filter(p => p.finished)
                    .sort((a, b) => a.rank - b.rank);

                const podium = finishedList.slice(0, 3).map(p => ({
                    rank: p.rank,
                    playerId: p.id,
                    name: p.name,
                    finishTimeMs: p.finishTimeMs,
                    timeSec: (p.finishTimeMs / 1000).toFixed(1),
                    color: p.color
                }));

                const totalPlayers = activeRacers.length;
                const cutoff = computeQualificationCutoff(room.currentRound, room.maxRounds, totalPlayers);
                const firstHalfComplete = finishedList.length >= cutoff;

                player.isQualified = player.rank <= cutoff;

                if (firstHalfComplete && (room.status === 'racing' || room.status === 'countdown')) {
                    room.status = 'finished';
                    // Disqualify any active racer who did not finish by cutoff
                    for (const p of activeRacers) {
                        if (!p.finished) {
                            p.isQualified = false;
                        }
                    }
                }

                this.broadcast(roomCode, {
                    type: 'PLAYER_FINISHED',
                    playerId,
                    name: player.name,
                    rank: player.rank,
                    finishTimeMs: player.finishTimeMs,
                    kwh: msg.kwh || 0,
                    podium,
                    totalPlayers,
                    cutoff,
                    maxRounds: room.maxRounds,
                    firstHalfComplete,
                    finishedCount: finishedList.length
                });
                break;
            }
        }
    }

    private leaveRoom(roomCode: string, playerId: string): void {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.get(playerId);
        room.players.delete(playerId);

        if (room.players.size === 0) {
            this.rooms.delete(roomCode);
            return;
        }

        // Update max rounds according to new player count
        room.maxRounds = computeTournamentMaxRounds(room.players.size);

        // If host left, appoint new host
        let newHostId: string | undefined;
        let newHostName: string | undefined;
        const wasHost = player?.isHost === true;
        if (wasHost) {
            const nextPlayer = room.players.values().next().value;
            if (nextPlayer) {
                nextPlayer.isHost = true;
                newHostId = nextPlayer.id;
                newHostName = nextPlayer.name;
            }
        }

        const publicPlayers = this.getPublicPlayers(room);

        // Notify other clients that player left / disconnected
        this.broadcast(roomCode, {
            type: 'PLAYER_LEFT',
            playerId,
            playerName: player?.name || 'Piloto',
            wasHost,
            newHostId,
            newHostName,
            players: publicPlayers,
            status: room.status,
            maxRounds: room.maxRounds,
        });

        this.broadcast(roomCode, {
            type: 'ROOM_UPDATE',
            roomCode,
            players: publicPlayers,
            status: room.status,
            leftPlayerId: playerId,
            maxRounds: room.maxRounds,
        });
    }

    private getOrCreateRoom(code: string): Room {
        let room = this.rooms.get(code);
        if (!room) {
            room = {
                code,
                status: 'lobby',
                currentRound: 1,
                maxRounds: 4,
                players: new Map(),
                createdAt: Date.now(),
            };
            this.rooms.set(code, room);
        }
        return room;
    }

    private toPublicPlayer(p: Player): PlayerPublicInfo {
        return {
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            color: p.color,
            x: p.x,
            distance: p.distance,
            speed: p.speed,
            finished: p.finished,
            finishTimeMs: p.finishTimeMs,
            rank: p.rank,
            isQualified: p.isQualified !== false,
        };
    }

    private getPublicPlayers(room: Room): PlayerPublicInfo[] {
        return Array.from(room.players.values()).map(p => this.toPublicPlayer(p));
    }

    private getActivePlayers(room: Room): Player[] {
        return Array.from(room.players.values()).filter(p => room.currentRound === 1 || p.isQualified !== false);
    }

    private sendTo(ws: WebSocket, data: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    private broadcast(roomCode: string, data: any, excludePlayerId?: string): void {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const raw = JSON.stringify(data);
        for (const [id, player] of room.players) {
            if (excludePlayerId && id === excludePlayerId) continue;
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(raw);
            }
        }
    }
}

export const roomManager = new RoomManager();
export function setupRoomServer(httpServer: HttpServer): void {
    roomManager.init(httpServer);
}
