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

export class NetworkManager {
    private static instance?: NetworkManager;

    private socket?: WebSocket;
    public playerId: string | null = null;
    public roomCode: string | null = null;
    public playerName: string = 'Piloto';
    public isHost: boolean = false;
    public isInRoom: boolean = false;
    public roomPlayers: RemotePlayerInfo[] = [];

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

    public connect(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            try {
                this.socket = new WebSocket(wsUrl);

                this.socket.onopen = () => {
                    console.log('[NetworkManager] Connected to room server at', wsUrl);
                    resolve(true);
                };

                this.socket.onerror = (err) => {
                    console.warn('[NetworkManager] WebSocket error:', err);
                    resolve(false);
                };

                this.socket.onclose = () => {
                    console.log('[NetworkManager] Disconnected from room server');
                    this.isInRoom = false;
                    EventBus.emit(GameEvents.ROOM_LEFT);
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleServerMessage(data);
                    } catch (e) {
                        console.error('[NetworkManager] Malformed message from server', e);
                    }
                };
            } catch (e) {
                console.error('[NetworkManager] Failed to create WebSocket', e);
                resolve(false);
            }
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
                EventBus.emit(GameEvents.RACE_STARTED, data);
                break;

            case 'PLAYERS_STATE':
                this.roomPlayers = data.players || [];
                EventBus.emit(GameEvents.PLAYERS_STATE, data.players);
                break;

            case 'PLAYER_FINISHED':
                EventBus.emit(GameEvents.PLAYER_FINISHED, data);
                break;
        }
    }

    public async joinRoom(roomCode: string, playerName: string): Promise<boolean> {
        const connected = await this.connect();
        if (!connected) return false;

        this.playerName = playerName;
        this.send({
            type: 'JOIN_ROOM',
            roomCode,
            playerName,
        });
        return true;
    }

    public startRace(): void {
        if (!this.isMultiplayerActive() || !this.roomCode) return;
        this.send({
            type: 'START_RACE',
            roomCode: this.roomCode,
        });
    }

    public sendPlayerUpdate(x: number, distance: number, speed: number): void {
        if (!this.isMultiplayerActive() || !this.roomCode || !this.playerId) return;

        const now = Date.now();
        if (now - this.sendThrottleTimer < 40) return; // ~25 updates/sec
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
        }
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
