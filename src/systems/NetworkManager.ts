import { EventBus, GameEvents } from './EventBus';

export interface RemotePlayerInfo {
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

export interface PodiumEntry {
    rank: number;
    playerId: string;
    name: string;
    finishTimeMs: number;
    timeSec: string;
    color?: number;
}

export class NetworkManager {
    private static instance?: NetworkManager;

    private socket?: WebSocket;
    public playerId: string | null = null;
    public roomCode: string | null = null;
    public playerName: string = 'Piloto';
    public isHost: boolean = false;
    public isInRoom: boolean = false;
    public roomPlayers: RemotePlayerInfo[] = [];
    public roomPodium: PodiumEntry[] = [];
    public myFinishRank: number = 0;
    public totalPlayersInRoom: number = 1;

    private sendThrottleTimer: number = 0;

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    public isMultiplayerActive(): boolean {
        return this.isInRoom && this.socket?.readyState === WebSocket.OPEN;
    }

    public connect(roomCode?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const query = roomCode ? `?room=${encodeURIComponent(roomCode.trim().toUpperCase())}` : '';

            const candidateUrls: string[] = [];
            if (isLocal) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                candidateUrls.push(`${protocol}//${window.location.host}/ws${query}`);
            } else {
                const customDomain = (import.meta as any).env?.VITE_ROOM_SERVER_URL || 'wss://ods07-rooms.odiador.dev/ws';
                candidateUrls.push(`${customDomain}${query}`);
                candidateUrls.push(`wss://ods07-roomserver.arroa03.workers.dev/ws${query}`);
            }

            const tryConnect = (index: number) => {
                if (index >= candidateUrls.length) {
                    console.warn('[NetworkManager] All WebSocket connection candidates failed');
                    resolve(false);
                    return;
                }

                const targetUrl = candidateUrls[index];
                try {
                    const ws = new WebSocket(targetUrl);
                    let hasOpened = false;

                    ws.onopen = () => {
                        hasOpened = true;
                        this.socket = ws;
                        console.log('[NetworkManager] Connected to room server at', targetUrl);
                        resolve(true);
                    };

                    ws.onerror = (err) => {
                        console.warn(`[NetworkManager] Failed connecting to ${targetUrl}:`, err);
                        if (!hasOpened) {
                            try { ws.close(); } catch {}
                            tryConnect(index + 1);
                        }
                    };

                    ws.onclose = () => {
                        if (hasOpened) {
                            console.log('[NetworkManager] Disconnected from room server');
                            this.isInRoom = false;
                            EventBus.emit(GameEvents.ROOM_LEFT);
                        }
                    };

                    ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this.handleServerMessage(data);
                        } catch (e) {
                            console.error('[NetworkManager] Malformed message from server', e);
                        }
                    };
                } catch (e) {
                    console.warn(`[NetworkManager] Exception connecting to ${targetUrl}:`, e);
                    tryConnect(index + 1);
                }
            };

            tryConnect(0);
        });
    }

    private handleServerMessage(data: any): void {
        switch (data.type) {
            case 'ROOM_JOINED':
                this.playerId = data.playerId;
                this.roomCode = data.roomCode;
                this.isHost = data.isHost;
                this.isInRoom = true;
                this.roomPlayers = data.players || [];
                EventBus.emit(GameEvents.ROOM_JOINED, data);
                break;

            case 'ROOM_UPDATE':
                this.roomPlayers = data.players || [];
                EventBus.emit(GameEvents.ROOM_UPDATED, data);
                break;

            case 'RACE_COUNTDOWN':
                EventBus.emit(GameEvents.RACE_COUNTDOWN, data);
                break;

            case 'RACE_STARTED':
                this.roomPodium = [];
                this.myFinishRank = 0;
                EventBus.emit(GameEvents.RACE_STARTED, data);
                break;

            case 'PLAYERS_STATE':
                this.roomPlayers = data.players || [];
                EventBus.emit(GameEvents.PLAYERS_STATE, data.players);
                break;

            case 'PLAYER_FINISHED':
                if (data.playerId === this.playerId) {
                    this.myFinishRank = data.rank;
                }
                if (data.podium && Array.isArray(data.podium)) {
                    this.roomPodium = data.podium;
                }
                if (data.totalPlayers) {
                    this.totalPlayersInRoom = data.totalPlayers;
                }
                EventBus.emit(GameEvents.PLAYER_FINISHED, data);
                break;

            case 'PLAYER_LEFT':
                this.roomPlayers = data.players || [];
                if (data.newHostId === this.playerId) {
                    this.isHost = true;
                }
                EventBus.emit(GameEvents.PLAYER_LEFT, data);
                break;

            case 'ROOM_ERROR':
                EventBus.emit(GameEvents.ROOM_ERROR, data.message || 'Error en la sala');
                break;
        }
    }

    public async joinRoom(roomCode: string, playerName: string): Promise<boolean> {
        const normalizedCode = roomCode.trim().toUpperCase().slice(0, 8) || 'ODS7';

        if (this.socket && this.roomCode && this.roomCode !== normalizedCode) {
            this.leaveRoom();
        }

        const connected = await this.connect(normalizedCode);
        if (!connected) return false;

        this.playerName = playerName;
        this.send({
            type: 'JOIN_ROOM',
            roomCode: normalizedCode,
            playerName,
        });
        return true;
    }

    public startRace(round: number = 1): void {
        if (!this.isMultiplayerActive() || !this.roomCode) return;
        this.send({
            type: 'START_RACE',
            roomCode: this.roomCode,
            playerId: this.playerId,
            round,
        });
    }

    public sendPlayerUpdate(x: number, distance: number, speed: number): void {
        if (!this.isMultiplayerActive() || !this.roomCode || !this.playerId) return;

        const now = Date.now();
        if (now - this.sendThrottleTimer < 100) return; // 10 Hz (10 updates/sec - optimized for 50 players)
        this.sendThrottleTimer = now;

        this.send({
            type: 'PLAYER_UPDATE',
            roomCode: this.roomCode,
            playerId: this.playerId,
            x: Math.round(x),
            distance: Math.round(distance),
            speed: Math.round(speed),
        });
    }

    public finishRace(timeMs: number, kwh: number): void {
        if (!this.isMultiplayerActive() || !this.roomCode || !this.playerId) return;
        this.send({
            type: 'FINISH_RACE',
            roomCode: this.roomCode,
            playerId: this.playerId,
            timeMs,
            kwh,
        });
    }

    public leaveRoom(): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.send({ type: 'LEAVE_ROOM' });
            try {
                this.socket.close();
            } catch {}
        }
        this.socket = undefined;
        this.isInRoom = false;
        this.roomCode = null;
        this.playerId = null;
    }

    private send(data: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
}

export const networkManager = NetworkManager.getInstance();
