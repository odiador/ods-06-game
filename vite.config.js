import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        allowedHosts: ['tunnel.odiador.dev'],
    },
});