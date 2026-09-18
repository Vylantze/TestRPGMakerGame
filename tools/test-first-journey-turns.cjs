const assert = require("node:assert/strict");
const R = require("../src/js/plugins/FirstJourneyRules.js");
let passed = 0;
const test = (name, run) => { run(); console.log("PASS " + name); passed++; };
function fixture() {
    const s = R.create(); s.aren.x = 8; s.aren.y = 8; s.mira.x = 8; s.mira.y = 7;
    s.mode = "Follow";
    R.area(s).enemies = [{ id: "enemy0", name: "Dummy", x: 9, y: 8, hp: 30, maxHp: 30, sp: 99, mp: 99, job: "fighter", level: 1, speed: 12, step: 0, active: true }];
    return s;
}
test("Actions mutate state one at a time, fastest first", () => {
    const s = fixture(), hp = s.aren.hp;
    assert.ok(R.submit(s, { type: "skill", id: "spark", target: { x: 9, y: 8 } }, { type: "guard" }, true));
    assert.deepEqual(s.lastOrder, ["enemy0", "aren", "mira"]);
    assert.equal(s.aren.hp, hp); assert.equal(s.aren.mp, 18);
    R.advance(s); assert.ok(s.aren.hp < hp); assert.equal(s.aren.mp, 18);
    R.advance(s); assert.equal(s.aren.mp, 17); assert.equal(s.mira.guard, 0);
    R.advance(s); assert.equal(s.mira.guard, 4);
    R.advance(s); assert.equal(s.round, null);
});
test("A slower actor killed before their action spends no resources", () => {
    const s = fixture(); s.aren.hp = 1;
    R.submit(s, { type: "skill", id: "spark", target: { x: 9, y: 8 } }, { type: "wait" });
    assert.equal(s.aren.hp, 0); assert.equal(s.aren.mp, 18); assert.equal(R.enemies(s)[0].hp, 30);
    assert.equal(s.controlled, "aren");
});
test("Speed buffs affect the next round, expire after three rounds and reset at rest", () => {
    const s = fixture(); R.area(s).enemies = []; s.godMode = true;
    R.submit(s, { type: "skill", id: "haste", target: { x: 8, y: 7 } }, { type: "wait" });
    assert.deepEqual(s.lastOrder, ["aren", "mira"]); assert.equal(R.speed(s.mira), 10);
    // Aren's copied Haste is weaker; a full-strength supporter Haste is +4.
    const supporter = { ...s.aren, id: "supporter", job: "supporter", mp: 99 };
    R.use(s, supporter, "haste", s.mira); assert.equal(R.speed(s.mira), 12);
    R.submit(s, { type: "wait" }, { type: "wait" }); assert.deepEqual(s.lastOrder, ["mira", "aren"]);
    R.submit(s, { type: "wait" }, { type: "wait" }); assert.equal(R.speed(s.mira), 12);
    R.submit(s, { type: "wait" }, { type: "wait" }); assert.equal(R.speed(s.mira), 8);
    R.use(s, supporter, "slow", s.aren); assert.equal(R.speed(s.aren), 6);
    s.aren.x = 4; s.aren.y = 5; R.rest(s); assert.equal(R.speed(s.aren), 10);
});
test("Supporter progression and AoE buffs use ally filtering", () => {
    const s = fixture(); assert.deepEqual(R.jobSkills({ job: "supporter", level: 1 }), ["spark", "haste", "slow"]);
    assert.ok(R.jobSkills({ job: "supporter", level: 3 }).includes("quickening"));
    R.use(s, s.mira, "quickening", { x: 8, y: 8 });
    assert.equal(R.speed(s.aren), 13); assert.equal(R.enemies(s)[0].speedEffect, undefined);
});
test("Equal speeds use stable Aren, Mira, then enemy order", () => {
    const s = fixture(); s.aren.speed = 8; R.enemies(s)[0].speed = 8;
    R.submit(s, { type: "wait" }, { type: "wait" }); assert.deepEqual(s.lastOrder, ["aren", "mira", "enemy0"]);
});
test("Invalid commands never start a round or spend resources", () => {
    const s = fixture(); s.mira.mp = 0;
    assert.equal(R.submit(s, { type: "wait" }, { type: "skill", id: "mend", target: { x: 8, y: 8 } }), false);
    assert.equal(s.turn, 0); assert.equal(s.round, null);
});
test("Queued ground skills use the selected block, not a moving enemy", () => {
    const s = fixture(), enemy = R.enemies(s)[0];
    R.submit(s, { type: "skill", id: "spark", target: { x: 9, y: 8 } }, { type: "wait" }, true);
    enemy.x = 11; enemy.y = 8; R.advance(s); R.advance(s);
    assert.equal(enemy.hp, 30); assert.equal(s.aren.mp, 17);
});
test("Deferred rounds survive serialization without repeating an action", () => {
    const s = fixture(); R.submit(s, { type: "wait" }, { type: "guard" }, true); R.advance(s);
    const resumed = JSON.parse(JSON.stringify(s)), hp = resumed.aren.hp;
    while (resumed.round) R.advance(resumed);
    assert.equal(resumed.aren.hp, hp); assert.equal(resumed.mira.guard, 4);
});
console.log(passed + " sequential-turn tests passed.");
