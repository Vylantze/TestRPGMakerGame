// Pack generated walking frames into MZ's 3-column, 4-direction 48px cell format.
// Only crop transparent padding, scale, and align feet; preserve RGBA.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("C:/Users/digi9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const version = process.argv[2] || "v3";
if (!/^v[0-9]+$/.test(version)) throw new Error("Expected version such as v2");
(async () => {
    for (const name of ["Aren", "Mira"]) {
        const sourceVersion = version === "v3" ? "v2" : version;
        const source = path.resolve(__dirname, "../Addons/FirstJourneyArt/" + name + "-walk-source-" + sourceVersion + ".png");
        const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const occupied = Array.from({ length: info.height }, (_, y) => {
            let count = 0;
            for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 80) count++;
            return count > 20;
        });
        const rows = [];
        for (let y = 0; y < info.height; y++) if (occupied[y]) {
            const top = y; while (y + 1 < info.height && occupied[y + 1]) y++;
            if (y - top > 50) rows.push({ top, bottom: y });
        }
        if (rows.length !== 4) throw new Error(name + ": expected 4 sprite rows, found " + rows.length);
        // Locate the main connected silhouette in each cell. Isolated generation
        // specks must not shift frame bounds or reduce the scale of every frame.
        const frames = rows.flatMap((row, r) => [0, 1, 2].map(c => {
            const x0 = Math.floor(c * info.width / 3), x1 = Math.floor((c + 1) * info.width / 3);
            const seen = new Set(); let largest = [];
            for (let y = row.top; y <= row.bottom; y++) for (let x = x0; x < x1; x++) {
                const seed = y * info.width + x;
                if (seen.has(seed) || data[seed * 4 + 3] <= 80) continue;
                const component = [seed]; seen.add(seed);
                for (let i = 0; i < component.length; i++) {
                    const px = component[i] % info.width, py = Math.floor(component[i] / info.width);
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        const nx = px + dx, ny = py + dy, next = ny * info.width + nx;
                        if (nx < x0 || nx >= x1 || ny < row.top || ny > row.bottom || seen.has(next) || data[next * 4 + 3] <= 80) continue;
                        seen.add(next); component.push(next);
                    }
                }
                if (component.length > largest.length) largest = component;
            }
            let left = info.width, right = 0, top = info.height, bottom = 0;
            for (const pixel of largest) {
                const x = pixel % info.width, y = Math.floor(pixel / info.width);
                left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
            return { r, c, left, top, width: right - left + 1, height: bottom - top + 1 };
        }));
        const composites = [];
        for (const f of frames) {
            // NPC visible bounds reach 33px wide and 44px high. Normalize each
            // generated pose to at least those bounds, with a shared foot baseline.
            const height = 44, width = Math.max(34, Math.min(44, Math.round(f.width * height / f.height)));
            composites.push({ input: await sharp(source).extract({ left: f.left, top: f.top, width: f.width, height: f.height }).resize(width, height, { kernel: "nearest", fit: "fill" }).png().toBuffer(), left: f.c * 48 + Math.floor((48 - width) / 2), top: f.r * 48 + 48 - height });
        }
        const output = path.resolve(__dirname, "../src/img/characters/$" + name + "Journey-" + version + ".png");
        await sharp({ create: { width: 144, height: 192, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png().toFile(output);
        console.log(name + ": packed 12 aligned frames into " + output);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
