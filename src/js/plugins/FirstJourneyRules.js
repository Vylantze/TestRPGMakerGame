/*:
 * @target MZ
 * @plugindesc First Journey prototype: deterministic overworld rules and content.
 * @author Project
 * @help Enable before FirstJourney. All original code; no external dependencies.
 */
(() => {
    "use strict";
    const skills = {
        haste: { name: "Haste", pool: "mp", cost: 3, power: 4, range: 4, kind: "speed", duration: 3 },
        slow: { name: "Slow", pool: "mp", cost: 3, power: -4, range: 4, kind: "speed", duration: 3 },
        quickening: { name: "Quickening Chorus", pool: "mp", cost: 6, power: 3, range: 4, shape: "burst", kind: "speed", duration: 3, prerequisite: "haste" },
        cut: { name: "Sword Cut", pool: "sp", cost: 1, power: 7, range: 1, shape: "front", kind: "damage", basic: true },
        spark: { name: "Ember", pool: "mp", cost: 1, power: 6, range: 4, kind: "damage", basic: true },
        mend: { name: "Mend", pool: "mp", cost: 3, power: 15, range: 4, kind: "heal" },
        light: { name: "Light Lance", pool: "mp", cost: 2, power: 10, range: 4, kind: "damage" },
        jab: { name: "Quick Jab", pool: "sp", cost: 2, power: 10, range: 1, shape: "front", kind: "damage" },
        thrust: { name: "Piercing Thrust", pool: "sp", cost: 3, power: 10, range: 2, shape: "line", kind: "damage" },
        whirlwind: { name: "Whirlwind", pool: "sp", cost: 4, power: 11, range: 1, shape: "around", kind: "damage", prerequisite: "jab" },
        burst: { name: "Radiant Burst", pool: "mp", cost: 5, power: 10, range: 4, shape: "burst", kind: "damage", prerequisite: "light" },
        brace: { name: "Brace", pool: "sp", cost: 2, power: 3, range: 0, kind: "guard" },
        sweep: { name: "Heavy Swing", pool: "sp", cost: 4, power: 19, range: 1, shape: "arc", kind: "damage", prerequisite: "jab" },
        greaterMend: { name: "Greater Mend", pool: "mp", cost: 5, power: 28, range: 4, kind: "heal", prerequisite: "mend" },
        revive: { name: "Revive", pool: "mp", cost: 8, power: 20, range: 4, kind: "revive", prerequisite: "mend" }
    };
    // Shared job tables apply to companions and humanoid enemies.
    const jobs = {
        supporter: [{ level: 1, skill: "spark" }, { level: 1, skill: "haste" }, { level: 1, skill: "slow" }, { level: 3, skill: "quickening" }],
        priestess: [{ level: 1, skill: "mend" }, { level: 1, skill: "light" }, { level: 2, skill: "burst" }, { level: 3, skill: "greaterMend" }, { level: 5, skill: "revive" }],
        fighter: [{ level: 1, skill: "jab" }, { level: 2, skill: "brace" }, { level: 2, skill: "thrust" }, { level: 3, skill: "sweep" }, { level: 3, skill: "whirlwind" }]
    };
    const maps = {
        1: { name: "Briar Glen", subtitle: "A coming-of-age journey", grid: [
            "###################", "#.................#", "#..###.....###....#", "#..###.....###....#",
            "#.................#", "#.................#", "#.................#", "#.................#",
            "#.................#", "#..###.....###....#", "#..###.....###....#", "#.................#", "###################"
        ], rest: [5, 5], debugStatue: [5, 7], exit: [18, 6, 2, 2, 9], npcs: [{ x: 8, y: 5, type: "guild", name: "Guild steward" }, { x: 12, y: 5, type: "shop", name: "Provisioner" }], enemies: [] },
        2: { name: "Abandoned Shrine • Approach", subtitle: "Clear the goblin nest", grid: [
            "#######################", "#.........#...........#", "#.........#...........#", "#.....................#",
            "#.........#...........#", "####..#########..######", "#.........#...........#", "#.....................#",
            "#.........#...........#", "#.....................#", "#.........#...........#", "####..#########..######",
            "#.........#...........#", "#.....................#", "#.........#...........#", "#.........#...........#", "#######################"
        ], rest: [12, 9], exit: [22, 3, 3, 2, 7], back: [0, 9, 1, 16, 6], caches: [[4, 3], [19, 13]], enemies: [
            { x: 7, y: 8, name: "Goblin lookout", job: "fighter", level: 1, hp: 22 },
            { x: 6, y: 3, name: "Goblin chanter", job: "supporter", level: 1, hp: 24 },
            { x: 17, y: 7, name: "Goblin sentry", job: "fighter", level: 2, hp: 29 },
            { x: 18, y: 3, name: "Goblin lookout", job: "fighter", level: 1, hp: 24 }
        ] },
        3: { name: "Abandoned Shrine • Inner Court", subtitle: "Find the nest leader", grid: [
            "###################", "#.................#", "#..##.........##..#", "#..##.........##..#",
            "#.................#", "#.................#", "####..#######..####", "#.................#",
            "#.................#", "#..##.........##..#", "#..##.........##..#", "#.................#", "###################"
        ], rest: [5, 8], back: [0, 7, 2, 20, 3], caches: [[13, 10]], enemies: [
            { x: 12, y: 4, name: "Goblin sentry", job: "fighter", level: 2, hp: 28 },
            { x: 13, y: 3, name: "Ruk, nest leader", job: "fighter", level: 3, hp: 62, boss: true }
        ] }
    };
    // Two floor tiles replace each side-wall doorway.
    const passageTiles = link => [{ x: link[0], y: link[1] }, { x: link[0], y: link[1] + 1 }];
    for (const map of Object.values(maps)) for (const link of [map.exit, map.back].filter(Boolean)) {
        for (const { x, y } of passageTiles(link)) map.grid[y] = map.grid[y].slice(0, x) + "." + map.grid[y].slice(x + 1);
    }
    const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const maxStats = actor => ({ hp: (actor.id === "aren" ? 44 : 36) + (actor.level - 1) * 6, sp: 22 + (actor.level - 1) * 2, mp: (actor.id === "aren" ? 18 : 26) + (actor.level - 1) * 3 });
    const jobSkills = actor => (jobs[actor.job] || []).filter(entry => entry.level <= actor.level).map(entry => entry.skill);
    function actor(id, x, y) {
        const unit = { id, name: id === "aren" ? "Aren" : "Mira", job: id === "aren" ? "mimic" : "priestess", level: 1, xp: 0, x, y, direction: 2, guard: 0, speed: id === "aren" ? 10 : 8, speedEffect: null };
        Object.assign(unit, maxStats(unit));
        return unit;
    }
    function create() {
        return { version: 1, mapId: 1, aren: actor("aren", 8, 7), mira: actor("mira", 7, 7), controlled: "aren", direct: false, round: null, mode: "Support", turn: 0, combat: false,
            knowledge: {}, equipped: [], inventory: { ration: 3, hp: 2, sp: 1, mp: 1 }, shopStock: { hp: 2, sp: 1, mp: 1 }, gold: 30, areas: {}, log: [], checkpoints: [], quest: "journey", defeated: 0 };
    }
    function log(state, text) { state.log.push(text); state.log = state.log.slice(-40); }
    function area(state) {
        if (!state.areas[state.mapId]) {
            state.areas[state.mapId] = { caches: [], enemies: maps[state.mapId].enemies.map((enemy, index) => ({ ...enemy, id: "enemy" + index, maxHp: enemy.hp, speed: enemy.job === "supporter" ? 11 : enemy.boss ? 9 : 7, speedEffect: null, sp: 999, mp: 999, guard: 0, active: false, step: 0 })) };
        }
        return state.areas[state.mapId];
    }
    const enemies = state => area(state).enemies.filter(enemy => enemy.hp > 0);
    const party = state => [state.aren, state.mira];
    function wall(state, x, y) { return !maps[state.mapId].grid[y] || maps[state.mapId].grid[y][x] !== "."; }
    function sight(state, a, b) {
        let x = a.x, y = a.y;
        const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = Math.sign(b.x - x), sy = Math.sign(b.y - y);
        let err = dx - dy;
        while (x !== b.x || y !== b.y) {
            const e = err * 2;
            if (e > -dy) { err -= dy; x += sx; }
            if (e < dx) { err += dx; y += sy; }
            if (wall(state, x, y)) return false;
        }
        return true;
    }
    const mastery = (state, id) => Math.min(3, Math.floor((state.knowledge[id]?.practice || 0) / 6));
    const ready = (state, id) => !skills[id].prerequisite || mastery(state, skills[id].prerequisite) >= 3;
    const learned = (state, id) => !!skills[id].basic || !!state.knowledge[id]?.learned;
    const slots = state => 2 + Math.floor((state.aren.level - 1) / 2);
    function unlock(state, id) {
        const entry = state.knowledge[id];
        if (entry && !entry.learned && entry.observations >= 3 && ready(state, id)) {
            entry.learned = true;
            log(state, "Aren learned his own " + skills[id].name + "! Equip it outside combat.");
        }
    }
    function observe(state, user, id) {
        if (user.id === "aren" || state.aren.hp <= 0 || skills[id].basic || distance(state.aren, user) > 7 || !sight(state, state.aren, user)) return;
        const entry = state.knowledge[id] ||= { observations: 0, practice: 0, learned: false };
        if (entry.learned) entry.practice += 0.25;
        else entry.observations = Math.round((entry.observations + (ready(state, id) ? 1 : 0.05)) * 100) / 100;
        unlock(state, id);
        for (const key of Object.keys(state.knowledge)) unlock(state, key);
    }
    function checkpoint(state, reason) {
        state.checkpoints.push({ reason, turn: state.turn });
        state.checkpoints = state.checkpoints.slice(-20);
        if (globalThis.FirstJourneyRules.onCheckpoint) globalThis.FirstJourneyRules.onCheckpoint(state, reason);
    }
    function combatCheck(state) {
        for (const enemy of enemies(state)) {
            if (party(state).some(unit => unit.hp > 0 && distance(unit, enemy) <= 5 && sight(state, unit, enemy))) enemy.active = true;
        }
        const active = enemies(state).some(enemy => enemy.active);
        if (active !== state.combat) {
            state.combat = active;
            log(state, active ? "Combat begins. Each action advances one turn." : "Combat ends. You can change your loadout.");
            checkpoint(state, active ? "combat-start" : "combat-end");
        }
    }
    function levelUp(state, reward) {
        for (const unit of party(state)) {
            unit.xp += reward;
            while (unit.xp >= unit.level * 16) {
                unit.xp -= unit.level * 16;
                unit.level++;
                // Level gains increase capacity; healing still requires supplies or rest.
                log(state, unit.name + " reached level " + unit.level + ".");
                for (const entry of jobs[unit.job] || []) if (entry.level === unit.level) log(state, unit.name + " learned " + skills[entry.skill].name + ".");
            }
        }
    }
    function footprint(state, user, id, target = aim(user, id)) {
        const skill = skills[id], [dx, dy] = directions[user.direction || 2];
        let tiles;
        if (skill.shape === "front" || skill.shape === "line") tiles = Array.from({ length: skill.range }, (_, i) => ({ x: user.x + dx * (i + 1), y: user.y + dy * (i + 1) }));
        else if (skill.shape === "arc") tiles = [-1, 0, 1].map(offset => ({ x: user.x + dx - dy * offset, y: user.y + dy + dx * offset }));
        else if (["around", "burst"].includes(skill.shape)) {
            const center = skill.shape === "around" ? user : target;
            tiles = [];
            for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
                if (skill.shape === "burst" || x || y) tiles.push({ x: center.x + x, y: center.y + y });
            }
        } else tiles = [{ x: target.x, y: target.y }];
        const origin = skill.shape === "burst" ? target : user;
        return tiles.filter(tile => !wall(state, tile.x, tile.y) && sight(state, origin, tile));
    }
    function aim(user, id) {
        const skill = skills[id], [dx, dy] = directions[user.direction || 2];
        return skill.kind === "guard" || skill.kind === "heal" || skill.kind === "revive" || skill.shape === "around" ? { x: user.x, y: user.y, name: "Self" } : { x: user.x + dx, y: user.y + dy, name: "Forward" };
    }
    function villagers(state) {
        return (maps[state.mapId].npcs || []).map((npc, index) => ({ ...npc, id: "villager" + index, villager: true, hp: 1 }));
    }
    // Classify the full shape, not the wall-clipped footprint or occupant count.
    const offensive = id => skills[id].kind === "damage" || (skills[id].kind === "speed" && skills[id].power < 0);
    const speed = unit => Math.max(1, (unit.speed || 8) + (unit.level - 1) + (unit.speedEffect?.amount || 0));
    function isArea(id) {
        const skill = skills[id];
        return ["arc", "around", "burst"].includes(skill.shape) || (["front", "line"].includes(skill.shape) && skill.range > 1);
    }
    const faction = unit => unit.villager ? "neutral" : ["aren", "mira"].includes(unit.id) ? "party" : "enemy";
    const targetRule = id => isArea(id) ? offensive(id) ? "AoE: enemies" : "AoE: allies" : "Single tile: either side";
    function affected(state, user, id, target = aim(user, id)) {
        const skill = skills[id], tiles = footprint(state, user, id, target);
        return [...party(state), ...area(state).enemies, ...villagers(state)].filter(unit => {
            if (skill.kind === "revive" ? unit.hp > 0 : unit.hp <= 0) return false;
            if (isArea(id)) {
                const sameSide = faction(unit) === faction(user);
                if (offensive(id) ? sameSide || faction(unit) === "neutral" : !sameSide) return false;
            }
            return tiles.some(tile => tile.x === unit.x && tile.y === unit.y);
        });
    }
    function targetOptions(state, user, id) {
        const skill = skills[id];
        if (skill.shape && skill.shape !== "burst" || (skill.kind === "guard" && skill.range === 0 && !skill.shape)) return [aim(user, id)];
        const candidates = [];
        for (let y = user.y - skill.range; y <= user.y + skill.range; y++) for (let x = user.x - skill.range; x <= user.x + skill.range; x++) candidates.push({ x, y, name: "Ground (" + x + ", " + y + ")" });
        return candidates.filter(target => canTarget(state, user, id, target));
    }
    function availableSkills(state, unit) {
        return unit.id === "aren" ? state.godMode ? Object.keys(skills) : ["cut", "spark", ...state.equipped] : jobSkills(unit);
    }
    function toggleGodMode(state) {
        state.godMode = !state.godMode;
        log(state, "God mode " + (state.godMode ? "ON: Aren can use every skill without equipping it." : "OFF: Aren's normal learned skills and loadout apply."));
        checkpoint(state, "god-mode");
        return state.godMode;
    }
    function progressText(state, id) {
        const entry = state.knowledge[id], known = learned(state, id);
        const value = known ? entry?.practice || 0 : entry?.observations || 0, cap = known ? 18 : 3;
        return (known ? "Mastery " : "Learning ") + Math.min(100, Math.floor(value / cap * 100)) + "% [" + Math.round(value * 100) + "/" + cap * 100 + " units]" + (known ? " Power " + Math.round((skills[id].basic ? 1 : 0.6 + mastery(state, id) * 0.2) * 100) + "%" : "");
    }
    function canTarget(state, user, id, target) {
        const skill = skills[id];
        if (!skill || !target || !Number.isInteger(target.x) || !Number.isInteger(target.y)) return false;
        if (skill.shape === "burst") return !wall(state, target.x, target.y) && distance(user, target) <= skill.range && sight(state, user, target);
        if (skill.shape) return footprint(state, user, id, target).some(tile => tile.x === target.x && tile.y === target.y);
        return !wall(state, target.x, target.y) && distance(user, target) <= skill.range && sight(state, user, target);
    }
    function use(state, user, id, target = aim(user, id)) {
        const skill = skills[id];
        if (!skill || user.hp <= 0 || user[skill.pool] < skill.cost) return false;
        if (skill.kind === "guard" && skill.range === 0 && !skill.shape) target = user;
        if (target.hp !== undefined && !canTarget(state, user, id, target)) return false;
        if ((!skill.shape || skill.shape === "burst") && !canTarget(state, user, id, target)) return false;
        user[skill.pool] -= skill.cost;
        const factor = user.id === "aren" && !skill.basic ? 0.6 + mastery(state, id) * 0.2 : 1;
        const power = Math.round((skill.power + (user.level - 1) * 2) * factor);
        observe(state, user, id);
        const targets = affected(state, user, id, target);
        if (!targets.length && globalThis.FirstJourneyRules.onSkill) globalThis.FirstJourneyRules.onSkill({ mapId: state.mapId, skill: id, user: { ...user }, target: { ...target }, change: 0 });
        for (const target of targets) {
            const beforeHp = target.hp;
            if (target.villager && skill.kind === "damage") {
                log(state, target.name + ': "Aren! Do not attack people in public!"');
                if (globalThis.FirstJourneyRules.onSkill) globalThis.FirstJourneyRules.onSkill({ mapId: state.mapId, skill: id, user: { ...user }, target: { ...target }, change: 0 });
                continue;
            }
            if (skill.kind === "speed") {
                const amount = Math.sign(skill.power) * Math.max(1, Math.round(Math.abs(skill.power) * factor));
                target.speedEffect = { amount, remaining: skill.duration, applied: state.turn };
                log(state, user.name + " uses " + skill.name + ": " + target.name + " Speed " + (amount > 0 ? "+" : "") + amount + " for " + skill.duration + " rounds.");
            } else if (skill.kind === "heal" || skill.kind === "revive") {
                const amount = Math.min((target.maxHp || (target.villager ? 1 : maxStats(target).hp)) - target.hp, power);
                target.hp += amount;
                log(state, user.name + " uses " + skill.name + ": " + target.name + " +" + amount + " HP.");
            } else if (skill.kind === "guard") {
                target.guard = Math.max(1, power);
                log(state, user.name + " uses " + skill.name + ": " + target.name + " guards the next hit.");
            } else {
                const amount = Math.max(1, power - (target.guard || 0));
                target.guard = 0;
                target.hp = Math.max(0, target.hp - amount);
                log(state, user.name + " uses " + skill.name + ": " + target.name + " -" + amount + " HP.");
                if (!target.hp) {
                    log(state, target.name + " falls.");
                    if (target.id.startsWith("enemy")) {
                        state.gold += target.boss ? 25 : 8;
                        levelUp(state, target.boss ? 24 : 9);
                        if (target.boss) {
                            state.quest = "return";
                            log(state, "The nest leader is beaten! Return to the guild steward.");
                        }
                    }
                }
            }
            if (globalThis.FirstJourneyRules.onSkill) globalThis.FirstJourneyRules.onSkill({ mapId: state.mapId, skill: id, user: { ...user }, target: { ...target }, change: target.hp - beforeHp });
        }
        if (user.id === "aren" && !skill.basic && state.knowledge[id]?.learned && !state.godMode) {
            state.knowledge[id].practice += 1;
            for (const key of Object.keys(state.knowledge)) unlock(state, key);
        }

        return true;
    }
    const directions = { 2: [0, 1], 4: [-1, 0], 6: [1, 0], 8: [0, -1] };
    function faceToward(unit, target) {
        const dx = target.x - unit.x, dy = target.y - unit.y;
        if (dx || dy) unit.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8);
    }
    function face(state, dx, dy) { faceToward(state[state.controlled], { x: state[state.controlled].x + dx, y: state[state.controlled].y + dy }); }
    function solid(state, x, y) {
        const map = maps[state.mapId];
        return (map.debugStatue?.[0] === x && map.debugStatue?.[1] === y) || (map.rest[0] === x && map.rest[1] === y) || (map.caches || []).some(p => p[0] === x && p[1] === y) || (map.npcs || []).some(npc => npc.x === x && npc.y === y);
    }
    function occupied(state, x, y, ignore) {
        return solid(state, x, y) || [...party(state), ...enemies(state)].some(unit => unit !== ignore && unit.hp > 0 && unit.x === x && unit.y === y);
    }
    function step(state, unit, dx, dy) {
        const x = unit.x + dx, y = unit.y + dy;
        faceToward(unit, { x, y });
        if (wall(state, x, y) || occupied(state, x, y, unit)) return false;
        unit.x = x; unit.y = y;
        return true;
    }
    function approach(state, unit, target) {
        // Breadth-first pathing prevents followers and enemies sticking to corners.
        const queue = [{ x: unit.x, y: unit.y, first: null }], seen = new Set([unit.x + "," + unit.y]);
        for (let i = 0; i < queue.length; i++) {
            const node = queue[i];
            if (distance(node, target) <= 1 && node.first) return step(state, unit, node.first[0], node.first[1]);
            for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
                const x = node.x + dx, y = node.y + dy, key = x + "," + y;
                if (!seen.has(key) && !wall(state, x, y) && !occupied(state, x, y, unit)) {
                    seen.add(key); queue.push({ x, y, first: node.first || [dx, dy] });
                }
            }
        }
        return false;
    }
    function companion(state) {
        const unit = state.controlled === "aren" ? state.mira : state.aren;
        const leader = state[state.controlled];
        if (unit.hp <= 0) return;
        const nearby = enemies(state).filter(enemy => enemy.active).sort((a, b) => distance(unit, a) - distance(unit, b));
        const target = nearby[0];
        if (target) faceToward(unit, target);
        if (unit.id === "mira") {
            const mode = state.mode;
            const wounded = party(state).filter(member => member.hp > 0 && member.hp < maxStats(member).hp * 0.65).sort((a, b) => a.hp / maxStats(a).hp - b.hp / maxStats(b).hp);
            if (["Support", "Conserve", "Guard"].includes(mode) && wounded[0] && use(state, unit, "mend", wounded[0])) return;
            if (["Attack", "Support"].includes(mode) && target && (mode === "Attack" || unit.mp > 8)) {
                if (jobSkills(unit).includes("burst") && affected(state, unit, "burst", target).length > 1 && use(state, unit, "burst", target)) return;
                if (use(state, unit, "light", target)) return;
            }
            if (mode === "Guard" && state.combat) { unit.guard = 4; return; }
        } else if (target && use(state, unit, "cut", target)) return;
        if (distance(unit, leader) > 1) approach(state, unit, leader);
    }
    function restore(state) {
        for (const unit of party(state)) { Object.assign(unit, maxStats(unit)); unit.guard = 0; unit.speedEffect = null; }
    }
    function travel(state, mapId, x, y) {
        if (state.combat) checkpoint(state, "combat-end");
        for (const enemy of enemies(state)) enemy.active = false;
        state.combat = false;
        state.mapId = mapId;
        state.aren.x = x; state.aren.y = y;
        state.mira.x = x; state.mira.y = y;
        const open = [[x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y]].find(([a, b]) => !wall(state, a, b) && !solid(state, a, b) && !enemies(state).some(enemy => enemy.x === a && enemy.y === b));
        if (open) [state.mira.x, state.mira.y] = open;
        log(state, "Entered " + maps[mapId].name + ".");
        checkpoint(state, "area-entry");
    }
    function enemyAction(state, enemy) {
        const targets = party(state).filter(unit => unit.hp > 0).sort((a, b) => distance(enemy, a) - distance(enemy, b));
        if (!targets.length) return;
        const target = targets[0];
        faceToward(enemy, target);
        enemy.step++;
        const known = jobSkills(enemy);
        let id = "jab";
        if (enemy.job === "supporter") {
            const ally = enemies(state).find(unit => !unit.speedEffect && distance(enemy, unit) <= 4);
            if (ally && enemy.step % 2 === 1 && use(state, enemy, "haste", ally)) return;
            if (!target.speedEffect && use(state, enemy, "slow", target)) return;
            if (use(state, enemy, "spark", target)) return;
            approach(state, enemy, target); return;
        }
        if (known.includes("sweep") && enemy.step % 3 === 0) id = "sweep";
        else if (known.includes("whirlwind") && enemy.step % 5 === 0) id = "whirlwind";
        else if (known.includes("brace") && enemy.step % 4 === 0) id = "brace";
        else if (known.includes("thrust") && enemy.step % 2 === 0) id = "thrust";
        if (known.includes("sweep") && enemy.step % 3 === 2) log(state, enemy.name + " raises his club for his next attack.");
        if (!use(state, enemy, id, target)) approach(state, enemy, target);
    }
    function endRound(state) {
        if (party(state).every(unit => unit.hp <= 0)) {
            state.defeated++;
            // Keep earned progression and defeated enemies; surviving enemies recover.
            for (const saved of Object.values(state.areas)) for (const enemy of saved.enemies) if (enemy.hp > 0) { enemy.hp = enemy.maxHp; enemy.active = false; }
            travel(state, 1, 6, 6);
            restore(state);
            state.controlled = "aren";
            log(state, "Villagers brought you home. Your progress is retained; town rest restores the party.");
            checkpoint(state, "defeat-return");
        } else {
            state.controlled = "aren";
            combatCheck(state);
        }
    }
    function executeMove(state, dx, dy) {
        const unit = state[state.controlled];
        face(state, dx, dy);
        const previous = { x: unit.x, y: unit.y };
        const other = party(state).find(member => member !== unit && member.hp > 0 && member.x === unit.x + dx && member.y === unit.y + dy);
        if (other) {
            if (wall(state, other.x, other.y) || solid(state, other.x, other.y) || enemies(state).some(enemy => enemy.x === other.x && enemy.y === other.y)) return false;
            unit.x = other.x; unit.y = other.y;
            faceToward(other, previous); Object.assign(other, previous);
        } else if (!step(state, unit, dx, dy)) return false;
        const portal = [maps[state.mapId].exit, maps[state.mapId].back].filter(Boolean).find(link => passageTiles(link).some(tile => unit.x === tile.x && unit.y === tile.y));
        if (portal) { state.round = null; travel(state, portal[2], portal[3], portal[4]); }
        return true;
    }
    function validAction(state, unit, action) {
        if (!action || !["skill", "move", "wait", "guard", "potion", "follow", "auto"].includes(action.type)) return false;
        if (unit.hp <= 0) return action.type === "wait";
        if (action.type === "skill") {
            const skill = skills[action.id];
            return !!skill && availableSkills(state, unit).includes(action.id) && unit[skill.pool] >= skill.cost && ((skill.shape && skill.shape !== "burst") || canTarget(state, unit, action.id, action.target || aim(unit, action.id)));
        }
        if (action.type === "move") return Math.abs(action.dx) + Math.abs(action.dy) === 1 && !wall(state, unit.x + action.dx, unit.y + action.dy) && !solid(state, unit.x + action.dx, unit.y + action.dy) && !enemies(state).some(e => e.x === unit.x + action.dx && e.y === unit.y + action.dy);
        if (action.type === "potion") {
            const target = state[action.targetId];
            return ["hp", "sp", "mp"].includes(action.pool) && state.inventory[action.pool] > 0 && target?.hp > 0 && target[action.pool] < maxStats(target)[action.pool];
        }
        return true;
    }
    function turnOrder(state) {
        if (!state.combat) return [];
        if (state.round) return state.round.entries.map(entry => ({ unitId: entry.unitId, speed: entry.speed }));
        return [...party(state), ...enemies(state).filter(unit => unit.active)].filter(unit => unit.hp > 0)
            .map((unit, order) => ({ unitId: unit.id, speed: speed(unit), order }))
            .sort((a, b) => b.speed - a.speed || a.order - b.order);
    }
    function submit(state, action, miraAction = null, deferred = false) {
        if (state.round || !validAction(state, state.aren, action) || (miraAction && !validAction(state, state.mira, miraAction))) return false;
        for (const [unit, command] of [[state.aren, action], [state.mira, miraAction]]) {
            if (command?.type === "skill" && offensive(command.id)) {
                for (const enemy of affected(state, unit, command.id, command.target).filter(target => faction(target) === "enemy")) enemy.active = true;
            }
        }
        combatCheck(state);
        state.turn++;
        const previous = { x: state.aren.x, y: state.aren.y };
        const entries = [{ unitId: "aren", action }, { unitId: "mira", action: miraAction || { type: action.type === "move" ? "follow" : "auto", target: previous } }, ...enemies(state).filter(e => e.active).map(e => ({ unitId: e.id, action: { type: "enemy" } }))].filter(entry => [...party(state), ...area(state).enemies].find(unit => unit.id === entry.unitId)?.hp > 0);
        if (!state.combat) {
            // Exploration resolves immediately in leader/follower order, without initiative or pacing delays.
            state.lastOrder = [];
            const mapId = state.mapId;
            for (const entry of entries) {
                executeAction(state, entry);
                if (state.mapId !== mapId) return true;
            }
            endRound(state); return true;
        }
        const units = [...party(state), ...area(state).enemies];
        entries.forEach((entry, index) => { entry.speed = speed(units.find(u => u.id === entry.unitId)); entry.order = index; });
        entries.sort((a, b) => b.speed - a.speed || a.order - b.order);
        state.round = { entries, index: 0, mapId: state.mapId };
        state.lastOrder = entries.map(e => e.unitId);
        if (!deferred) while (state.round) advance(state);
        return true;
    }
    function advance(state) {
        const round = state.round;
        if (!round) return false;
        if (round.index >= round.entries.length) {
            state.round = null;
            for (const unit of [...party(state), ...area(state).enemies]) {
                if (unit.speedEffect && unit.speedEffect.applied < state.turn && --unit.speedEffect.remaining <= 0) unit.speedEffect = null;
            }
            endRound(state); return false;
        }
        executeAction(state, round.entries[round.index++]);
        return true;
    }
    function executeAction(state, { unitId, action }) {
        const unit = [...party(state), ...area(state).enemies].find(u => u.id === unitId);
        if (!unit || unit.hp <= 0) return true;
        if (action.type === "enemy") enemyAction(state, unit);
        else if (action.type === "auto") companion(state);
        else if (action.type === "follow") {
            if (!(state.mode === "Guard" && state.combat) && (unit.x !== action.target.x || unit.y !== action.target.y)) {
                if (distance(unit, action.target) === 1) step(state, unit, action.target.x - unit.x, action.target.y - unit.y);
                else approach(state, unit, state.aren);
            }
        } else if (action.type === "move") executeMove(state, action.dx, action.dy);
        else if (action.type === "skill") {
            if (!use(state, unit, action.id, action.target)) log(state, unit.name + " cannot execute " + skills[action.id].name + ".");
        } else if (action.type === "guard") { unit.guard = 4; log(state, unit.name + " guards."); }
        else if (action.type === "potion" && validAction(state, unit, action)) {
            const target = state[action.targetId], pool = action.pool;
            state.inventory[pool]--; target[pool] = Math.min(maxStats(target)[pool], target[pool] + (pool === "hp" ? 25 : 12));
            log(state, unit.name + " gives " + target.name + " a " + pool.toUpperCase() + " potion.");
        }
        return true;
    }
    function move(state, dx, dy) { face(state, dx, dy); return submit(state, { type: "move", dx, dy }); }
    function cast(state, id, target) { return submit(state, { type: "skill", id, target: target || aim(state.aren, id) }); }
    function finishTurn(state) { return submit(state, { type: "wait" }); }
    function equip(state, id) {
        if (state.combat || !learned(state, id) || skills[id].basic) return false;
        if (state.equipped.includes(id)) state.equipped.splice(state.equipped.indexOf(id), 1);
        else if (state.equipped.length < slots(state)) state.equipped.push(id);
        else return false;
        return true;
    }
    function rest(state) {
        const point = maps[state.mapId].rest;
        if (state.combat || distance(state[state.controlled], { x: point[0], y: point[1] }) > 1) return false;
        if (state.mapId !== 1 && state.inventory.ration <= 0) { log(state, "You need one ration to rest here."); return false; }
        if (state.mapId !== 1) state.inventory.ration--;
        restore(state); log(state, state.mapId === 1 ? "A free town rest restores HP, SP and MP." : "Used one ration. The party is fully restored.");
        checkpoint(state, "rest"); return true;
    }
    function potion(state, type, target) { return submit(state, { type: "potion", pool: type, targetId: target.id }); }
    function interact(state) {
        const unit = state[state.controlled], map = maps[state.mapId];
        const delta = directions[unit.direction || 2], front = { x: unit.x + delta[0], y: unit.y + delta[1] };
        const atFront = p => p[0] === front.x && p[1] === front.y;
        const friend = party(state).find(member => member !== unit && member.x === front.x && member.y === front.y);
        if (friend) { faceToward(friend, unit); return "companion"; }
        if (map.debugStatue && atFront(map.debugStatue)) { toggleGodMode(state); return "god-mode"; }
        if (atFront(map.rest)) { rest(state); return "rest"; }
        for (const [index, point] of (map.caches || []).entries()) {
            if (atFront(point) && !area(state).caches.includes(index) && !state.combat) {
                area(state).caches.push(index); state.inventory.ration++; state.gold += 6;
                log(state, "Found a ration and 6 gold in abandoned supplies."); checkpoint(state, "supplies"); return "cache";
            }
        }
        for (const npc of map.npcs || []) if (npc.x === front.x && npc.y === front.y) return npc.type;
        log(state, "Face a person or object, then press Enter."); return "none";
    }
    const api = { turnOrder, speed, offensive, validAction, submit, advance, isArea, targetRule, passageTiles, aim, villagers, availableSkills, toggleGodMode, footprint, affected, targetOptions, progressText, skills, jobs, maps, create, area, enemies, party, distance, maxStats, jobSkills, wall, sight, mastery, ready, learned, slots, observe, use, move, cast, equip, rest, potion, interact, travel, finishTurn, combatCheck, log, checkpoint, canTarget, directions, face, faceToward, solid };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    globalThis.FirstJourneyRules = api;
})();
