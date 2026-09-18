// Pack generated walking frames into MZ's 3-column, 4-direction 48px cell format.
// Only crop transparent padding, uniformly downscale, and align feet; preserve RGBA.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("C:/Users/digi9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
(async () => {
    for (const name of ["Aren", "Mira"]) {
        const source = path.resolve(__dirname, "../Addons/FirstJourneyArt/" + name + "-walk-source-v1.png");
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
        const frames = rows.flatMap((row, r) => [0, 1, 2].map(c => {
            let left = info.width, right = 0, top = info.height, bottom = 0;
            for (let y = row.top; y <= row.bottom; y++) for (let x = Math.floor(c * info.width / 3); x < Math.floor((c + 1) * info.width / 3); x++) {
                if (data[(y * info.width + x) * 4 + 3] > 80) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
            }
            return { r, c, left, top, width: right - left + 1, height: bottom - top + 1 };
        }));
        const scale = Math.min(42 / Math.max(...frames.map(f => f.height)), 42 / Math.max(...frames.map(f => f.width)));
        const composites = [];
        for (const f of frames) {
            const width = Math.round(f.width * scale), height = Math.round(f.height * scale);
            composites.push({ input: await sharp(source).extract({ left: f.left, top: f.top, width: f.width, height: f.height }).resize(width, height, { kernel: "nearest" }).png().toBuffer(), left: f.c * 48 + Math.floor((48 - width) / 2), top: f.r * 48 + 46 - height });
        }
        const output = path.resolve(__dirname, "../src/img/characters/$" + name + "Journey-v1.png");
        await sharp({ create: { width: 144, height: 192, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png().toFile(output);
        console.log(name + ": packed 12 aligned frames into " + output);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
