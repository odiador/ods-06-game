import { defineConfig, Plugin } from 'vite';
import { setupRoomServer } from './server/roomServer';

function roomServerPlugin(): Plugin {
    return {
        name: 'room-server-plugin',
        configureServer(server) {
            if (server.httpServer) {
                setupRoomServer(server.httpServer);
            }
        },
        configurePreviewServer(server) {
            if (server.httpServer) {
                setupRoomServer(server.httpServer);
            }
        },
    };
}

export default defineConfig({
    base: './',
    plugins: [roomServerPlugin()],
    server: {
        allowedHosts: ['tunnel.odiador.dev'],
    },
});
