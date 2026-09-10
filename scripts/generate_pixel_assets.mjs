import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal PNG encoder in pure JS using zlib
function createPNG(width, height, getPixel) {
    // getPixel(x, y) returns [r, g, b, a] (0-255)
    const scanlines = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;

    for (let y = 0; y < height; y++) {
        scanlines[offset++] = 0; // Filter type 0 (None)
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = getPixel(x, y);
            scanlines[offset++] = r;
            scanlines[offset++] = g;
            scanlines[offset++] = b;
            scanlines[offset++] = a;
        }
    }

    const compressed = zlib.deflateSync(scanlines);

    function crc32(buf) {
        let c = 0xffffffff;
        for (let n = 0; n < buf.length; n++) {
            c ^= buf[n];
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    function makeChunk(type, data) {
        const typeBuf = Buffer.from(type, 'ascii');
        const lengthBuf = Buffer.alloc(4);
        lengthBuf.writeUInt32BE(data.length, 0);

        const crcBuf = Buffer.alloc(4);
        const toCrc = Buffer.concat([typeBuf, data]);
        crcBuf.writeUInt32BE(crc32(toCrc), 0);

        return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
    }

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // Bit depth
    ihdr[9] = 6; // Color type (RGBA)
    ihdr[10] = 0; // Compression
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace

    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Helper to convert hex to RGBA
function hexToRgba(hex, a = 255) {
    const num = parseInt(hex.replace('#', ''), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, a];
}

const TRANSPARENT = [0, 0, 0, 0];

// ── 1. SOLAR PANEL (32x32) ──
function drawSolarPanel(x, y) {
    // Aluminum outer frame: x: 4..27, y: 8..26
    if (x < 4 || x > 27 || y < 6 || y > 25) return TRANSPARENT;
    // Outer border
    if (x === 4 || x === 27 || y === 6 || y === 25) return hexToRgba('#94A3B8');
    if (x === 5 || x === 26 || y === 7 || y === 24) return hexToRgba('#64748B');

    // Solar cells internal grid (4x3 cells)
    const cx = x - 6;
    const cy = y - 8;
    // Grid dividers
    if (cx % 5 === 4 || cy % 5 === 4) return hexToRgba('#93C5FD'); // light blue grid wire

    // Sun reflection glare (diagonal line)
    if (cx + cy >= 8 && cx + cy <= 11) return hexToRgba('#60A5FA');
    if (cx + cy >= 12 && cx + cy <= 14) return hexToRgba('#93C5FD');

    // Deep blue photovoltaic silicon
    return hexToRgba('#1D4ED8');
}

// ── 2. WIND TURBINE (32x32) ──
function drawWindTurbine(x, y) {
    // Tower base: x: 14..17, y: 15..30
    if (y >= 15 && y <= 30) {
        if (x >= 14 && x <= 17) {
            if (x === 14 || x === 17) return hexToRgba('#94A3B8');
            return hexToRgba('#F8FAFC');
        }
    }
    // Tower foundation
    if (y >= 29 && y <= 31 && x >= 12 && x <= 19) return hexToRgba('#64748B');

    // Nacelle hub center (15, 14)
    const dx = x - 15.5;
    const dy = y - 13.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 2.5) return hexToRgba('#0284C7'); // Cyan hub center
    if (dist <= 3.5) return hexToRgba('#F8FAFC');

    // Blade 1: Upward (y: 2..12, x: 14..16)
    if (y >= 2 && y <= 12 && Math.abs(x - 15.5) <= (1.2 - (13 - y) * 0.06)) return hexToRgba('#F8FAFC');
    // Blade 2: Bottom-right
    const dx2 = x - 15.5;
    const dy2 = y - 13.5;
    // angled line ~ 30 deg below horizontal right
    if (dx2 > 1 && dx2 < 14 && Math.abs(dy2 - dx2 * 0.58) <= 1.2) return hexToRgba('#E2E8F0');
    // Blade 3: Bottom-left
    if (dx2 < -1 && dx2 > -14 && Math.abs(dy2 - (-dx2) * 0.58) <= 1.2) return hexToRgba('#E2E8F0');

    // Cyan energy swirl particle
    if (x === 15 && y === 13) return hexToRgba('#38BDF8');

    return TRANSPARENT;
}

// ── 3. CLEAN BATTERY (32x32) ──
function drawBattery(x, y) {
    // Top terminal: x: 13..18, y: 4..6
    if (x >= 13 && x <= 18 && y >= 4 && y <= 6) return hexToRgba('#E2E8F0');

    // Body: x: 7..24, y: 7..27
    if (x < 7 || x > 24 || y < 7 || y > 27) return TRANSPARENT;
    // Outer casing
    if (x === 7 || x === 24 || y === 7 || y === 27) return hexToRgba('#0F172A');
    if (x === 8 || x === 23 || y === 8 || y === 26) return hexToRgba('#334155');

    // Clean energy level bars (green glow)
    // 3 Charge bars
    if (x >= 10 && x <= 21) {
        if (y >= 21 && y <= 24) return hexToRgba('#22C55E'); // bar 1
        if (y >= 16 && y <= 19) return hexToRgba('#4ADE80'); // bar 2
        if (y >= 11 && y <= 14) return hexToRgba('#86EFAC'); // bar 3
    }

    // Lightning bolt icon in the middle
    if ((x === 16 && y >= 11 && y <= 15) || (x === 15 && y >= 14 && y <= 18) || (x === 14 && y === 17) || (x === 17 && y === 18)) {
        return hexToRgba('#FEF08A');
    }

    return hexToRgba('#1E293B');
}

// ── 4. HYDRO ORB (32x32) ──
function drawHydroOrb(x, y) {
    const dx = x - 15.5;
    const dy = y - 15.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 13) return TRANSPARENT;
    if (dist > 11.5) return hexToRgba('#0284C7', 220); // Outer cyan rim
    if (dist > 9.5) return hexToRgba('#06B6D4'); // Mid water surge

    // Inner wave swirl
    const angle = Math.atan2(dy, dx);
    const wave = Math.sin(angle * 3 + dist * 0.5);
    if (wave > 0.4) return hexToRgba('#67E8F9');
    if (dist < 4) return hexToRgba('#FFFFFF'); // bright white energy core

    return hexToRgba('#0891B2');
}

// ── 5. COAL HAZARD (32x32) ──
function drawCoal(x, y) {
    // Jagged shape
    const dx = x - 15.5;
    const dy = y - 15.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    // Angular bumps
    const bump = Math.sin(x * 1.3) * 1.5 + Math.cos(y * 1.5) * 1.5;
    if (r + bump > 11.5) return TRANSPARENT;

    // Outer dark silhouette
    if (r + bump > 9.5) return hexToRgba('#09090B');

    // Smoldering red/orange fissure crack in the middle
    if (Math.abs(dy - Math.sin(dx * 0.6) * 3) < 1.2 && Math.abs(dx) < 7) {
        if (Math.abs(dx) < 3) return hexToRgba('#F97316'); // Bright ember
        return hexToRgba('#DC2626'); // Red crack
    }

    // Charcoal rock shading
    if (x > y) return hexToRgba('#27272A');
    return hexToRgba('#18181B');
}

// ── 6. OIL BARREL (32x32) ──
function drawOilBarrel(x, y) {
    if (x < 7 || x > 24 || y < 5 || y > 27) return TRANSPARENT;

    // Barrel rims
    if (y === 5 || y === 27 || y === 12 || y === 20) {
        if (x >= 7 && x <= 24) return hexToRgba('#78716C');
    }
    // Outer border
    if (x === 7 || x === 24) return hexToRgba('#1C1917');

    // Hazard yellow-black stripe across middle (y: 14..18)
    if (y >= 14 && y <= 18) {
        if ((x + y) % 6 < 3) return hexToRgba('#EAB308'); // Hazard yellow
        return hexToRgba('#18181B'); // Hazard black
    }

    // Leaking toxic sludge drop (y: 28..31, x: 20..22)
    if (x >= 20 && x <= 22 && y >= 28 && y <= 31) return hexToRgba('#0C0A09');

    // Dark rusted metal barrel body
    if (x < 11) return hexToRgba('#57534E');
    return hexToRgba('#292524');
}

// ── 7. CO2 SMOG CLOUD (32x32) ──
function drawCO2Cloud(x, y) {
    // 3 overlapping circles: (12, 18, r=8), (20, 17, r=9), (16, 12, r=7)
    const d1 = Math.hypot(x - 11, y - 18);
    const d2 = Math.hypot(x - 21, y - 17);
    const d3 = Math.hypot(x - 16, y - 12);

    const inside = d1 < 8 || d2 < 8.5 || d3 < 7.5;
    if (!inside) return TRANSPARENT;

    // Toxic red particulate flecks inside
    if ((x * 17 + y * 23) % 29 === 0) return hexToRgba('#EF4444');

    // Edge highlight
    if (d1 > 6.5 && d2 > 7 && d3 > 6) return hexToRgba('#3F3F46');

    // Dark industrial smog
    if (y < 14) return hexToRgba('#71717A');
    return hexToRgba('#52525B');
}

// ── 8. GRID OVERLOAD SURGE (32x32) ──
function drawSurge(x, y) {
    const dx = x - 15.5;
    const dy = y - 15.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 13) return TRANSPARENT;

    // Chaotic zigzag electrical bolt: from (10, 4) to (22, 28)
    const inBolt =
        (y >= 4 && y <= 10 && Math.abs(x - (12 + (y - 4) * 1.0)) <= 1.5) ||
        (y >= 10 && y <= 16 && Math.abs(x - (18 - (y - 10) * 1.2)) <= 1.5) ||
        (y >= 16 && y <= 22 && Math.abs(x - (11 + (y - 16) * 1.3)) <= 1.5) ||
        (y >= 22 && y <= 28 && Math.abs(x - (19 - (y - 22) * 0.8)) <= 1.5);

    if (inBolt) {
        if (Math.abs(dx) < 2) return hexToRgba('#FFFFFF'); // White hot core
        return hexToRgba('#FDE047'); // Yellow glow
    }

    // Arc discharge sparks
    if (dist > 7 && dist < 11 && (x * y) % 11 === 0) return hexToRgba('#EC4899'); // Neon magenta arc

    return TRANSPARENT;
}

// ── 9. PLAYER: GRID TECHNICIAN (32x32) ──
function drawPlayer(x, y, frame = 0) {
    // Character: Safety helmet, tech visor, eco-suit, tool belt, boots
    // Head & Helmet: x: 10..21, y: 4..12
    if (y >= 4 && y <= 11) {
        if (x >= 11 && x <= 20) {
            // High-vis yellow safety helmet top
            if (y <= 7) return hexToRgba('#FACC15');
            // Cyan visor
            if (y >= 8 && y <= 9 && x >= 13 && x <= 20) return hexToRgba('#00E5FF');
            // Face skin tone
            if (y >= 8 && y <= 11 && x >= 11 && x <= 14) return hexToRgba('#FDBA74');
            return hexToRgba('#CA8A04'); // Helmet shadow
        }
    }

    // Torso / High-vis eco suit: x: 10..21, y: 12..21
    if (y >= 12 && y <= 21) {
        if (x >= 10 && x <= 21) {
            // Reflective safety stripes
            if (y === 15 || y === 16) return hexToRgba('#F8FAFC'); // White reflective stripe
            // ODS 7 Solar gold jacket
            if (x >= 11 && x <= 20) return hexToRgba('#EAB308');
            // Dark arm trims
            return hexToRgba('#1E293B');
        }
    }

    // Tool belt / Energy battery pack on hip: y: 20..22
    if (y >= 20 && y <= 22 && x >= 9 && x <= 22) {
        if (x === 15 || x === 16) return hexToRgba('#10B981'); // Green power LED
        return hexToRgba('#0F172A');
    }

    // Legs / Pants: y: 22..28
    if (y >= 22 && y <= 28) {
        const legOffset = frame === 1 ? (y >= 25 ? 1 : 0) : 0;
        // Left leg: x: 11..14
        if (x >= (11 - legOffset) && x <= (14 - legOffset)) return hexToRgba('#1E293B');
        // Right leg: x: 17..20
        if (x >= (17 + legOffset) && x <= (20 + legOffset)) return hexToRgba('#1E293B');
    }

    // Safety boots: y: 29..31
    if (y >= 29 && y <= 31) {
        const bootOffset = frame === 1 ? 1 : 0;
        if (x >= (10 - bootOffset) && x <= (14 - bootOffset)) return hexToRgba('#F59E0B'); // Orange reinforced steel-toe boot
        if (x >= (17 + bootOffset) && x <= (21 + bootOffset)) return hexToRgba('#F59E0B');
    }

    return TRANSPARENT;
}

// ── 10. SPARK PARTICLE (8x8) ──
function drawSpark(x, y) {
    const dx = x - 3.5;
    const dy = y - 3.5;
    const d = Math.abs(dx) + Math.abs(dy); // Diamond shape
    if (d <= 1.2) return hexToRgba('#FFFFFF'); // White core
    if (d <= 2.5) return hexToRgba('#FEF08A'); // Yellow glow
    if (d <= 3.8) return hexToRgba('#38BDF8', 180); // Cyan edge
    return TRANSPARENT;
}

// ── 11. HEART PIXEL (16x16) ──
function drawHeart(x, y) {
    // Standard 16x16 retro pixel heart
    const rowMap = [
        "................",
        "....##....##....",
        "...####..####...",
        "..######.######.",
        "..##############",
        "..##############",
        "...############.",
        "....##########..",
        ".....########...",
        "......######....",
        ".......####.....",
        "........##......",
        "................",
        "................",
        "................",
        "................"
    ];
    if (rowMap[y] && rowMap[y][x] === '#') {
        // Specular white shine top-left
        if ((x === 4 || x === 5) && y === 3) return hexToRgba('#FFFFFF');
        if (x === 4 && (y === 4 || y === 5)) return hexToRgba('#FFFFFF');
        return hexToRgba('#EF4444'); // Classic ruby red
    }
    return TRANSPARENT;
}

// ── 12. SUBSTATION FLOOR TILE (32x32) ──
function drawSubstationFloor(x, y) {
    // Top border with glowing energy conduit line (y: 0..3)
    if (y === 0) return hexToRgba('#64748B'); // Metal lip
    if (y === 1 || y === 2) {
        // Glowing cyan energy line
        if ((x + Math.floor(y)) % 8 < 5) return hexToRgba('#00E5FF');
        return hexToRgba('#0284C7');
    }
    if (y === 3) return hexToRgba('#334155');

    // Hazard yellow/black diagonal stripes (y: 4..8)
    if (y >= 4 && y <= 8) {
        if ((x + y) % 10 < 5) return hexToRgba('#FACC15'); // Warning yellow
        return hexToRgba('#0F172A'); // Industrial black
    }

    // Metal grid plate with rivets (y: 9..31)
    if (y === 9 || y === 31 || x === 0 || x === 31) return hexToRgba('#1E293B'); // Plate seam
    // Rivets at corners
    if ((x === 3 || x === 28) && (y === 12 || y === 28)) return hexToRgba('#94A3B8');

    // Steel mesh texture
    if ((x + y) % 4 === 0) return hexToRgba('#334155');
    return hexToRgba('#1E293B');
}

// ── 13. ECO CITY SKYLINE SILHOUETTE (128x48) ──
function drawCitySkyline(x, y) {
    // Sky is transparent
    // Buildings definitions (x ranges, heights)
    const buildings = [
        { x1: 0, x2: 18, h: 32 },
        { x1: 20, x2: 36, h: 42 },
        { x1: 38, x2: 52, h: 26 },
        { x1: 54, x2: 74, h: 46 }, // Tall central green tower
        { x1: 76, x2: 92, h: 36 },
        { x1: 94, x2: 110, h: 40 },
        { x1: 112, x2: 127, h: 28 }
    ];

    for (const b of buildings) {
        if (x >= b.x1 && x <= b.x2) {
            const topY = 48 - b.h;
            if (y >= topY) {
                // Antenna / light beacon on top of tall tower
                if (b.h >= 42 && x === Math.floor((b.x1 + b.x2) / 2)) {
                    if (y === topY - 4 || y === topY - 3) return hexToRgba('#EF4444'); // Red beacon
                }

                // Solar roof panel highlight
                if (y === topY) return hexToRgba('#38BDF8');

                // Lit windows inside buildings (green & yellow energy lights)
                const winX = (x - b.x1) % 4;
                const winY = (y - topY) % 6;
                if (winX === 2 && winY === 3 && y > topY + 4 && y < 44) {
                    if ((x * 3 + y * 7) % 5 === 0) return hexToRgba('#4ADE80'); // Green LED window
                    if ((x * 5 + y * 3) % 4 === 0) return hexToRgba('#FEF08A'); // Warm yellow window
                    return hexToRgba('#0369A1'); // Blue digital window
                }

                // Building silhouette body
                if (x === b.x1 || x === b.x2) return hexToRgba('#0F172A');
                return hexToRgba('#1E293B');
            }
        }
    }

    return TRANSPARENT;
}

// ── 14. DISTANT CLOUD (96x24) ──
function drawCloud(x, y) {
    const centers = [
        { cx: 24, cy: 15, rx: 16, ry: 7 },
        { cx: 48, cy: 12, rx: 22, ry: 9 },
        { cx: 72, cy: 15, rx: 18, ry: 7 }
    ];

    let inside = false;
    for (const c of centers) {
        const dx = (x - c.cx) / c.rx;
        const dy = (y - c.cy) / c.ry;
        if (dx * dx + dy * dy <= 1) {
            inside = true;
            break;
        }
    }

    if (!inside) return TRANSPARENT;

    // Semi-transparent night cloud with subtle moonlight edge
    if (y < 8) return hexToRgba('#64748B', 140);
    return hexToRgba('#334155', 100);
}

// ── 15. DUST PARTICLE (8x8) ──
function drawDust(x, y) {
    const dx = x - 3.5;
    const dy = y - 3.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 1.5) return hexToRgba('#E2E8F0', 200);
    if (d <= 3.2) return hexToRgba('#94A3B8', 120);
    return TRANSPARENT;
}

// ── 16. SOUND ICONS (16x16) ──
function drawSoundOn(x, y) {
    // Speaker cone: x: 2..8, y: 4..12
    if (x >= 2 && x <= 4 && y >= 6 && y <= 10) return hexToRgba('#FACC15');
    if (x >= 5 && x <= 8 && Math.abs(y - 8) <= (x - 4) * 1.2) return hexToRgba('#FACC15');

    // Sound waves on the right: (x: 10..14)
    const dy = Math.abs(y - 8);
    // Wave 1
    if (x === 11 && dy <= 3) return hexToRgba('#4ADE80');
    // Wave 2
    if (x === 14 && dy <= 5 && dy >= 2) return hexToRgba('#4ADE80');

    return TRANSPARENT;
}

function drawSoundOff(x, y) {
    if (x >= 2 && x <= 4 && y >= 6 && y <= 10) return hexToRgba('#94A3B8');
    if (x >= 5 && x <= 8 && Math.abs(y - 8) <= (x - 4) * 1.2) return hexToRgba('#94A3B8');
    if (Math.abs((x - 12) - (y - 8)) <= 1 && x >= 10 && x <= 14) return hexToRgba('#EF4444');
    if (Math.abs((x - 12) + (y - 8)) <= 1 && x >= 10 && x <= 14) return hexToRgba('#EF4444');
    return TRANSPARENT;
}

// ── 17. WIND GLIDER (SLED) (32x32) ──
function drawWindGlider(x, y) {
    // Aerodynamic top-down racing sled
    // Nose tip: (15, 3) to (16, 3)
    const dx = Math.abs(x - 15.5);

    // Streamlined hull triangle: y: 3..27
    if (y >= 3 && y <= 27) {
        const maxWidthAtY = (y - 3) * 0.48 + 1.2;
        if (dx <= maxWidthAtY) {
            // Outer hull border (metallic slate)
            if (dx >= maxWidthAtY - 1.1) return hexToRgba('#0F172A');

            // Lateral cyan energy runners / skis (dx > maxWidthAtY - 2.5)
            if (dx >= maxWidthAtY - 2.5 && y >= 8) return hexToRgba('#00E5FF');

            // Technician cockpit in the center: y: 11..19, dx <= 3.5
            if (y >= 11 && y <= 19 && dx <= 3.5) {
                // Yellow helmet top: y: 13..16, dx <= 2.2
                if (y >= 13 && y <= 16 && dx <= 2.2) {
                    if (y === 13) return hexToRgba('#FACC15'); // Helmet top
                    if (y === 14 && dx <= 1.5) return hexToRgba('#00E5FF'); // Visor
                    return hexToRgba('#EAB308');
                }
                // Cockpit windshield tint
                return hexToRgba('#1E293B');
            }

            // High-vis ODS 7 Solar gold racing stripes
            if (dx >= 3.2 && dx <= 4.8 && y >= 10 && y <= 24) return hexToRgba('#FACC15');

            // Sleek white / light-cyan aerodynamic composite body
            if (dx <= 1.2) return hexToRgba('#FFFFFF');
            return hexToRgba('#E2E8F0');
        }
    }

    // Rear twin thruster nozzles: y: 28..30, x around 12 and 19
    if (y >= 28 && y <= 30) {
        if ((x >= 11 && x <= 13) || (x >= 18 && x <= 20)) {
            if (y === 30) return hexToRgba('#00E5FF'); // Cyan exhaust glow
            return hexToRgba('#334155');
        }
    }

    return TRANSPARENT;
}

// ── 18. WIND GUST BOOST PAD (48x32) ──
function drawWindGust(x, y) {
    // 3 Forward-pointing glowing cyan chevrons (>>>)
    // Chevron tips at x = 16, 28, 40, pointing downward / forward
    const chevrons = [14, 26, 38];
    for (const cx of chevrons) {
        const distFromCenter = Math.abs(x - cx);
        // V-shape: y increases as dx increases
        const targetY = 16 - distFromCenter * 0.8;
        if (Math.abs(y - targetY) <= 2.2 && distFromCenter <= 9) {
            if (Math.abs(y - targetY) <= 1.0) return hexToRgba('#FFFFFF'); // White hot core
            return hexToRgba('#00E5FF', 220); // Cyan energy aura
        }
    }

    // Outer subtle aerodynamic wind streak trails
    if ((x + y * 2) % 11 === 0 && y >= 4 && y <= 28) {
        return hexToRgba('#38BDF8', 130);
    }

    return TRANSPARENT;
}

// ── 19. TRACK ROCK OBSTACLE (32x32) ──
function drawTrackRock(x, y) {
    const dx = x - 15.5;
    const dy = y - 16.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    const noise = Math.sin(x * 1.5) * 2 + Math.cos(y * 1.7) * 2;

    if (r + noise > 12) return TRANSPARENT;

    // Rock shadow on the ground
    if (r + noise > 10.5) return hexToRgba('#0F172A');

    // Mountain canyon granite shading with moss patch
    if (x < 14 && y < 14 && (x + y) % 3 === 0) return hexToRgba('#65A30D'); // Green moss
    if (x < 13 && y < 13) return hexToRgba('#94A3B8'); // Sunlight crest
    if (x > y + 2) return hexToRgba('#475569'); // Shaded rock face
    return hexToRgba('#64748B');
}

// ── 20. TRACK FALLEN LOG (48x24) ──
function drawTrackLog(x, y) {
    // Horizontal wooden log spanning x: 4..43, y: 6..18
    if (x < 4 || x > 43 || y < 6 || y > 18) return TRANSPARENT;

    // Outer bark border
    if (x === 4 || x === 43 || y === 6 || y === 18) return hexToRgba('#1C1917');

    // Log end rings (on left side x: 4..8)
    if (x <= 8) {
        if (y === 12 && x === 6) return hexToRgba('#D97706'); // Core ring
        return hexToRgba('#B45309');
    }

    // Wood bark grain texture
    if (y === 8 || y === 15) return hexToRgba('#451A03');
    if ((x * 7 + y) % 13 === 0) return hexToRgba('#78350F');
    return hexToRgba('#92400E');
}

// ── 21. FINISH LINE BANNER (128x32) ──
function drawFinishLine(x, y) {
    // Checkerboard pattern (ODS 7 Gold & Dark Slate)
    const checkSize = 8;
    const checkX = Math.floor(x / checkSize);
    const checkY = Math.floor(y / checkSize);

    // Top and bottom metallic rails
    if (y <= 2 || y >= 29) return hexToRgba('#CBD5E1');
    if (y === 3 || y === 28) return hexToRgba('#00E5FF'); // Glowing cyan border

    // Chequered tiles
    if ((checkX + checkY) % 2 === 0) {
        return hexToRgba('#FACC15'); // ODS 7 Gold
    }
    return hexToRgba('#0F172A'); // Dark slate
}

// ── 22. CANYON GRASS TRACK BORDER (32x32) ──
function drawGrassBorder(x, y) {
    // Smooth deep emerald/moss canyon border - soft and low contrast
    // Outer cliff (x: 0..8) slightly deeper
    let base = '#0E3328';
    if (x <= 6) base = '#0B2920';
    else if (x >= 26) {
        // Soft blend transition into track
        const t = (x - 26) / 5;
        return t > 0.6 ? hexToRgba('#0A1C18') : hexToRgba('#0C241E');
    }

    // Gentle organic moss variation (low contrast)
    const noise = (x * 7 + y * 13) % 17;
    if (noise === 0) return hexToRgba('#144537');
    if (noise === 1) return hexToRgba('#103A2E');
    if ((x + y * 2) % 11 === 0) return hexToRgba('#174E3E');

    return hexToRgba(base);
}

// ── 23. CANYON RACING TRACK (64x64) ──
function drawCanyonTrack(x, y) {
    // Ultra-smooth, low-contrast aerodynamic canyon chute
    // Base: dark slate-emerald
    let r = 10, g = 27, b = 24;

    // Subtle organic soil/rock variation (±1..2 intensity, zero strobe)
    const grain = ((x * 11 + y * 17) ^ (x * 3)) % 7;
    if (grain === 0) { r += 1; g += 2; b += 2; }
    else if (grain === 1) { r -= 1; g -= 1; b -= 1; }

    // Gentle vertical wind laminar flow streaks (aligned with motion)
    const streakCol = x % 16;
    if (streakCol === 4 || streakCol === 12) {
        // Soft aerodynamic streamline
        const streamWave = (y + x * 2) % 32;
        if (streamWave < 18) {
            r += 2; g += 6; b += 6; // Soft mint/cyan tint
        }
    }

    // Faint central race guide line (dashed at center x: 31..32)
    if ((x === 31 || x === 32) && (y % 16 < 8)) {
        r += 5; g += 14; b += 12; // Faint soft teal dashed guide
    }

    return [r, g, b, 255];
}

// ── 24. WIND TURBINE TOWER (32x32 stationary) ──
function drawTurbineTower(x, y) {
    // Upright aerodynamic mast and nacelle hub (does not rotate)
    // Foundation base: y: 26..31, x: 12..19
    if (y >= 26 && y <= 31 && x >= 12 && x <= 19) {
        if (y === 26 || x === 12 || x === 19) return hexToRgba('#475569');
        return hexToRgba('#334155');
    }

    // Tapered tower shaft: y: 8..26, x: 14..17
    if (y >= 8 && y < 26) {
        if (x === 14 || x === 17) return hexToRgba('#94A3B8'); // Shaded edge
        if (x === 15 || x === 16) return hexToRgba('#E2E8F0'); // White aerodynamic pylon
    }

    // Nacelle pod & hub center: y: 4..8, x: 13..18
    if (y >= 4 && y <= 8 && x >= 13 && x <= 18) {
        if (x === 15 || x === 16) return hexToRgba('#0284C7'); // Cyan hub indicator
        return hexToRgba('#F8FAFC');
    }

    return TRANSPARENT;
}

// ── 25. WIND TURBINE ROTATING BLADES (32x32) ──
function drawTurbineBlades(x, y) {
    // Hub center at (15.5, 15.5)
    const cx = 15.5;
    const cy = 15.5;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Central spinner hub cap
    if (dist <= 2.2) return hexToRgba('#00E5FF'); // Glowing cyan hub
    if (dist <= 3.2) return hexToRgba('#F8FAFC');

    // Blade 1: Upward
    if (dy < -2 && dy >= -14 && Math.abs(dx) <= (1.2 - (-dy) * 0.05)) {
        return dx < 0 ? hexToRgba('#F8FAFC') : hexToRgba('#E2E8F0');
    }

    // Blade 2: Bottom-Right (~120 deg)
    if (dy > 1 && dx > 1 && dist <= 14 && Math.abs(dy - dx * 0.58) <= 1.2) {
        return hexToRgba('#E2E8F0');
    }

    // Blade 3: Bottom-Left (~240 deg)
    if (dy > 1 && dx < -1 && dist <= 14 && Math.abs(dy - (-dx) * 0.58) <= 1.2) {
        return hexToRgba('#CBD5E1');
    }

    return TRANSPARENT;
}

// ── 26. SOLAR SPEEDER (SLED) (32x32) ──
function drawSolarSpeeder(x, y) {
    const dx = Math.abs(x - 15.5);
    // Aerodynamic wedge solar speeder
    if (y >= 4 && y <= 27) {
        const maxWidth = (y - 4) * 0.52 + 1.5;
        if (dx <= maxWidth) {
            // Dark obsidian rim
            if (dx >= maxWidth - 1.2) return hexToRgba('#1E1B4B');

            // Lateral solar collector arrays (gold & orange reflection)
            if (dx >= maxWidth - 2.8 && y >= 9) {
                return (y % 3 === 0) ? hexToRgba('#F59E0B') : hexToRgba('#FACC15');
            }

            // Pilot bubble canopy
            if (y >= 10 && y <= 18 && dx <= 3.2) {
                if (y >= 12 && y <= 15 && dx <= 2.0) {
                    if (y === 12) return hexToRgba('#FACC15');
                    if (y === 13 && dx <= 1.2) return hexToRgba('#F59E0B'); // Orange gold visor
                    return hexToRgba('#D97706');
                }
                return hexToRgba('#0F172A');
            }

            // Photovoltaic cell texture on central hood
            if (dx <= 3.5 && y >= 19 && y <= 26) {
                if ((x + y) % 2 === 0) return hexToRgba('#1E3A8A'); // Blue silicon
                return hexToRgba('#2563EB');
            }

            // Sleek golden hull
            if (dx <= 1.2) return hexToRgba('#FEF08A');
            return hexToRgba('#FDE047');
        }
    }

    // Plasma thrusters
    if (y >= 28 && y <= 30 && ((x >= 10 && x <= 13) || (x >= 18 && x <= 21))) {
        if (y === 30) return hexToRgba('#F59E0B'); // Golden orange plasma trail
        return hexToRgba('#475569');
    }

    return TRANSPARENT;
}

// ── 27. SOLAR VALLEY TRACK (64x64) ──
function drawSolarTrack(x, y) {
    // Warm deep quartz & silicon desert canyon track - smooth and zero-strobe
    // Base: deep warm slate / bronze `#1B1612`
    let r = 27, g = 22, b = 18;

    // Organic sand & quartz dust variation (subtle ±1..2)
    const grain = ((x * 13 + y * 19) ^ (x * 5)) % 7;
    if (grain === 0) { r += 2; g += 1; b += 0; }
    else if (grain === 1) { r -= 1; g -= 1; b -= 1; }

    // Gentle vertical photon-guide streamlines
    const streakCol = x % 16;
    if (streakCol === 5 || streakCol === 11) {
        const wave = (y + x * 2) % 32;
        if (wave < 18) {
            r += 5; g += 3; b += 1; // Faint amber glow line
        }
    }

    // Faint golden center track guide
    if ((x === 31 || x === 32) && (y % 16 < 8)) {
        r += 12; g += 9; b += 2; // Warm amber dashed guide
    }

    return [r, g, b, 255];
}

// ── 28. SOLAR VALLEY BORDER (32x32) ──
function drawSolarBorder(x, y) {
    // Rich golden sand dunes / canyon rim
    let base = '#451A03';
    if (x <= 6) base = '#290E02';
    else if (x >= 26) {
        const t = (x - 26) / 5;
        return t > 0.6 ? hexToRgba('#1B1612') : hexToRgba('#2A1A10');
    }

    const noise = (x * 7 + y * 11) % 13;
    if (noise === 0) return hexToRgba('#78350F');
    if (noise === 1) return hexToRgba('#92400E');
    if ((x + y * 2) % 9 === 0) return hexToRgba('#B45309');

    return hexToRgba(base);
}

// ── 29. SOLAR FLARE BOOST PAD (48x32) ──
function drawSolarFlare(x, y) {
    // Concentrated radiant sunlight chevron
    const chevrons = [14, 26, 38];
    for (const cx of chevrons) {
        const distFromCenter = Math.abs(x - cx);
        const targetY = 16 - distFromCenter * 0.8;
        if (Math.abs(y - targetY) <= 2.2 && distFromCenter <= 9) {
            if (Math.abs(y - targetY) <= 1.0) return hexToRgba('#FFFFFF'); // White hot core
            return hexToRgba('#F59E0B', 230); // Golden radiant fire
        }
    }

    // Heat shimmer lines
    if ((x + y * 3) % 11 === 0 && y >= 4 && y <= 28) {
        return hexToRgba('#FDE047', 140);
    }

    return TRANSPARENT;
}

// ── 30. SOLAR DUST OBSTACLE (32x32) ──
function drawSolarDust(x, y) {
    // Swirling dust and sandstorm vortex
    const dx = x - 15.5;
    const dy = y - 15.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const spiral = dist + Math.sin(angle * 3) * 2.5;

    if (spiral <= 12) {
        if (dist <= 3) return hexToRgba('#78350F'); // Dense dust eye
        if (dist <= 7) return hexToRgba('#B45309', 220);
        if (dist <= 11) return hexToRgba('#D97706', 180);
        return hexToRgba('#F59E0B', 120);
    }
    return TRANSPARENT;
}

// ── 31. SOLAR CONCENTRATION TOWER (32x32) ──
function drawSolarTower(x, y) {
    // Sleek white central tower mast
    if (y >= 10 && y <= 31 && x >= 14 && x <= 17) {
        if (x === 14 || x === 17) return hexToRgba('#64748B');
        return hexToRgba('#F1F5F9');
    }
    // Base platform
    if (y >= 28 && y <= 31 && x >= 11 && x <= 20) return hexToRgba('#334155');

    // Molten salt receiver orb on top (radiant amber glow)
    const dx = x - 15.5;
    const dy = y - 8.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 4.5) {
        if (dist <= 2.0) return hexToRgba('#FFFFFF');
        if (dist <= 3.5) return hexToRgba('#FACC15');
        return hexToRgba('#F59E0B');
    }
    return TRANSPARENT;
}

// ── 32. HYDRO FOIL SPEEDER (32x32) ──
function drawHydroFoil(x, y) {
    const dx = Math.abs(x - 15.5);
    // Hydrodynamic catamaran / hydrofoil hull
    if (y >= 4 && y <= 27) {
        const maxWidth = (y - 4) * 0.46 + 1.2;
        if (dx <= maxWidth) {
            // Navy hydrodynamic outline
            if (dx >= maxWidth - 1.1) return hexToRgba('#082F49');

            // Twin outrigger sponsons (dx > maxWidth - 2.8)
            if (dx >= maxWidth - 2.8 && y >= 10) {
                return (y % 2 === 0) ? hexToRgba('#0284C7') : hexToRgba('#00E5FF');
            }

            // Pilot bubble
            if (y >= 11 && y <= 18 && dx <= 3.2) {
                if (y >= 13 && y <= 16 && dx <= 2.0) {
                    if (y === 13) return hexToRgba('#38BDF8');
                    if (y === 14 && dx <= 1.2) return hexToRgba('#00E5FF'); // Cyan visor
                    return hexToRgba('#0284C7');
                }
                return hexToRgba('#0C4A6E');
            }

            // Deep ocean blue and turquoise wave stripes
            if (dx >= 2.5 && dx <= 4.0 && y >= 10 && y <= 24) return hexToRgba('#06B6D4');

            // Central aqua composite spine
            if (dx <= 1.2) return hexToRgba('#E0F2FE');
            return hexToRgba('#BAE6FD');
        }
    }

    // Water jet thrusters at rear
    if (y >= 28 && y <= 30 && ((x >= 11 && x <= 13) || (x >= 18 && x <= 20))) {
        if (y === 30) return hexToRgba('#00E5FF'); // Water spray / jet plume
        return hexToRgba('#0369A1');
    }

    return TRANSPARENT;
}

// ── 33. HYDRO RAPIDS TRACK (64x64) ──
function drawHydroTrack(x, y) {
    // Deep rushing river / hydraulic flume channel - low contrast, zero strobe
    // Base: deep navy-cyan `#071E2B`
    let r = 7, g = 30, b = 43;

    // Organic water current variation (subtle ±1..2)
    const grain = ((x * 11 + y * 23) ^ (x * 7)) % 7;
    if (grain === 0) { r += 1; g += 2; b += 3; }
    else if (grain === 1) { r -= 1; g -= 1; b -= 1; }

    // Gentle vertical laminar water streamlines
    const streakCol = x % 16;
    if (streakCol === 3 || streakCol === 13) {
        const wave = (y + x * 2) % 32;
        if (wave < 18) {
            r += 1; g += 4; b += 8; // Soft cyan water foam streak
        }
    }

    // Faint center water channel line
    if ((x === 31 || x === 32) && (y % 16 < 8)) {
        r += 3; g += 10; b += 18; // Soft aqua dashed guide
    }

    return [r, g, b, 255];
}

// ── 34. HYDRO CANAL BORDER (32x32) ──
function drawHydroBorder(x, y) {
    // Reinforced hydroelectric flume walls / concrete & moss
    let base = '#082F49';
    if (x <= 6) base = '#041B2D';
    else if (x >= 26) {
        const t = (x - 26) / 5;
        return t > 0.6 ? hexToRgba('#071E2B') : hexToRgba('#062436');
    }

    const noise = (x * 9 + y * 13) % 17;
    if (noise === 0) return hexToRgba('#0369A1');
    if (noise === 1) return hexToRgba('#0284C7');
    if ((x + y * 2) % 11 === 0) return hexToRgba('#0E7490');

    return hexToRgba(base);
}

// ── 35. HYDRO CURRENT BOOST PAD (48x32) ──
function drawHydroCurrent(x, y) {
    // Pressurized water surge chevrons
    const chevrons = [14, 26, 38];
    for (const cx of chevrons) {
        const distFromCenter = Math.abs(x - cx);
        const targetY = 16 - distFromCenter * 0.8;
        if (Math.abs(y - targetY) <= 2.2 && distFromCenter <= 9) {
            if (Math.abs(y - targetY) <= 1.0) return hexToRgba('#FFFFFF'); // White water foam
            return hexToRgba('#06B6D4', 230); // Hydrokinetic rush
        }
    }

    if ((x + y * 2) % 11 === 0 && y >= 4 && y <= 28) {
        return hexToRgba('#38BDF8', 140);
    }

    return TRANSPARENT;
}

// ── 36. HYDRO VORTEX OBSTACLE (32x32) ──
function drawHydroVortex(x, y) {
    // River whirlpool / vortex hazard
    const dx = x - 15.5;
    const dy = y - 15.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const spiral = dist + Math.sin(angle * 4) * 2.0;

    if (spiral <= 12) {
        if (dist <= 2.5) return hexToRgba('#082F49'); // Dark abyss center
        if (dist <= 6) return hexToRgba('#0284C7', 220);
        if (dist <= 10) return hexToRgba('#06B6D4', 180);
        return hexToRgba('#38BDF8', 120);
    }
    return TRANSPARENT;
}

// ── 37. HYDRO TURBINE PYLON (32x32) ──
function drawHydroPylon(x, y) {
    // Hydroelectric canal pylon and penstock intake gate
    // Pylon pillar
    if (y >= 8 && y <= 31 && x >= 13 && x <= 18) {
        if (x === 13 || x === 18) return hexToRgba('#1E293B');
        return hexToRgba('#475569');
    }
    // Water level sensor light at top
    if (y >= 4 && y <= 7 && x >= 14 && x <= 17) {
        return hexToRgba('#00E5FF'); // Cyan indicator light
    }
    return TRANSPARENT;
}

// ── 38. SMART GRID TRACK (64x64) ──
function drawGridTrack(x, y) {
    let r = 11, g = 19, b = 43; // #0B132B deep cyber slate
    const noise = (x * 7 + y * 13) % 9;
    if (noise === 0) { r += 2; g += 2; b += 4; }

    // Cyber energy conduit lines
    if (x === 16 || x === 48) {
        if (y % 16 < 8) { r = 2, g = 132, b = 199; } // #0284C7
    }

    // Center laser dashed guideline
    if ((x === 31 || x === 32) && (y % 16 < 8)) {
        r = 56; g = 189; b = 248; // #38BDF8
    }

    return [r, g, b, 255];
}

// ── 39. SMART GRID BORDER (32x32) ──
function drawGridBorder(x, y) {
    let base = '#0F172A';
    if (x <= 6) base = '#020617';
    else if (x >= 26) base = '#1E293B';

    if (x === 16 && y % 8 < 4) return hexToRgba('#0284C7');
    if (x === 17 && y % 8 < 4) return hexToRgba('#38BDF8');

    return hexToRgba(base);
}

// ── 40. SMART GRID SPEEDER (32x32) ──
function drawGridSpeeder(x, y) {
    const dx = Math.abs(x - 15.5);
    // Sleek triangle hyper-car
    if (y >= 8 && y <= 28) {
        const span = (y - 8) * 0.55;
        if (dx <= span) {
            if (dx <= 1.5 && y >= 14 && y <= 22) return hexToRgba('#00E5FF'); // Neon core
            if (dx >= span - 1.2) return hexToRgba('#38BDF8'); // Edge glow
            if (y >= 10 && y <= 16) return hexToRgba('#0F172A'); // Cockpit
            return hexToRgba('#0284C7'); // Main hull
        }
    }
    // Rear twin ion thrusters
    if (y >= 29 && y <= 31 && (dx >= 4 && dx <= 7)) {
        return hexToRgba('#F59E0B');
    }
    return TRANSPARENT;
}

// ── 41. SMART GRID SUBSTATION TOWER (32x32) ──
function drawGridTower(x, y) {
    // High-tech distribution pylon
    if (y >= 10 && y <= 31 && x >= 13 && x <= 18) {
        if (x === 13 || x === 18) return hexToRgba('#38BDF8');
        return hexToRgba('#0F172A');
    }
    // Top quantum sensor
    if (y >= 4 && y <= 9 && x >= 12 && x <= 19) {
        return hexToRgba('#10B981');
    }
    return TRANSPARENT;
}

// ── 42. SMART GRID SURGE BOOST (48x32) ──
function drawGridSurge(x, y) {
    const chevrons = [14, 26, 38];
    for (const cx of chevrons) {
        const dist = Math.abs(x - cx);
        const targetY = 16 - dist * 0.8;
        if (Math.abs(y - targetY) <= 2.2 && dist <= 9) {
            if (Math.abs(y - targetY) <= 1.0) return hexToRgba('#FFFFFF');
            return hexToRgba('#38BDF8', 230);
        }
    }
    return TRANSPARENT;
}

// ── 43. SMART GRID OVERLOAD HAZARD (32x32) ──
function drawGridOverload(x, y) {
    const dx = x - 15.5;
    const dy = y - 15.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 11) {
        if (dist <= 3) return hexToRgba('#FFFFFF');
        if (dist <= 7) return hexToRgba('#EF4444', 220);
        return hexToRgba('#F97316', 150);
    }
    return TRANSPARENT;
}

// Ensure output directories exist
const assetsDir = path.resolve('public/assets');
const itemsDir = path.join(assetsDir, 'items');
const hazardsDir = path.join(assetsDir, 'hazards');
const playerDir = path.join(assetsDir, 'player');
const uiDir = path.join(assetsDir, 'ui');
const envDir = path.join(assetsDir, 'env');
const trackDir = path.join(assetsDir, 'track');

[assetsDir, itemsDir, hazardsDir, playerDir, uiDir, envDir, trackDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Generate all assets
const assetsToGenerate = [
    { file: path.join(itemsDir, 'solar.png'), size: 32, fn: drawSolarPanel },
    { file: path.join(itemsDir, 'wind.png'), size: 32, fn: drawWindTurbine },
    { file: path.join(itemsDir, 'battery.png'), size: 32, fn: drawBattery },
    { file: path.join(itemsDir, 'hydro.png'), size: 32, fn: drawHydroOrb },

    { file: path.join(hazardsDir, 'coal.png'), size: 32, fn: drawCoal },
    { file: path.join(hazardsDir, 'oil.png'), size: 32, fn: drawOilBarrel },
    { file: path.join(hazardsDir, 'co2.png'), size: 32, fn: drawCO2Cloud },
    { file: path.join(hazardsDir, 'surge.png'), size: 32, fn: drawSurge },

    { file: path.join(playerDir, 'player_idle.png'), size: 32, fn: (x, y) => drawPlayer(x, y, 0) },
    { file: path.join(playerDir, 'player_run.png'), size: 32, fn: (x, y) => drawPlayer(x, y, 1) },

    { file: path.join(uiDir, 'spark.png'), size: 8, fn: drawSpark },
    { file: path.join(uiDir, 'dust.png'), size: 8, fn: drawDust },
    { file: path.join(uiDir, 'heart_pixel.png'), size: 16, fn: drawHeart },
    { file: path.join(uiDir, 'sound_on.png'), size: 16, fn: drawSoundOn },
    { file: path.join(uiDir, 'sound_off.png'), size: 16, fn: drawSoundOff },

    { file: path.join(envDir, 'substation_floor.png'), size: 32, fn: drawSubstationFloor },
    { file: path.join(envDir, 'city_skyline.png'), width: 128, height: 48, fn: drawCitySkyline },
    { file: path.join(envDir, 'clouds.png'), width: 96, height: 24, fn: drawCloud },

    // ── Bioma 1: Colinas Eólicas ──
    { file: path.join(trackDir, 'wind_glider.png'), size: 32, fn: drawWindGlider },
    { file: path.join(trackDir, 'wind_gust.png'), width: 48, height: 32, fn: drawWindGust },
    { file: path.join(trackDir, 'track_rock.png'), size: 32, fn: drawTrackRock },
    { file: path.join(trackDir, 'track_log.png'), width: 48, height: 24, fn: drawTrackLog },
    { file: path.join(trackDir, 'finish_line.png'), width: 128, height: 32, fn: drawFinishLine },
    { file: path.join(trackDir, 'grass_border.png'), size: 32, fn: drawGrassBorder },
    { file: path.join(trackDir, 'canyon_track.png'), size: 64, fn: drawCanyonTrack },
    { file: path.join(trackDir, 'turbine_tower.png'), size: 32, fn: drawTurbineTower },
    { file: path.join(trackDir, 'turbine_blades.png'), size: 32, fn: drawTurbineBlades },

    // ── Bioma 2: Valle Solar ──
    { file: path.join(trackDir, 'solar_speeder.png'), size: 32, fn: drawSolarSpeeder },
    { file: path.join(trackDir, 'solar_track.png'), size: 64, fn: drawSolarTrack },
    { file: path.join(trackDir, 'solar_border.png'), size: 32, fn: drawSolarBorder },
    { file: path.join(trackDir, 'solar_flare.png'), width: 48, height: 32, fn: drawSolarFlare },
    { file: path.join(trackDir, 'solar_dust.png'), size: 32, fn: drawSolarDust },
    { file: path.join(trackDir, 'solar_tower.png'), size: 32, fn: drawSolarTower },

    // ── Bioma 3: Rápidos Hidroeléctricos ──
    { file: path.join(trackDir, 'hydro_foil.png'), size: 32, fn: drawHydroFoil },
    { file: path.join(trackDir, 'hydro_track.png'), size: 64, fn: drawHydroTrack },
    { file: path.join(trackDir, 'hydro_border.png'), size: 32, fn: drawHydroBorder },
    { file: path.join(trackDir, 'hydro_current.png'), width: 48, height: 32, fn: drawHydroCurrent },
    { file: path.join(trackDir, 'hydro_vortex.png'), size: 32, fn: drawHydroVortex },
    { file: path.join(trackDir, 'hydro_pylon.png'), size: 32, fn: drawHydroPylon },

    // ── Bioma 4: Gran Final Red Inteligente 2030 ──
    { file: path.join(trackDir, 'grid_track.png'), size: 64, fn: drawGridTrack },
    { file: path.join(trackDir, 'grid_border.png'), size: 32, fn: drawGridBorder },
    { file: path.join(trackDir, 'grid_speeder.png'), size: 32, fn: drawGridSpeeder },
    { file: path.join(trackDir, 'grid_tower.png'), size: 32, fn: drawGridTower },
    { file: path.join(trackDir, 'grid_surge.png'), width: 48, height: 32, fn: drawGridSurge },
    { file: path.join(trackDir, 'grid_overload.png'), size: 32, fn: drawGridOverload },
];

for (const item of assetsToGenerate) {
    const w = item.width || item.size;
    const h = item.height || item.size;
    const pngBuf = createPNG(w, h, item.fn);
    fs.writeFileSync(item.file, pngBuf);
    console.log(`Generated: ${path.relative(process.cwd(), item.file)} (${pngBuf.length} bytes)`);
}

console.log('All pixel art assets generated successfully!');

