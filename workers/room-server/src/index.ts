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

export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'finished';

export type ClientMessage =
    | { type: 'JOIN_ROOM'; roomCode?: string; playerName?: string }
    | { type: 'START_RACE'; roomCode?: string }
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
    | { type: 'ROOM_JOINED'; playerId: string; roomCode: string; isHost: boolean; players: PlayerData[]; status: RoomStatus }
    | { type: 'ROOM_UPDATE'; roomCode?: string; players: PlayerData[]; status: RoomStatus; leftPlayerId?: string }
    | { type: 'ROOM_ERROR'; message: string }
    | { type: 'RACE_COUNTDOWN'; countdownSeconds: number }
    | { type: 'RACE_STARTED' }
    | { type: 'PLAYERS_STATE'; players: PlayerData[] }
    | { type: 'PLAYER_FINISHED'; playerId: string; name: string; rank: number; finishTimeMs: number; kwh: number; podium?: PodiumEntry[]; totalPlayers?: number };

export class RoomDurableObject extends DurableObject {
    private roomStatus: RoomStatus = 'lobby';

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
                    if (all.length >= MAX_PLAYERS_PER_ROOM) {
                        ws.send(JSON.stringify({
                            type: 'ROOM_ERROR',
                            message: 'SALA LLENA (MAX 50 PILOTOS)'
                        }));
                        return;
                    }

                    const isHost = all.length === 0;
                    const playerColor = getPlayerColor(all.length);

                    const player: PlayerData = {
                        id: playerId,
                        name: playerName,
                        isHost,
                        color: playerColor,
                        x: 240,
                        distance: 0,
                        speed: 45,
                        finished: false,
                        finishTimeMs: 0,
                        rank: 0,
                    };

                    ws.serializeAttachment(player);

                    const updatedPlayers = this.getAllPlayers();

                    // Confirm to connecting client
                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        playerId,
                        roomCode,
                        isHost,
                        players: updatedPlayers,
                        status: this.roomStatus,
                    }));

                    // Broadcast update to all peers in room
                    this.broadcast({
                        type: 'ROOM_UPDATE',
                        roomCode,
                        players: updatedPlayers,
                        status: this.roomStatus,
                    }, ws);

                    break;
                }

                case 'START_RACE': {
                    this.roomStatus = 'countdown';
                    this.broadcast({
                        type: 'RACE_COUNTDOWN',
                        countdownSeconds: 3,
                    });

                    // Countdown timer
                    setTimeout(() => {
                        this.roomStatus = 'racing';
                        this.broadcast({
                            type: 'RACE_STARTED',
                        });
                    }, 3000);
                    break;
                }

                case 'PLAYER_UPDATE': {
                    if (!currentData) return;

                    if (typeof msg.x === 'number') currentData.x = msg.x;
                    if (typeof msg.distance === 'number') currentData.distance = msg.distance;
                    if (typeof msg.speed === 'number') currentData.speed = msg.speed;

                    ws.serializeAttachment(currentData);

                    // Broadcast all player positions
                    this.broadcast({
                        type: 'PLAYERS_STATE',
                        players: this.getAllPlayers(),
                    }, ws);
                    break;
                }

                case 'FINISH_RACE': {
                    if (!currentData || currentData.finished) return;

                    const allBefore = this.getAllPlayers();
                    const alreadyFinished = allBefore.filter(p => p.finished).length;

                    currentData.finished = true;
                    currentData.finishTimeMs = Number(msg.timeMs) || Date.now();
                    currentData.rank = alreadyFinished + 1;
                    ws.serializeAttachment(currentData);

                    const allAfter = this.getAllPlayers();
                    const finishedList = allAfter
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

                    this.broadcast({
                        type: 'PLAYER_FINISHED',
                        playerId: currentData.id,
                        name: currentData.name,
                        rank: currentData.rank,
                        finishTimeMs: currentData.finishTimeMs,
                        kwh: msg.kwh || 0,
                        podium,
                        totalPlayers: allAfter.length
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

        // If host left, assign new host
        if (leavingPlayer?.isHost && remaining.length > 0) {
            const nextWs = this.ctx.getWebSockets().find(s => s !== ws);
            if (nextWs) {
                const hostData = nextWs.deserializeAttachment() as PlayerData | null;
                if (hostData) {
                    hostData.isHost = true;
                    nextWs.serializeAttachment(hostData);
                }
            }
        }

        this.broadcast({
            type: 'ROOM_UPDATE',
            players: this.getAllPlayers(),
            status: this.roomStatus,
            leftPlayerId: leavingPlayer?.id,
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
