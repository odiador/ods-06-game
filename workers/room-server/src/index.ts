import { DurableObject } from 'cloudflare:workers';

export interface Env {
    ROOMS: DurableObjectNamespace<RoomDurableObject>;
}

export interface PlayerData {
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

export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'finished';

export type ClientMessage =
    | { type: 'JOIN_ROOM'; roomCode?: string; playerName?: string }
    | { type: 'START_RACE'; roomCode?: string; round?: number }
    | { type: 'PLAYER_UPDATE'; roomCode?: string; playerId?: string; x?: number; distance?: number; speed?: number }
    | { type: 'FINISH_RACE'; roomCode?: string; playerId?: string; timeMs?: number; kwh?: number }
    | { type: 'LEAVE_ROOM' };

export interface PodiumEntry {
    rank: number;
    playerId: string;
    name: string;
    finishTimeMs: number;
    timeSec: string;
    color: number;
}

export type ServerMessage =
    | { type: 'ROOM_JOINED'; playerId: string; roomCode: string; isHost: boolean; players: PlayerData[]; status: RoomStatus; round?: number; maxRounds?: number }
    | { type: 'ROOM_UPDATE'; roomCode?: string; players: PlayerData[]; status: RoomStatus; leftPlayerId?: string; round?: number; maxRounds?: number }
    | { type: 'ROOM_ERROR'; message: string }
    | { type: 'RACE_COUNTDOWN'; countdownSeconds: number; round?: number; maxRounds?: number; startAt?: number; serverTime?: number; players?: PlayerData[] }
    | { type: 'RACE_STARTED'; round?: number; maxRounds?: number; startAt?: number }
    | { type: 'PLAYERS_STATE'; players: PlayerData[] }
    | { type: 'PLAYER_FINISHED'; playerId: string; name: string; rank: number; finishTimeMs: number; kwh: number; podium?: PodiumEntry[]; totalPlayers?: number; cutoff?: number; maxRounds?: number; firstHalfComplete?: boolean; finishedCount?: number }
    | { type: 'PLAYER_LEFT'; playerId: string; playerName?: string; wasHost?: boolean; newHostId?: string; newHostName?: string; players?: PlayerData[]; status?: RoomStatus; maxRounds?: number };

export class RoomDurableObject extends DurableObject {
    private roomStatus: RoomStatus = 'lobby';
    private currentRound: number = 1;
    private maxRounds: number = 4;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    async fetch(request: Request): Promise<Response> {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const [client, server] = Object.values(new WebSocketPair());
        this.ctx.acceptWebSocket(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    private getAllPlayers(): PlayerData[] {
        const sockets = this.ctx.getWebSockets();
        const list: PlayerData[] = [];
        for (const ws of sockets) {
            const data = ws.deserializeAttachment() as PlayerData | null;
            if (data) list.push(data);
        }
        return list;
    }

    private getActivePlayers(): PlayerData[] {
        return this.getAllPlayers().filter(p => this.currentRound === 1 || p.isQualified !== false);
    }

    private broadcast(data: ServerMessage, excludeWs?: WebSocket): void {
        const payload = JSON.stringify(data);
        const sockets = this.ctx.getWebSockets();
        for (const ws of sockets) {
            if (excludeWs && ws === excludeWs) continue;
            try {
                ws.send(payload);
            } catch (err) {
                // Ignore closed sockets
            }
        }
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== 'string') return;

        try {
            const msg = JSON.parse(message) as ClientMessage;
            const currentData = ws.deserializeAttachment() as PlayerData | null;

            switch (msg.type) {
                case 'JOIN_ROOM': {
                    const roomCode = String(msg.roomCode || 'ODS7').trim().toUpperCase().slice(0, 8);
                    const playerName = String(msg.playerName || 'Piloto').trim().slice(0, 12) || 'Piloto';
                    const playerId = Math.random().toString(36).substring(2, 9);

                    const all = this.getAllPlayers();
                    if (this.roomStatus === 'countdown' || this.roomStatus === 'racing') {
                        ws.send(JSON.stringify({
                            type: 'ROOM_ERROR',
                            message: 'CARRERA EN CURSO (NO SE PUEDE UNIR)'
                        }));
                        return;
                    }

                    if (all.length >= MAX_PLAYERS_PER_ROOM) {
                        ws.send(JSON.stringify({
                            type: 'ROOM_ERROR',
                            message: 'SALA LLENA (MAX 50 PILOTOS)'
                        }));
                        return;
                    }

                    const isHost = all.length === 0;
                    const playerColor = getPlayerColor(all.length);
                    const startingX = getStartingGridX(all.length, all.length + 1);

                    const player: PlayerData = {
                        id: playerId,
                        name: playerName,
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

                    ws.serializeAttachment(player);

                    const updatedPlayers = this.getAllPlayers();
                    this.maxRounds = computeTournamentMaxRounds(updatedPlayers.length);

                    // Confirm to connecting client
                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        playerId,
                        roomCode,
                        isHost,
                        players: updatedPlayers,
                        status: this.roomStatus,
                        maxRounds: this.maxRounds,
                        round: this.currentRound,
                    }));

                    // Broadcast update to all peers in room
                    this.broadcast({
                        type: 'ROOM_UPDATE',
                        roomCode,
                        players: updatedPlayers,
                        status: this.roomStatus,
                        maxRounds: this.maxRounds,
                        round: this.currentRound,
                    }, ws);

                    break;
                }

                case 'START_RACE': {
                    if (currentData && !currentData.isHost) {
                        ws.send(JSON.stringify({
                            type: 'ROOM_ERROR',
                            message: 'SOLO EL ANFITRION PUEDE CONTINUAR A LA SIGUIENTE RONDA'
                        }));
                        return;
                    }

                    if (this.roomStatus === 'countdown' || this.roomStatus === 'racing') {
                        return;
                    }

                    const allSockets = this.ctx.getWebSockets();
                    let round = Number(msg.round) || this.currentRound || 1;
                    if (round === 1) {
                        this.maxRounds = computeTournamentMaxRounds(allSockets.length);
                        for (const s of allSockets) {
                            const p = s.deserializeAttachment() as PlayerData | null;
                            if (p) {
                                p.isQualified = true;
                                s.serializeAttachment(p);
                            }
                        }
                    }
                    if (round > this.maxRounds) {
                        round = 1;
                        this.maxRounds = computeTournamentMaxRounds(allSockets.length);
                        for (const s of allSockets) {
                            const p = s.deserializeAttachment() as PlayerData | null;
                            if (p) {
                                p.isQualified = true;
                                s.serializeAttachment(p);
                            }
                        }
                    }
                    this.currentRound = round;
                    this.roomStatus = 'countdown';

                    const activeSockets = allSockets.filter(s => {
                        const p = s.deserializeAttachment() as PlayerData | null;
                        return p && (round === 1 || p.isQualified !== false);
                    });
                    const totalActive = activeSockets.length;

                    // Reset player race stats for the round and assign grid positions
                    let pIdx = 0;
                    for (const s of activeSockets) {
                        const p = s.deserializeAttachment() as PlayerData | null;
                        if (p) {
                            p.finished = false;
                            p.finishTimeMs = 0;
                            p.distance = 0;
                            p.speed = 45;
                            p.rank = 0;
                            p.x = getStartingGridX(pIdx, totalActive);
                            s.serializeAttachment(p);
                            pIdx++;
                        }
                    }

                    const now = Date.now();
                    const countdownSeconds = 3;
                    const startAt = now + 3500;

                    this.broadcast({
                        type: 'RACE_COUNTDOWN',
                        countdownSeconds,
                        round,
                        maxRounds: this.maxRounds,
                        startAt,
                        serverTime: now,
                        players: this.getActivePlayers(),
                    });

                    // Countdown timer
                    const delayMs = Math.max(0, startAt - Date.now());
                    setTimeout(() => {
                        if (this.roomStatus === 'countdown') {
                            this.roomStatus = 'racing';
                            this.broadcast({
                                type: 'RACE_STARTED',
                                round,
                                maxRounds: this.maxRounds,
                                startAt,
                            });
                        }
                    }, delayMs);
                    break;
                }

                case 'PLAYER_UPDATE': {
                    if (!currentData) return;

                    if (typeof msg.x === 'number') currentData.x = msg.x;
                    if (typeof msg.distance === 'number') currentData.distance = msg.distance;
                    if (typeof msg.speed === 'number') currentData.speed = msg.speed;

                    ws.serializeAttachment(currentData);

                    // Broadcast all active player positions
                    this.broadcast({
                        type: 'PLAYERS_STATE',
                        players: this.getActivePlayers(),
                    }, ws);
                    break;
                }

                case 'FINISH_RACE': {
                    if (!currentData || currentData.finished) return;

                    const activeBefore = this.getActivePlayers();
                    const alreadyFinished = activeBefore.filter(p => p.finished).length;

                    currentData.finished = true;
                    currentData.finishTimeMs = Number(msg.timeMs) || Date.now();
                    currentData.rank = Math.min(activeBefore.length, alreadyFinished + 1);

                    const activeAfter = this.getActivePlayers();
                    const finishedList = activeAfter
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

                    const totalPlayers = activeAfter.length;
                    const cutoff = computeQualificationCutoff(this.currentRound, this.maxRounds, totalPlayers);
                    const firstHalfComplete = finishedList.length >= cutoff;

                    currentData.isQualified = currentData.rank <= cutoff;
                    ws.serializeAttachment(currentData);

                    if (firstHalfComplete && (this.roomStatus === 'racing' || this.roomStatus === 'countdown')) {
                        this.roomStatus = 'finished';
                        // Disqualify any active racer who did not finish by cutoff
                        for (const s of this.ctx.getWebSockets()) {
                            const p = s.deserializeAttachment() as PlayerData | null;
                            if (p && !p.finished) {
                                p.isQualified = false;
                                s.serializeAttachment(p);
                            }
                        }
                    }

                    this.broadcast({
                        type: 'PLAYER_FINISHED',
                        playerId: currentData.id,
                        name: currentData.name,
                        rank: currentData.rank,
                        finishTimeMs: currentData.finishTimeMs,
                        kwh: msg.kwh || 0,
                        podium,
                        totalPlayers,
                        cutoff,
                        maxRounds: this.maxRounds,
                        firstHalfComplete,
                        finishedCount: finishedList.length
                    });
                    break;
                }
            }
        } catch (e) {
            console.error('[RoomDO] Error handling message:', e);
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean): Promise<void> {
        const leavingPlayer = ws.deserializeAttachment() as PlayerData | null;
        ws.close(code, reason);

        const remaining = this.getAllPlayers();
        this.maxRounds = computeTournamentMaxRounds(remaining.length);
        let newHostId: string | undefined;
        let newHostName: string | undefined;
        const wasHost = leavingPlayer?.isHost === true;

        // If host left, assign new host
        if (wasHost && remaining.length > 0) {
            const nextWs = this.ctx.getWebSockets().find(s => s !== ws);
            if (nextWs) {
                const hostData = nextWs.deserializeAttachment() as PlayerData | null;
                if (hostData) {
                    hostData.isHost = true;
                    newHostId = hostData.id;
                    newHostName = hostData.name;
                    nextWs.serializeAttachment(hostData);
                }
            }
        }

        const remainingPlayers = this.getAllPlayers();

        this.broadcast({
            type: 'PLAYER_LEFT',
            playerId: leavingPlayer?.id || '',
            playerName: leavingPlayer?.name || 'Piloto',
            wasHost,
            newHostId,
            newHostName,
            players: remainingPlayers,
            status: this.roomStatus,
            maxRounds: this.maxRounds,
        });

        this.broadcast({
            type: 'ROOM_UPDATE',
            players: remainingPlayers,
            status: this.roomStatus,
            leftPlayerId: leavingPlayer?.id,
            maxRounds: this.maxRounds,
        });
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'ODS 7 Room Server (Cloudflare Durable Objects)',
                time: new Date().toISOString()
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }

        if (request.headers.get('Upgrade') === 'websocket') {
            const roomParam = url.searchParams.get('room') || 'ODS7';
            const roomCode = roomParam.trim().toUpperCase().slice(0, 8);

            const id = env.ROOMS.idFromName(roomCode);
            const roomStub = env.ROOMS.get(id);
            return roomStub.fetch(request);
        }

        return new Response('Not found', { status: 404 });
    }
};
