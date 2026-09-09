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
}

export interface Room {
    code: string;
    status: 'lobby' | 'countdown' | 'racing' | 'finished';
    players: Map<string, Player>;
    createdAt: number;
}

const PLAYER_COLORS = [
    0x0284C7, // Cyan / Sky Blue (Player 1)
    0xF59E0B, // Amber / Gold (Player 2)
    0x10B981, // Emerald Green (Player 3)
    0xEC4899, // Pink / Magenta (Player 4)
];

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
                const isHost = room.players.size === 0;
                const colorIndex = room.players.size % PLAYER_COLORS.length;

                const player: Player = {
                    id: playerId,
                    ws,
                    name: playerName,
                    roomCode,
                    isHost,
                    color: PLAYER_COLORS[colorIndex],
                    x: 240,
                    distance: 0,
                    speed: 45,
                    finished: false,
                    finishTimeMs: 0,
                    rank: 0,
                };

                room.players.set(playerId, player);
                setSession(playerId, roomCode);

                // Confirm join to client
                this.sendTo(ws, {
                    type: 'ROOM_JOINED',
                    playerId,
                    roomCode,
                    isHost,
                    players: this.getPublicPlayers(room),
                    status: room.status,
                });

                // Notify others in room
                this.broadcast(roomCode, {
                    type: 'ROOM_UPDATE',
                    roomCode,
                    players: this.getPublicPlayers(room),
                    status: room.status,
                }, playerId);

                break;
            }

            case 'START_RACE': {
                const roomCode = String(msg.roomCode || '').toUpperCase();
                const room = this.rooms.get(roomCode);
                if (!room) return;

                room.status = 'countdown';
                this.broadcast(roomCode, {
                    type: 'RACE_COUNTDOWN',
                    countdownSeconds: 3,
                });

                // Auto transition to racing
                setTimeout(() => {
                    if (this.rooms.has(roomCode)) {
                        room.status = 'racing';
                        this.broadcast(roomCode, {
                            type: 'RACE_STARTED',
                        });
                    }
                }, 3000);
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
                    players: this.getPublicPlayers(room),
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

                player.finished = true;
                player.finishTimeMs = Number(msg.timeMs) || Date.now();
                
                const finishedCount = Array.from(room.players.values()).filter(p => p.finished).length;
                player.rank = finishedCount;

                this.broadcast(roomCode, {
                    type: 'PLAYER_FINISHED',
                    playerId,
                    name: player.name,
                    rank: player.rank,
                    finishTimeMs: player.finishTimeMs,
                    kwh: msg.kwh || 0,
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

        // If host left, appoint new host
        if (player?.isHost) {
            const nextPlayer = room.players.values().next().value;
            if (nextPlayer) {
                nextPlayer.isHost = true;
            }
        }

        this.broadcast(roomCode, {
            type: 'ROOM_UPDATE',
            roomCode,
            players: this.getPublicPlayers(room),
            status: room.status,
            leftPlayerId: playerId,
        });
    }

    private getOrCreateRoom(code: string): Room {
        let room = this.rooms.get(code);
        if (!room) {
            room = {
                code,
                status: 'lobby',
                players: new Map(),
                createdAt: Date.now(),
            };
            this.rooms.set(code, room);
        }
        return room;
    }

    private getPublicPlayers(room: Room): PlayerPublicInfo[] {
        return Array.from(room.players.values()).map(p => ({
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
        }));
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
