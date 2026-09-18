const assert = require("node:assert/strict");
const R = require("../Project1/js/plugins/FirstJourneyRules.js");
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }
function shrine() { const s = R.create(); R.travel(s, 2, 2, 9); return s; }
test("Three observations unlock a weak copied skill; starting attacks use no slots", () => {
    const s = R.create();
    R.observe(s, s.mira, "mend"); R.observe(s, s.mira, "mend");
    assert.equal(R.learned(s, "mend"), false);
    R.observe(s, s.mira, "mend"); assert.equal(R.learned(s, "mend"), true);
    assert.equal(R.equip(s, "mend"), true); assert.equal(s.equipped.length, 1);
    assert.equal(R.equip(s, "cut"), false);
    s.aren.hp = 1; assert.equal(R.use(s, s.aren, "mend", s.aren), true);
    assert.equal(s.aren.hp, 10); assert.equal(s.knowledge.mend.practice, 1);
});
test("Advanced observations accrue before prerequisites, without early unlock", () => {
    const s = R.create();
    for (let i = 0; i < 60; i++) R.observe(s, s.mira, "revive");
    assert.equal(s.knowledge.revive.observations, 3);
    assert.equal(R.learned(s, "revive"), false);
    s.knowledge.mend = { learned: true, observations: 3, practice: 18 };
    R.observe(s, s.mira, "revive"); assert.equal(R.learned(s, "revive"), true);
});
test("No resource regeneration by waiting; basic attacks really cost resources", () => {
    const s = shrine(), enemy = R.enemies(s)[0];
    enemy.x = 3; enemy.y = 9; s.aren.direction = 6; enemy.direction = 4;
    s.aren.sp = 1;
    assert.equal(R.use(s, s.aren, "cut", enemy), true);
    assert.equal(s.aren.sp, 0); assert.equal(R.use(s, s.aren, "cut", enemy), false);
    R.travel(s, 1, 8, 7); s.mode = "Follow";
    s.aren.mp = 0; R.finishTurn(s);
    assert.equal(s.aren.mp, 0); assert.equal(s.aren.sp, 0);
});
test("Town rest is free; shrine rest consumes exactly one ration", () => {
    const s = R.create(); s.aren.x = 5; s.aren.y = 6; s.aren.hp = 1;
    assert.equal(R.rest(s), true); assert.equal(s.inventory.ration, 3);
    R.travel(s, 2, 12, 9); s.aren.hp = 1;
    assert.equal(R.rest(s), true); assert.equal(s.inventory.ration, 2);
    s.inventory.ration = 0; assert.equal(R.rest(s), false);
    s.inventory.ration = 1; s.combat = true; assert.equal(R.rest(s), false);
});
test("Equipment locks during combat and slots increase with level", () => {
    const s = R.create(); s.knowledge.mend = { learned: true, observations: 3, practice: 0 };
    s.combat = true; assert.equal(R.equip(s, "mend"), false);
    s.combat = false; assert.equal(R.equip(s, "mend"), true);
    assert.equal(R.slots(s), 2); s.aren.level = 3; assert.equal(R.slots(s), 3);
});
test("Walls block sight and skills", () => {
    const s = shrine(); s.aren.x = 9; s.aren.y = 8;
    const enemy = R.enemies(s)[0]; enemy.x = 11; enemy.y = 8;
    assert.equal(R.sight(s, s.aren, enemy), false);
    assert.equal(R.cast(s, "spark", enemy), false);
});
test("Job progression is shared, and Mira learns advanced spells by level", () => {
    assert.deepEqual(R.jobSkills({ job: "priestess", level: 1 }), ["mend", "light"]);
    assert.ok(R.jobSkills({ job: "priestess", level: 3 }).includes("greaterMend"));
    assert.ok(R.jobSkills({ job: "fighter", level: 3 }).includes("sweep"));
});
test("Party defeat returns to town with mastery, gold and kills retained", () => {
    const s = shrine(); s.knowledge.jab = { observations: 3, practice: 7, learned: true };
    R.area(s).enemies[0].hp = 0; s.aren.hp = 0; s.mira.hp = 0; s.gold = 45;
    R.finishTurn(s);
    assert.equal(s.mapId, 1); assert.equal(s.knowledge.jab.practice, 7); assert.equal(s.gold, 45);
    assert.equal(s.areas[2].enemies[0].hp, 0); assert.equal(s.aren.hp, R.maxStats(s.aren).hp);
});
test("Checkpoint captures occur at combat start before damage and at end", () => {
    const s = shrine(); s.mira.hp = 0;
    const enemy = R.enemies(s)[0]; enemy.x = 3; enemy.y = 9; s.aren.direction = 6; enemy.direction = 4; enemy.hp = 1;
    const snapshots = [];
    R.onCheckpoint = (state, reason) => snapshots.push({ reason, snapshot: JSON.parse(JSON.stringify(state)) });
    assert.equal(R.cast(s, "cut", enemy), true);
    R.onCheckpoint = null;
    assert.equal(snapshots[0].reason, "combat-start");
    assert.equal(snapshots[0].snapshot.areas[2].enemies[0].hp, 1);
    assert.ok(snapshots.some(entry => entry.reason === "combat-end"));
});
test("Map routes connect every rest, exit and enemy spawn", () => {
    for (const [id, map] of Object.entries(R.maps)) {
        const s = R.create(); s.mapId = Number(id);
        const start = map.rest, seen = new Set([start.join(",")]), queue = [start];
        for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const x = queue[i][0] + dx, y = queue[i][1] + dy, key = x + "," + y;
            if (!seen.has(key) && !R.wall(s, x, y)) { seen.add(key); queue.push([x, y]); }
        }
        for (const point of [map.exit, map.back, ...(map.caches || []), ...map.enemies.map(e => [e.x, e.y])].filter(Boolean)) assert.ok(seen.has(point.slice(0, 2).join(",")), map.name + " unreachable " + point);
    }
});
test("Serialized expedition can resume with all progression and enemy state", () => {
    const s = shrine(); s.knowledge.light = { learned: true, observations: 3, practice: 9 };
    s.equipped = ["light"]; R.area(s).enemies[0].hp = 10;
    const copy = JSON.parse(JSON.stringify(s));
    assert.equal(R.mastery(copy, "light"), 1); assert.equal(R.enemies(copy)[0].hp, 10);
    assert.equal(R.equip(copy, "light"), true);
});
test("Blocked movement turns Aren without spending a turn", () => {
    const s = R.create(); s.aren.x = 1; s.aren.y = 1;
    assert.equal(R.move(s, -1, 0), false); assert.equal(s.aren.direction, 4); assert.equal(s.turn, 0);
});
test("Rest points, chests and people are solid", () => {
    const s = R.create(); s.aren.x = 5; s.aren.y = 6;
    assert.equal(R.move(s, 0, -1), false);
    R.travel(s, 2, 4, 4); assert.equal(R.move(s, 0, -1), false);
    s.aren.x = 12; s.aren.y = 8; assert.equal(R.move(s, 0, 1), false);
});
test("Mira follows each vacated tile and can be addressed by facing her", () => {
    const s = R.create(); R.move(s, 1, 0);
    assert.deepEqual([s.mira.x, s.mira.y], [8, 7]);
    R.move(s, 0, 1); assert.deepEqual([s.mira.x, s.mira.y], [9, 7]);
    R.face(s, 0, -1); const turn = s.turn;
    assert.equal(R.interact(s), "companion"); assert.equal(s.turn, turn);
    assert.equal(R.move(s, 0, -1), true);
});
test("Skill feedback emits for party and enemy actions", () => {
    const s = shrine(), enemy = R.enemies(s)[0]; enemy.x = 3; enemy.y = 9; s.aren.direction = 6; enemy.direction = 4;
    const events = []; R.onSkill = event => events.push(event);
    R.use(s, s.aren, "cut", enemy); R.use(s, enemy, "jab", s.aren);
    R.onSkill = null;
    assert.equal(events.length, 2); assert.equal(events[0].user.id, "aren"); assert.equal(events[1].target.id, "aren");
});
test("Facing shapes rotate in every direction; sword cannot strike behind", () => {
    const s = R.create(); s.aren.x = 8; s.aren.y = 8;
    for (const [direction, [dx, dy]] of Object.entries(R.directions)) {
        s.aren.direction = Number(direction);
        const front = { x: 8 + dx, y: 8 + dy, hp: 20 };
        assert.equal(R.canTarget(s, s.aren, "cut", front), true);
        assert.equal(R.canTarget(s, s.aren, "cut", { x: 8 - dx, y: 8 - dy, hp: 20 }), false);
        assert.equal(R.canTarget(s, s.aren, "cut", { x: 8 + dx * 2, y: 8 + dy * 2, hp: 20 }), false);
        assert.deepEqual(R.footprint(s, s.aren, "thrust"), [{ x: 8 + dx, y: 8 + dy }, { x: 8 + dx * 2, y: 8 + dy * 2 }]);
        assert.deepEqual(R.footprint(s, s.aren, "sweep"), [-1, 0, 1].map(n => ({ x: 8 + dx - dy * n, y: 8 + dy + dx * n })));
        assert.equal(R.footprint(s, s.aren, "whirlwind").length, 8);
    }
});
test("Area attacks hit creatures in the hitbox, charge once, and practice once", () => {
    for (const id of ["thrust", "sweep", "whirlwind", "burst"]) {
        const s = R.create(); s.aren.x = 8; s.aren.y = 8; s.aren.direction = 6;
        s.knowledge[id] = { learned: true, practice: 0, observations: 3 };
        const center = { x: 9, y: 8 }, tiles = R.footprint(s, s.aren, id, center);
        const foes = tiles.slice(0, 2).map((tile, i) => ({ ...tile, id: "enemy" + i, hp: 99, name: "Dummy", level: 1, guard: 0 }));
        R.area(s).enemies = foes;
        Object.assign(s.mira, tiles[0]); const hp = s.mira.hp;
        const pool = R.skills[id].pool, before = s.aren[pool];
        assert.equal(R.use(s, s.aren, id, id === "burst" ? center : foes[0]), true);
        assert.ok(foes.every(enemy => enemy.hp < 99));
        assert.equal(s.aren[pool], before - R.skills[id].cost);
        assert.equal(s.knowledge[id].practice, 1); assert.ok(s.mira.hp < hp);
    }
});
test("Ground bursts work without an enemy at their center and respect walls", () => {
    const s = shrine(); s.aren.x = 8; s.aren.y = 7;
    assert.ok(R.targetOptions(s, s.aren, "burst").some(tile => tile.x === 9 && tile.y === 7));
    assert.equal(R.canTarget(s, s.aren, "burst", { x: 10, y: 8 }), false);
    const tiles = R.footprint(s, s.aren, "burst", { x: 9, y: 8 });
    assert.ok(!tiles.some(tile => tile.x === 10 && tile.y === 8));
});
test("Walk-on passages transfer once, save entry, and do not react to interaction", () => {
    const s = R.create(); s.aren.x = 16; s.aren.y = 6; s.aren.direction = 6;
    assert.equal(R.interact(s), "none"); assert.equal(s.mapId, 1);
    assert.equal(R.move(s, 1, 0), true); assert.equal(s.mapId, 2);
    assert.equal(s.checkpoints.at(-1).reason, "area-entry");
    assert.equal(R.move(s, -1, 0), true); assert.equal(s.mapId, 1);
    assert.deepEqual([s.aren.x, s.aren.y], [16, 6]);
});
test("Progress uses integer percentages and lossless integer debug units", () => {
    const s = R.create(); s.knowledge.burst = { learned: false, observations: 0.05, practice: 0 };
    assert.equal(R.progressText(s, "burst"), "Learning 1% [5/300 units]");
    s.knowledge.burst = { learned: true, observations: 3, practice: 6.25 };
    assert.equal(R.progressText(s, "burst"), "Mastery 34% [625/1800 units] Power 80%");
});
test("Empty skills work outside combat and still consume resources and turns", () => {
    const s = R.create(); s.mode = "Follow"; s.aren.direction = 6;
    const before = s.aren.sp;
    assert.equal(R.cast(s, "cut"), true);
    assert.equal(s.aren.sp, before - 1); assert.equal(s.turn, 1); assert.equal(s.combat, false);
    assert.equal(R.cast(s, "spark", { x: 9, y: 7 }), true);
    assert.equal(s.aren.mp, 17);
    assert.ok(R.targetOptions(s, s.aren, "cut").length);
    s.knowledge.mend = { learned: true, observations: 3, practice: 0 }; s.equipped = ["mend"];
    assert.equal(R.cast(s, "mend", { x: 9, y: 8 }), true);
    assert.equal(s.knowledge.mend.practice, 1);
});
test("God-mode statue temporarily exposes all skills and preserves the normal loadout", () => {
    const s = R.create(); s.aren.x = 6; s.aren.y = 7; s.aren.direction = 4;
    assert.equal(R.interact(s), "god-mode"); assert.equal(s.godMode, true);
    assert.deepEqual(R.availableSkills(s, s.aren), Object.keys(R.skills));
    const resumed = JSON.parse(JSON.stringify(s));
    assert.equal(resumed.godMode, true);
    resumed.aren.direction = 6;
    assert.equal(R.cast(resumed, "whirlwind"), true);
    assert.deepEqual(resumed.knowledge, {}); assert.deepEqual(resumed.equipped, []);
    R.toggleGodMode(resumed);
    assert.deepEqual(R.availableSkills(resumed, resumed.aren), ["cut", "spark"]);
    assert.equal(R.cast(resumed, "whirlwind"), false);
});
test("Villagers inside hitboxes warn without dying, rewards, or combat", () => {
    const s = R.create(); s.aren.x = 8; s.aren.y = 6; s.aren.direction = 8;
    const gold = s.gold;
    for (let i = 0; i < 3; i++) assert.equal(R.cast(s, "cut"), true);
    assert.ok(s.log.filter(line => line.includes("Do not attack people in public")).length === 3);
    assert.equal(s.gold, gold); assert.equal(s.combat, false);
    assert.equal(R.interact(s), "guild");
});
console.log(passed + " rule tests passed.");
