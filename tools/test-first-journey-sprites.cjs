const assert = require("node:assert/strict");
const path = require("node:path");
const sharp = require("C:/Users/digi9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
async function bounds(name, columns) {
    const { data, info } = await sharp(path.join(__dirname, "../src/img/characters", name + ".png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const frames = [];
    for (let row = 0; row < 4; row++) for (let column = 0; column < columns; column++) {
        let left = 48, right = -1, top = 48, bottom = -1;
        for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
            if (data[((row * 48 + y) * info.width + column * 48 + x) * 4 + 3] <= 80) continue;
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        frames.push({ left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 });
    }
    return { frames, info };
}
(async () => {
    const npc = (await bounds("People1", 6)).frames;
    const width = Math.max(...npc.map(f => f.width)), height = Math.max(...npc.map(f => f.height));
    for (const name of ["$ArenJourney-v3", "$MiraJourney-v3"]) {
        const { frames, info } = await bounds(name, 3);
        assert.deepEqual([info.width, info.height], [144, 192]);
        for (const [index, f] of frames.entries()) {
            assert.ok(f.width >= width && f.height >= height, `${name} frame ${index}: ${f.width}×${f.height} smaller than NPC ${width}×${height}`);
            assert.ok(Math.abs((f.left + f.right) / 2 - 23.5) <= 1, `${name} frame ${index} not centered`);
            assert.equal(f.bottom, 47, `${name} frame ${index} foot baseline`);
        }
        console.log(`PASS ${name}: 12 centered frames at least ${width}×${height}, common foot baseline`);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
