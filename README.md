# ODS 7 - Red Eléctrica Inteligente y Sostenible

Juego arcade 2D en **Pixel Art** desarrollado con **Phaser 3.90.0**, **TypeScript** y **Vite**, enfocado en el **Objetivo de Desarrollo Sostenible 7 (Energía Asequible y No Contaminante)** y el rol de la ingeniería de sistemas en la transición energética global.

---

## Capturas del Juego (E2E Screenshots)

### Menú Principal y Misión ODS 7
![Menú Principal ODS 7](./screenshots/e2e-menu-scene.png)

### Gameplay en PC Desktop (Parallax, Efectos WebGL y Combos)
![Gameplay en PC Desktop](./screenshots/desktop-1080p-gameplay.png)

---

## Mecánicas y Arquitectura

1. **Escenario Parallax y Atmósfera Retro**:
   - Cielo nocturno profundo con estrellas titilantes.
   - Nubes pixel art en desplazamiento continuo (`clouds.png`).
   - Silueta de ciudad inteligente ecológica con ventanas LED activas (`city_skyline.png`).
   - Plataforma de subestación eléctrica con conductos de neón pulsantes (`substation_floor.png`).
2. **Game Feel (Juice)**:
   - *Squash & stretch* al cambiar de dirección con estela de partículas de polvo.
   - Atracción magnética sutil hacia el técnico cuando los orbes limpios están cerca.
   - Sistema de racha de combos (hasta x5) con multiplicadores de puntuación.
   - *Hit-stop* (micro-congelamiento de 45ms) y sacudida de pantalla al impactar sobrecargas o emisiones fósiles.
3. **Sintetizador Procedural Web Audio**:
   - Efectos de sonido generados en tiempo real mediante la Web Audio API nativa (arpegios armónicos, fanfarrias y descargas eléctricas) con botón de silencio en el HUD.
4. **TypeScript Estricto**:
   - Escenas, GameObjects y sistema desacoplado de eventos (`EventBus`) fuertemente tipados.

---

## Ejecución Local

### Instalación de dependencias:
```bash
pnpm install
```

### Servidor de desarrollo:
```bash
pnpm run dev
```

### Pruebas End-to-End automatizadas con Playwright:
```bash
pnpm run test:e2e
```

### Compilación para producción:
```bash
pnpm run build
```