const assert = require("node:assert/strict");
const R = require("../src/js/plugins/FirstJourneyRules.js");
const s = R.create();
function route(target, within = 1) {
    const unit = s[s.controlled], queue = [{ x: unit.x, y: unit.y, first: null }];
    const seen = new Set([unit.x + "," + unit.y]);
    for (let index = 0; index < queue.length; index++) {
        const node = queue[index];
        if (R.distance(node, target) <= within && node.first) return node.first;
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const x = node.x + dx, y = node.y + dy, key = x + "," + y;
            if (!seen.has(key) && !R.wall(s, x, y) && ![R.maps[s.mapId].exit, R.maps[s.mapId].back].filter(Boolean).flatMap(R.passageTiles).some(tile => tile.x === x && tile.y === y) && !R.solid(s, x, y) && ![...R.enemies(s), ...R.party(s).filter(member => member !== unit && member.hp > 0)].some(other => other.x === x && other.y === y)) {
                seen.add(key); queue.push({ x, y, first: node.first || [dx, dy] });
            }
        }
    }
    return null;
}
function fight() {
    assert.equal(s.controlled, "aren", "Aren should survive this baseline expedition");
    if (s.aren.hp < 18 && s.inventory.hp) { R.potion(s, "hp", s.aren); return; }
    if (s.mira.mp < 6 && s.inventory.mp) { R.potion(s, "mp", s.mira); return; }
    const candidates = R.enemies(s).filter(enemy => enemy.active).sort((a, b) => R.distance(s.aren, a) - R.distance(s.aren, b));
    const target = candidates[0];
    assert.ok(target); R.faceToward(s.aren, target);
    for (const id of ["cut", "spark"]) if (R.canTarget(s, s.aren, id, target) && s.aren[R.skills[id].pool] >= R.skills[id].cost) { R.cast(s, id, target); return; }
    const direction = route(target);
    if (direction) R.move(s, ...direction);
    else R.finishTurn(s);
}
function walk(target) {
    for (let attempts = 0; attempts < 180 && (R.distance(s[s.controlled], target) > 1 || s.combat); attempts++) {
        assert.equal(s.defeated, 0, "Baseline expedition should not require defeat farming");
        if (s.combat) fight();
        else { const direction = route(target); assert.ok(direction, "Route to " + JSON.stringify(target)); R.move(s, ...direction); }
    }
    assert.ok(R.distance(s[s.controlled], target) <= 1);
    R.faceToward(s[s.controlled], target);
}
walk({ x: 18, y: 6 }); R.move(s, ...R.directions[s.aren.direction]); assert.equal(s.mapId, 2);
for (const mapId of [2, 3]) {
    while (R.enemies(s).length) {
        const enemy = R.enemies(s)[0];
        walk(enemy);
        if (!s.combat) R.combatCheck(s);
        for (let i = 0; i < 100 && s.combat; i++) fight();
    }
    const [x, y] = R.maps[mapId].rest; walk({ x, y }); assert.equal(R.rest(s), true);
    if (mapId === 2) { const exit = R.maps[2].exit; walk({ x: exit[0], y: exit[1] }); R.move(s, ...R.directions[s.aren.direction]); assert.equal(s.mapId, 3); }
}
assert.equal(s.quest, "return");
walk({ x: 0, y: 7 }); R.move(s, ...R.directions[s.aren.direction]); assert.equal(s.mapId, 2);
walk({ x: 0, y: 9 }); R.move(s, ...R.directions[s.aren.direction]); assert.equal(s.mapId, 1);
walk({ x: 8, y: 5 }); assert.equal(R.interact(s), "guild");
assert.equal(s.defeated, 0);
assert.ok(R.learned(s, "light"));
console.log("PASS complete expedition and return to guild, using legal movement, starting attacks, potions and ration rests.");
console.log(JSON.stringify({ combatRounds: s.totalRounds, explorationSteps: s.explorationSteps, level: s.aren.level, remainingRations: s.inventory.ration, knowledge: s.knowledge }, null, 2));
