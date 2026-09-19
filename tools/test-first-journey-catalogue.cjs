const assert = require("node:assert/strict");
const R = require("../src/js/plugins/FirstJourneyRules.js");
const data = require("../src/data/TestSkills.json");
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
assert.equal(s.turn, 0); R.finishTurn(s); R.finishTurn(s);
assert.deepEqual([s.turn, s.totalRounds, s.explorationSteps], [2, 2, 1]);
s.aren.speedEffect = { amount: 4, remaining: 3, applied: s.totalRounds };
R.area(s).enemies = []; R.combatCheck(s); R.move(s, 0, 1);
R.area(s).enemies = [enemy()]; R.combatCheck(s);
assert.deepEqual([s.turn, s.totalRounds, s.explorationSteps], [0, 2, 2]);
R.finishTurn(s); assert.equal(s.aren.speedEffect.remaining, 2);
const restored = JSON.parse(JSON.stringify(s));
assert.deepEqual([restored.turn, restored.totalRounds, restored.explorationSteps], [1, 3, 2]);
for (let i = 0; i < 18; i++) { s.aren.mp = 99; R.use(s, s.aren, "spark", s.aren); s.aren.hp = 99; }
assert.equal(R.mastery(s, "spark"), 3);
assert.ok(R.ready(s, Object.keys(data).find(id => data[id].name === "Fire II")));
console.log("PASS catalogue loading/export, prerequisite graph, tier damage comparisons, basic proficiency, encounter reset, lifetime counters, exploration steps, serialization and cross-encounter effects.");
