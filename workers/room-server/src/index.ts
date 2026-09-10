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

const PLAYER_COLORS = [
    0x0284C7, // Cyan / Sky Blue (Player 1)
    0xF59E0B, // Amber / Gold (Player 2)
    0x10B981, // Emerald Green (Player 3)
    0xEC4899, // Pink / Magenta (Player 4)
];

export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'finished';

export type ClientMessage =
    | { type: 'JOIN_ROOM'; roomCode?: string; playerName?: string }
    | { type: 'START_RACE'; roomCode?: string }
    | { type: 'PLAYER_UPDATE'; roomCode?: string; playerId?: string; x?: number; distance?: number; speed?: number }
    | { type: 'FINISH_RACE'; roomCode?: string; playerId?: string; timeMs?: number; kwh?: number }
    | { type: 'LEAVE_ROOM' };

export type ServerMessage =
    | { type: 'ROOM_JOINED'; playerId: string; roomCode: string; isHost: boolean; players: PlayerData[]; status: RoomStatus }
    | { type: 'ROOM_UPDATE'; roomCode?: string; players: PlayerData[]; status: RoomStatus; leftPlayerId?: string }
    | { type: 'RACE_COUNTDOWN'; countdownSeconds: number }
    | { type: 'RACE_STARTED' }
    | { type: 'PLAYERS_STATE'; players: PlayerData[] }
    | { type: 'PLAYER_FINISHED'; playerId: string; name: string; rank: number; finishTimeMs: number; kwh: number };

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
                    const isHost = all.length === 0;
                    const colorIndex = all.length % PLAYER_COLORS.length;

                    const player: PlayerData = {
                        id: playerId,
                        name: playerName,
                        isHost,
                        color: PLAYER_COLORS[colorIndex],
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

                    currentData.finished = true;
                    currentData.finishTimeMs = Number(msg.timeMs) || Date.now();

                    const all = this.getAllPlayers();
                    const finishedCount = all.filter(p => p.finished).length;
                    currentData.rank = finishedCount;
                    ws.serializeAttachment(currentData);

                    this.broadcast({
                        type: 'PLAYER_FINISHED',
                        playerId: currentData.id,
                        name: currentData.name,
                        rank: currentData.rank,
                        finishTimeMs: currentData.finishTimeMs,
                        kwh: msg.kwh || 0,
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
