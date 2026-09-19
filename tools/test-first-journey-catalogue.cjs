const assert = require("node:assert/strict");
const R = require("../src/js/plugins/FirstJourneyRules.js");
const data = require("../src/js/plugins/Skills.json");
const editor = require("../src/data/Skills.json");
assert.deepEqual(R.skills, data);
for (const [id, skill] of Object.entries(data)) {
    const seen = new Set([id]); let parent = skill.prerequisite;
    while (parent) {
        assert.ok(data[parent], `${id} missing ${parent}`);
        assert.ok(!seen.has(parent), `${id} cyclic prerequisite`);
        seen.add(parent); parent = data[parent].prerequisite;
    }
    assert.ok(editor.some(row => row?.note.includes(`<TestSkill:${id}>`)), id + " absent from editor export");
    if (skill.kind !== "damage") continue;
    for (const [otherId, other] of Object.entries(data)) {
        if (other.kind !== "damage" || other.tier !== skill.tier) continue;
        if (!R.isArea(id) && R.isArea(otherId) && skill.delivery === other.delivery) assert.ok(skill.power > other.power, id + " must beat area per target");
        if (skill.delivery === "melee" && other.delivery === "ranged" && R.isArea(id) === R.isArea(otherId)) assert.ok(skill.power > other.power, id + " must beat ranged");
    }
}
const heal2 = Object.keys(data).find(id => data[id].name === "Heal II");
assert.equal(data[data[heal2].prerequisite].name, "Heal I");
const s = R.create();
R.move(s, 1, 0); R.finishTurn(s); R.cast(s, "spark", { x: 10, y: 7 });
assert.deepEqual([s.explorationSteps, s.totalRounds, s.turn], [1, 0, 0]);
const enemy = () => ({ id: "enemy0", name: "Dummy", x: 10, y: 7, hp: 999, maxHp: 999, sp: 0, mp: 0, level: 1, job: "fighter", step: 0, active: true });
R.area(s).enemies = [enemy()]; R.combatCheck(s);
assert.equal(s.turn, 1); R.finishTurn(s); R.finishTurn(s);
assert.deepEqual([s.turn, s.totalRounds, s.explorationSteps], [3, 2, 1]);
s.aren.speedEffect = { amount: 4, remaining: 3, applied: s.totalRounds };
R.area(s).enemies = []; R.combatCheck(s); R.move(s, 0, 1);
R.area(s).enemies = [enemy()]; R.combatCheck(s);
assert.deepEqual([s.turn, s.totalRounds, s.explorationSteps], [1, 2, 2]);
R.finishTurn(s); assert.equal(s.aren.speedEffect.remaining, 2);
const restored = JSON.parse(JSON.stringify(s));
assert.deepEqual([restored.turn, restored.totalRounds, restored.explorationSteps], [2, 3, 2]);
for (let i = 0; i < 18; i++) { s.aren.mp = 99; R.use(s, s.aren, "spark", s.aren); s.aren.hp = 99; }
assert.equal(R.mastery(s, "spark"), 3);
assert.ok(R.ready(s, Object.keys(data).find(id => data[id].name === "Fire II")));
console.log("PASS catalogue loading/export, prerequisite graph, tier damage comparisons, basic proficiency, encounter reset, lifetime counters, exploration steps, serialization and cross-encounter effects.");

const open = R.create(); open.aren.x = 8; open.aren.y = 7;
for (const [id, skill] of Object.entries(R.skills).filter(([, skill]) => skill.shape === "burst")) {
    const tiles = R.footprint(open, open.aren, id, { x: 8, y: 7 });
    assert.equal(tiles.length, skill.areaRadius === 2 ? 21 : 5);
    assert.ok(tiles.every(tile => (tile.x - 8) ** 2 + (tile.y - 7) ** 2 <= (skill.areaRadius === 2 ? 6.25 : 1)));
    assert.equal(Math.max(...tiles.map(t => t.x)) - Math.min(...tiles.map(t => t.x)) + 1, skill.areaRadius * 2 + 1);
    if (skill.kind === "damage" && skill.areaRadius === 2) assert.equal(skill.power, Math.floor(6 * skill.tier * 0.75));
}
console.log("PASS targeted circular sizes and maximum-tier power tradeoff");

assert.ok(data.source113.areaRadius < data.source105.areaRadius && data.source113.power > data.source105.power, "Blizzard III retains compact power while Flame III trades power for coverage");
const blastState = R.create();
Object.assign(blastState.aren, { x: 8, y: 7, hp: 1, mp: 99 });
Object.assign(blastState.mira, { x: 9, y: 7, hp: 10 });
const foe = { id: "enemy0", name: "Dummy", x: 8, y: 8, hp: 2, maxHp: 99, level: 1 };
R.area(blastState).enemies = [foe];
assert.deepEqual(R.affected(blastState, blastState.aren, "flameNova").map(u => u.id), ["enemy0"]);
assert.deepEqual(R.affected(blastState, blastState.aren, "healingCircle").map(u => u.id), ["aren", "mira"]);
assert.ok(R.use(blastState, blastState.aren, "healingCircle"));
assert.ok(blastState.aren.hp > 1 && blastState.mira.hp > 10); assert.equal(foe.hp, 2);
assert.ok(R.use(blastState, blastState.aren, "source56", { x: 8, y: 7 }));
assert.ok(foe.hp > 2, "Targeted area healing also heals enemies");
assert.equal(R.skillCosts("burst").sp, 1);
assert.equal(R.skillCosts("source105").sp, 5);
assert.equal(R.skillCosts("stormNova").sp, 5);
assert.equal(R.skillCosts("whirlwind").mp, 2);
blastState.aren.sp = 4;
const mana = blastState.aren.mp;
assert.equal(R.use(blastState, blastState.aren, "source105", { x: 8, y: 7 }), false);
assert.equal(blastState.aren.mp, mana, "Insufficient secondary resources charge neither pool");
const guardState = R.create();
R.submit(guardState, { type: "guard" }); const guard = guardState.aren.guard;
R.use(guardState, guardState.aren, "brace");
assert.equal(guard, 1); assert.ok(guardState.aren.guard > guard, "Even novice copied Brace beats Guard");
console.log("PASS friendly fire, enemy healing, caster-centered filtering, scaled secondary costs and Guard below Brace");
