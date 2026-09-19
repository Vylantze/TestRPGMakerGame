const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("C:/Users/digi9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = path.resolve(__dirname, "../src");
const output = path.resolve(__dirname, "../Addons/FirstJourneyQA");
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".ogg": "audio/ogg", ".woff": "font/woff", ".css": "text/css", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
    const file = path.resolve(root, "." + decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0]));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => { res.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); res.end(error ? "Not found" : content); });
});
(async () => {
    fs.mkdirSync(output, { recursive: true });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    let browser, page;
    const errors = [];
    try {
        browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
        page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
        // Wait for sampled game frames, not wall time, so key taps cannot fall
        // entirely between software-rendered frames on slower test machines.
        async function press(key) {
            await page.waitForFunction(() => !(SceneManager._scene instanceof Scene_Map) || (!$gameSystem._firstJourney.round && !$gamePlayer.isMoving() && !$gameMap.events().some(event => event.isMoving()) && !SceneManager._scene._journeyEffects?.length));
            const before = await page.evaluate(() => Graphics.frameCount);
            await page.keyboard.down(key);
            await page.waitForFunction(frame => Graphics.frameCount >= frame + 3, before);
            await page.keyboard.up(key);
            const released = await page.evaluate(() => Graphics.frameCount);
            await page.waitForFunction(frame => Graphics.frameCount >= frame + 2, released);
            await page.waitForFunction(() => !$gameSystem?._firstJourney?.round);
        }
        async function dismissDialogue() {
            for (let i = 0; i < 12 && await page.evaluate(() => !!SceneManager._scene._journeyDialogue); i++) {
                await page.waitForFunction(() => !SceneManager._scene._journeyDialogue || Graphics.frameCount > SceneManager._scene._journeyDialogue.frame + 9);
                await press("Enter");
            }
            assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyDialogue), false);
        }
        page.on("pageerror", error => errors.push(error.stack));
        page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
        await page.goto("http://127.0.0.1:" + server.address().port);
        await page.waitForFunction(() => typeof SceneManager !== "undefined" && SceneManager._scene instanceof Scene_Title && SceneManager._scene._commandWindow?.isOpenAndActive());
        await press("Enter");
        await page.waitForFunction(() => SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._journeyHud);
        await page.waitForTimeout(500);
        await page.waitForFunction(() => SceneManager._scene._journeyPortraits?.every(sprite => sprite.bitmap.isReady()));
        await page.screenshot({ path: path.join(output, "portrait-conversation.png") });
        await dismissDialogue();
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.name), "Aren");
        assert.equal(await page.evaluate(() => !!$gameMap.event(9)), true, "New game creates the testing statue");
        await press("ArrowRight");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), 0, "Different-direction tap only turns");
        await press("ArrowDown");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), 0);
        await press("ArrowDown");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), 0, "Exploration movement does not count combat rounds");
        assert.deepEqual(await page.evaluate(() => [$gameSystem._firstJourney.mira.x, $gameSystem._firstJourney.mira.y]), [8, 7]);
        await press("ArrowUp");
        await press("Enter");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyDialogue.participants.includes("Mira")), true);
        await dismissDialogue();
        const walkingState = await page.evaluate(() => ({ aren: { ...$gameSystem._firstJourney.aren }, mira: { ...$gameSystem._firstJourney.mira } }));
        for (const obstacle of [{ x: 5, y: 6, direction: 2, key: "ArrowDown", dx: 0, dy: 1 }, { x: 1, y: 1, direction: 4, key: "ArrowLeft", dx: -1, dy: 0 }]) {
            const before = await page.evaluate(o => {
                const s = $gameSystem._firstJourney;
                Object.assign(s.aren, { x: o.x, y: o.y, direction: o.direction });
                SceneManager._scene.syncJourney();
                if (FirstJourneyRules.validAction(s, s.aren, { type: "move", dx: o.dx, dy: o.dy })) throw Error("Expected solid obstacle");
                window.blockedPatterns = []; window.followerPatterns = [];
                const event = $gameMap.event(1), update = event.updateAnimation;
                event.updateAnimation = function() { update.call(this); followerPatterns.push(this.pattern()); };
                const original = $gamePlayer.updateAnimation;
                $gamePlayer.updateAnimation = function() { original.call(this); blockedPatterns.push(this.pattern()); };
                return [s.turn, s.aren.hp, s.aren.sp, s.aren.mp];
            }, obstacle);
            await page.waitForFunction(() => !$gamePlayer.isMoving());
            const frame = await page.evaluate(() => Graphics.frameCount);
            await page.keyboard.down(obstacle.key);
            await page.waitForFunction(f => Graphics.frameCount >= f + 50, frame);
            await page.keyboard.up(obstacle.key);
            assert.ok(await page.evaluate(() => new Set(blockedPatterns).size >= 3), "Blocked walking cycles all walking frames");
            assert.ok(await page.evaluate(() => new Set(followerPatterns).size >= 3), "Mira also walks in place toward Aren");
            assert.equal(await page.evaluate(() => { const s = $gameSystem._firstJourney, copy = { ...s.mira }; FirstJourneyRules.faceToward(copy, s.aren); return $gameMap.event(1).direction() === copy.direction; }), true);
            assert.deepEqual(await page.evaluate(() => { const s = $gameSystem._firstJourney; return [s.turn, s.aren.hp, s.aren.sp, s.aren.mp]; }), before, "Blocked walking spends no turn or resources");
            assert.deepEqual(await page.evaluate(() => [$gamePlayer.x, $gamePlayer.y]), [obstacle.x, obstacle.y]);
            const released = await page.evaluate(() => { delete $gamePlayer.updateAnimation; delete $gameMap.event(1).updateAnimation; return Graphics.frameCount; });
            await page.waitForFunction(f => Graphics.frameCount >= f + 30, released);
            assert.equal(await page.evaluate(() => $gamePlayer.pattern()), 1, "Releasing blocked movement returns to idle");
        }
        await page.evaluate(saved => {
            Object.assign($gameSystem._firstJourney.aren, saved.aren); Object.assign($gameSystem._firstJourney.mira, saved.mira);
            SceneManager._scene.syncJourney();
        }, walkingState);
        for (const key of ["a", "c", "k", "i", "Escape"]) {
            console.log("Opening menu " + key);
            await press(key);
            await page.waitForFunction(() => !!SceneManager._scene._journeyChoices);
            console.log(await page.evaluate(() => SceneManager._scene._journeyChoices._list[0].name));
            assert.ok(await page.evaluate(() => SceneManager._scene._journeyChoices.maxItems() > 0));
            if (key === "k") await page.screenshot({ path: path.join(output, "skill-journal.png") });
            await press("Escape");
            await page.waitForFunction(() => !SceneManager._scene._journeyChoices);
            await page.waitForTimeout(150);
        }
        await press("Escape");
        await press("Enter");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices.maxItems()), 2);
        await press("Enter"); await dismissDialogue();
        await press("Escape"); await press("Escape");
        await press("Escape"); await press("ArrowDown"); await press("Enter");
        await page.waitForFunction(() => SceneManager._scene instanceof Scene_Options);
        await press("Escape");
        await page.waitForFunction(() => SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._journeyHud);
        await press("Tab");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.direct), true);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.controlled), "aren");
        const beforeDirect = await page.evaluate(() => $gameSystem._firstJourney.turn);
        await press("Space");
        assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyPendingAction), false, "Exploration never requests Mira commands");
        assert.equal(await page.evaluate(() => SceneManager._scene.commandUnit().id), "aren");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), beforeDirect);
        await press("a");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices.width), 296);
        assert.ok(await page.evaluate(() => !!SceneManager._scene._journeyPreview));
        await page.screenshot({ path: path.join(output, "skill-hover.png") });
        await press("Enter"); await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), beforeDirect, "Exploration skills execute without companion commands");
        assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyPendingAction), false);
        await press("Tab");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.controlled), "aren");
        await page.screenshot({ path: path.join(output, "town.png") });
        assert.deepEqual(await page.evaluate(() => [$gamePlayer.characterName(), $gameMap.event(1).characterName()]), ["$ArenJourney-v3", "$MiraJourney-v3"]);
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 6; s.aren.y = 7; s.aren.direction = 4;
            s.mira.x = 7; s.mira.y = 7;
            SceneManager._scene.syncJourney();
        });
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.godMode), true);
        assert.equal(await page.evaluate(() => $gameMap.event(9).characterName()), "!Other2");
        await press("a");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices.maxItems()), await page.evaluate(() => Object.keys(FirstJourneyRules.skills).length));
        await page.screenshot({ path: path.join(output, "god-mode-skills.png") });
        await press("Escape"); await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.godMode), false);
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 8; s.aren.y = 6; s.aren.direction = 8;
            SceneManager._scene.syncJourney();
        });
        await press("a"); await press("Enter"); await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.log.some(line => line.includes("Do not attack people in public"))), true);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.combat), false);
        await page.waitForFunction(() => !SceneManager._scene._journeyEffects.length);
        await page.screenshot({ path: path.join(output, "villager-warning.png") });
        await press("ArrowRight");
        const emptyCastTurn = await page.evaluate(() => $gameSystem._firstJourney.turn);
        await press("a"); await press("Enter");
        assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyTarget), true, "Empty hitboxes still open a confirmation preview");
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), emptyCastTurn);
        // Exercise transfer, combat and real engine serialization, rather than mocks.
        await page.evaluate(() => {
            FirstJourneyRules.travel($gameSystem._firstJourney, 2, 2, 9);
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => $gameMap.mapId() === 2 && SceneManager._scene._journeyHud && !$gamePlayer.isTransferring());
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney, R = FirstJourneyRules;
            R.move(s, 1, 0); SceneManager._scene.syncJourney();
        });
        await page.waitForTimeout(500);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.combat), true);
        await page.screenshot({ path: path.join(output, "shrine-combat.png") });
        await page.waitForFunction(async () => {
            try { return !!(await StorageManager.loadObject("firstJourney_combat-start")).system._firstJourney.combat; } catch { return false; }
        });
        const savedTurn = await page.evaluate(async () => (await StorageManager.loadObject("firstJourney_combat-start")).system._firstJourney.turn);
        await press("Space");
        await press("a");
        await press("ArrowDown");
        await press("Enter");
        assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyTarget), true);
        await page.screenshot({ path: path.join(output, "map-targeting.png") });
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.mp), 17, "Ember selected through both menus costs 1 MP");
        await page.evaluate(async () => { await DataManager.loadGame(0); SceneManager.goto(Scene_Map); });
        await page.waitForFunction(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene._journeyHud && !$gamePlayer.isTransferring());
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), savedTurn);
        // Force the lose condition to verify the full map-return/save adapter.
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.hp = 0; s.mira.hp = 0;
            FirstJourneyRules.finishTurn(s); SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => $gameMap.mapId() === 1 && !$gamePlayer.isTransferring());
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.defeated), 1);
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 4; s.aren.y = 5; s.aren.direction = 6; s.aren.hp = 1;
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => !$gamePlayer.isMoving());
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.hp), 44);
        assert.equal(await page.evaluate(() => $gameMap.event(2).characterName()), "!Other2");
        await dismissDialogue();
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 11; s.aren.y = 5; s.aren.direction = 6;
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => !$gamePlayer.isMoving());
        await press("Enter");
        await dismissDialogue();
        await press("ArrowDown");
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.inventory.ration), 4);
        await press("Escape");
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 8; s.aren.y = 6; s.aren.direction = 8; s.quest = "return";
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => !$gamePlayer.isMoving());
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.quest), "complete");
        await page.waitForFunction(() => SceneManager._scene._journeyPortraits.every(sprite => sprite.bitmap.isReady()));
        await page.screenshot({ path: path.join(output, "guild-conversation.png") });
        assert.deepEqual(await page.evaluate(() => SceneManager._scene._journeyDialogue.participants), ["Mira", "Aren", "Steward"]);
        await dismissDialogue();
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 16; s.aren.y = 6; s.aren.direction = 6;
            s.mira.x = 15; s.mira.y = 6;
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => !$gamePlayer.isMoving());
        const positionBeforeHold = await page.evaluate(() => $gameSystem._firstJourney.aren.x);
        await page.keyboard.down("ArrowLeft");
        await page.waitForFunction(x => $gameSystem._firstJourney.aren.x < x, positionBeforeHold);
        await page.keyboard.up("ArrowLeft");
        await page.waitForFunction(() => !$gameSystem._firstJourney.round && !$gamePlayer.isMoving());
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.direction), 4, "Holding a new direction turns and walks through Mira");
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            s.aren.x = 17; s.aren.y = 6; s.aren.direction = 6;
            SceneManager._scene.syncJourney();
        });
        await press("ArrowRight");
        await page.waitForFunction(() => $gameMap.mapId() === 2 && !$gamePlayer.isTransferring());
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.mapId), 2, "Walking into the doorway transfers without interaction");
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney, R = FirstJourneyRules;
            s.controlled = "aren"; SceneManager._scene._journeyPendingAction = { type: "wait" }; s.mira.level = 2; s.mira.mp = 29;
            s.mira.x = 8; s.mira.y = 7; s.aren.x = 7; s.aren.y = 7;
            R.area(s).enemies = R.area(s).enemies.slice(0, 2);
            Object.assign(R.area(s).enemies[0], { x: 9, y: 8, hp: 6 });
            Object.assign(R.area(s).enemies[1], { x: 8, y: 8, hp: 6 });
            SceneManager._scene.syncJourney();
            SceneManager._scene.beginJourneyTargeting("burst");
        });
        await page.waitForFunction(() => SceneManager._scene._fadeDuration === 0 && !$gamePlayer.isMoving() && !$gameMap.events().some(event => event.isMoving()));
        await press("ArrowLeft");
        assert.deepEqual(await page.evaluate(() => {
            const pick = SceneManager._scene._journeyTarget;
            return [pick.targets[pick.index].x, pick.targets[pick.index].y];
        }), [8, 8], "Ground cursor moves spatially to the adjacent tile");
        const burstStamina = await page.evaluate(() => $gameSystem._firstJourney.mira.sp);
        const partyHp = await page.evaluate(() => FirstJourneyRules.party($gameSystem._firstJourney).map(u => u.hp));
        await page.screenshot({ path: path.join(output, "area-targeting.png") });
        await press("Enter");
        assert.deepEqual(await page.evaluate(() => FirstJourneyRules.party($gameSystem._firstJourney).map(u => u.hp)), partyHp, "Burst spares the party");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.mira.mp), 24);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.mira.sp), burstStamina - 1);
        assert.equal(await page.evaluate(() => FirstJourneyRules.area($gameSystem._firstJourney).enemies.every(enemy => enemy.hp === 0)), true);
        // Track the real camera offsets during an animated step.
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            FirstJourneyRules.area(s).enemies = []; s.combat = false; s.direct = false;
            s.aren.x = 8; s.aren.y = 7; s.aren.direction = 6; s.mira.x = 7; s.mira.y = 7;
            SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => !$gamePlayer.isMoving());
        await page.evaluate(() => {
            window.cameraOffsets = [];
            const original = $gamePlayer.updateScroll;
            $gamePlayer.updateScroll = function(...args) { original.apply(this, args); cameraOffsets.push($gameMap.displayX()); };
        });
        await press("ArrowRight");
        const offsets = await page.evaluate(() => [...new Set(cameraOffsets)]);
        assert.ok(offsets.some(x => Math.abs(x - Math.floor(x) - 1 / 3) < 0.001), "Camera visits one-third tile offset");
        assert.ok(offsets.some(x => Math.abs(x - Math.floor(x) - 2 / 3) < 0.001), "Camera visits two-thirds tile offset");
        await press("Escape");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices.width), 280);
        await page.screenshot({ path: path.join(output, "field-menu.png") });
        await press("Escape");
        // A controlled encounter exercises the default menu, timeline, inspection and aiming.
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney, R = FirstJourneyRules;
            s.direct = false; s.aren.x = 8; s.aren.y = 7; s.aren.direction = 6;
            s.mira.x = 7; s.mira.y = 7; s.mode = "Follow";
            R.area(s).enemies = R.maps[2].enemies.slice(0, 2).map((e, i) => ({ ...e, id: "enemy" + i, x: 9 + i * 3, y: 7, hp: 100, maxHp: 100, sp: 0, mp: 0, speed: i ? 5 : 20, step: 0, active: true }));
            R.combatCheck(s); SceneManager._scene.syncJourney();
        });
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu && !$gamePlayer.isMoving());
        assert.deepEqual(await page.evaluate(() => SceneManager._scene._journeyChoices._list.map(e => e.name)), ["Move", "Skill", "Guard", "View Turn Order"]);
        await page.waitForFunction(() => ImageManager.loadFace("Monster").isReady());
        assert.deepEqual(await page.evaluate(() => SceneManager._scene._journeyTimelineCards.map(c => c.unitId)), ["enemy0", "aren", "mira", "enemy1"]);
        await page.screenshot({ path: path.join(output, "combat-menu.png") });
        const inspectTurn = await page.evaluate(() => $gameSystem._firstJourney.turn);
        await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("Enter");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyInspectUnit.id), "enemy0");
        await press("ArrowRight");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyInspectUnit.id), "aren");
        const clickPoint = await page.evaluate(() => {
            const card = SceneManager._scene._journeyTimelineCards[3], rect = Graphics._canvas.getBoundingClientRect();
            return { x: rect.left + (card.x + card.width / 2) * rect.width / Graphics.width, y: rect.top + (card.y + card.height / 2) * rect.height / Graphics.height };
        });
        await page.mouse.click(clickPoint.x, clickPoint.y);
        await page.waitForFunction(() => SceneManager._scene._journeyInspectUnit.id === "enemy1");
        const inspectionFrame = await page.evaluate(() => Graphics.frameCount);
        await page.waitForFunction(frame => Graphics.frameCount >= frame + 3, inspectionFrame);
        await page.screenshot({ path: path.join(output, "turn-order-inspection.png") });
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), inspectTurn);
        await press("Escape");
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyInspectUnit), null);
        await press("Enter"); // Move
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyCombatMove), true);
        await press("ArrowDown");
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMove && !$gameSystem._firstJourney.round);
        assert.deepEqual(await page.evaluate(() => [$gameSystem._firstJourney.aren.x, $gameSystem._firstJourney.aren.y]), [8, 8]);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), inspectTurn + 1);
        await page.evaluate(() => { $gameSystem._firstJourney.aren.x = 9; SceneManager._scene.syncJourney(); });
        await press("ArrowRight"); // persistent Move, wall at (10,8)
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), inspectTurn + 1);
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyCombatMove), true);
        const blockedCombatFrame = await page.evaluate(() => { window.combatPatterns = []; const original = $gamePlayer.updateAnimation; $gamePlayer.updateAnimation = function() { original.call(this); combatPatterns.push(this.pattern()); }; return Graphics.frameCount; });
        await page.keyboard.down("ArrowRight");
        await page.waitForFunction(f => Graphics.frameCount >= f + 40, blockedCombatFrame);
        await page.keyboard.up("ArrowRight");
        assert.ok(await page.evaluate(() => new Set(combatPatterns).size >= 3), "Blocked combat move animates without executing a turn");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), inspectTurn + 1);
        await page.evaluate(() => { delete $gamePlayer.updateAnimation; });
        await press("Enter"); // reopen combat commands from persistent Move
        await press("ArrowDown"); await press("ArrowDown"); await press("Enter"); // Guard
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.guard), 4);
        await press("ArrowDown"); await press("Enter"); await press("Enter"); // Skill, Sword Cut
        const aimingTurn = await page.evaluate(() => $gameSystem._firstJourney.turn);
        const aimingSp = await page.evaluate(() => $gameSystem._firstJourney.aren.sp);
        await press("ArrowDown");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.direction), 2);
        assert.deepEqual(await page.evaluate(() => {
            const pick = SceneManager._scene._journeyTarget; return [pick.targets[0].x, pick.targets[0].y];
        }), [9, 9]);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), aimingTurn);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.sp), aimingSp);
        await page.screenshot({ path: path.join(output, "directional-aiming.png") });
        await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.sp), aimingSp - 1);
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu);
        await page.evaluate(() => SceneManager._scene.beginJourneyTargeting("spark"));
        const spellFacing = await page.evaluate(() => $gameSystem._firstJourney.aren.direction);
        await press("ArrowLeft");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.aren.direction), spellFacing, "Ground targeting does not turn Aren");
        await press("Escape"); await press("Escape"); // Target and skill cancellation
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu);
        await press("Escape"); // Combat cancel enters Move
        assert.ok(await page.evaluate(() => SceneManager._scene._journeyCombatMove && !SceneManager._scene._journeyChoices));
        await press("Escape"); // Move cancel opens normal field menu
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices.width), 280);
        await press("Escape"); // Closing field menu returns to Move
        assert.ok(await page.evaluate(() => SceneManager._scene._journeyCombatMove));
        await press("Enter");
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu);
        await press("Tab");
        const directTurn = await page.evaluate(() => $gameSystem._firstJourney.turn);
        await press("Space");
        assert.ok(await page.evaluate(() => !!SceneManager._scene._journeyPendingAction));
        assert.equal(await page.evaluate(() => SceneManager._scene.commandUnit().id), "mira");
        await press("Escape");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), directTurn);
        await press("Space");
        await page.screenshot({ path: path.join(output, "mira-command.png") });
        await press("ArrowDown"); await press("ArrowDown"); await press("Enter");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.turn), directTurn + 1);
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.mira.guard), 4);
        await page.waitForFunction(() => SceneManager._scene._journeyCombatMenu && SceneManager._scene._journeyChoices.isOpenAndActive());
        await press("Escape"); // enter persistent Move while direct commands remain enabled
        assert.ok(await page.evaluate(() => SceneManager._scene._journeyCombatMove));
        await press("ArrowLeft");
        assert.ok(await page.evaluate(() => !!SceneManager._scene._journeyPendingAction));
        await press("ArrowDown"); await press("ArrowDown"); await press("Enter");
        await page.waitForFunction(() => !$gamePlayer.isMoving() && !$gameSystem._firstJourney.round);
        assert.ok(await page.evaluate(() => SceneManager._scene._journeyCombatMove && !SceneManager._scene._journeyChoices), "Move resumes after Mira's direct action");
        await page.screenshot({ path: path.join(output, "persistent-combat-move.png") });
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            FirstJourneyRules.area(s).enemies.forEach(e => e.hp = 0);
            FirstJourneyRules.combatCheck(s);
            SceneManager._scene.closeJourneyChoices(); SceneManager._scene.syncJourney();
        });
        await press("Space");
        assert.equal(await page.evaluate(() => $gameSystem._firstJourney.direct), true, "Combat command preference persists");
        assert.equal(await page.evaluate(() => !!SceneManager._scene._journeyPendingAction), false, "Returning to exploration restores Aren-only control");
        await press("Escape");
        await press("ArrowDown"); await press("ArrowDown"); await press("Enter");
        assert.deepEqual(await page.evaluate(() => SceneManager._scene._journeyChoices._entries.map(e => e.label)), await page.evaluate(() => ["Adventure Stats", "Total combat rounds: " + $gameSystem._firstJourney.totalRounds, "Exploration steps: " + $gameSystem._firstJourney.explorationSteps, "Back"]));
        await page.screenshot({ path: path.join(output, "adventure-stats.png") });
        await press("Escape"); await press("Escape");
        await press("a");
        await page.evaluate(() => { const win = SceneManager._scene._journeyChoices; win.select(win._entries.findIndex(e => e.skillId === "spark")); });
        await press("Enter"); await press("Escape");
        assert.equal(await page.evaluate(() => { const win = SceneManager._scene._journeyChoices; return win._entries[win.index()].skillId; }), "spark", "Target cancellation remembers the selected skill");
        await press("Escape"); await press("a");
        assert.equal(await page.evaluate(() => { const win = SceneManager._scene._journeyChoices; return win._entries[win.index()].skillId; }), "spark", "Reopening selects the last skill");
        assert.equal(await page.evaluate(() => JSON.parse(JSON.stringify(DataManager.makeSaveContents().system._firstJourney)).aren.lastSkill), "spark");
        await press("Escape");
        const originalKnowledge = await page.evaluate(() => JSON.parse(JSON.stringify($gameSystem._firstJourney.knowledge)));
        await page.evaluate(() => {
            const s = $gameSystem._firstJourney;
            ["mend", "light", "jab", "thrust"].forEach((id, i) => s.knowledge[id] = { learned: true, observations: 3, practice: [0, 6, 12, 18][i] });
            SceneManager._scene.journal();
        });
        assert.equal(await page.evaluate(() => SceneManager._scene._journeyChoices._entries.filter(e => e.journalId).length), 74);
        await page.screenshot({ path: path.join(output, "journal-proficiency.png") });
        await page.evaluate(knowledge => { $gameSystem._firstJourney.knowledge = knowledge; }, originalKnowledge);
        await press("Escape");
        await page.evaluate(() => { const s = $gameSystem._firstJourney; s.godMode = true; FirstJourneyRules.travel(s, 1, 8, 7); SceneManager._scene.syncJourney(); });
        await page.waitForFunction(() => $gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && SceneManager._scene._journeyOverlay);
        await page.evaluate(() => {
            const scene = SceneManager._scene; scene.beginJourneyTargeting("source105");
            scene._journeyTarget.index = scene._journeyTarget.targets.findIndex(tile => tile.x === 8 && tile.y === 7);
        });
        assert.equal(await page.evaluate(() => FirstJourneyRules.footprint($gameSystem._firstJourney, $gameSystem._firstJourney.aren, "source105", { x: 8, y: 7 }).length), 21);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(output, "wide-circular-aoe.png") });
        await press("Escape"); await press("Escape");
        assert.deepEqual(errors, []);
        console.log("PASS MZ boot, new game, movement, all menus, direct companion commands, skill hover, combat menu, turn-order inspection, directional aiming, transfer, skill targeting, combat checkpoint, engine save/load, defeat return, rest, shopping and ending; no console errors.");
    } catch (error) {
        console.error(errors);
        if (page) {
            await page.screenshot({ path: path.join(output, "failure.png") });
            console.error(await page.evaluate(() => ({ scene: SceneManager._scene?.constructor.name, error: document.getElementById("errorPrinter")?.textContent, input: [Input._latestButton, Input._pressedTime, Input._currentState], choices: SceneManager._scene._journeyChoices && { active: SceneManager._scene._journeyChoices.active, open: SceneManager._scene._journeyChoices.openness, enabled: SceneManager._scene._journeyChoices.isCancelEnabled(), children: SceneManager._scene._windowLayer.children.length } })));
        }
        throw error;
    } finally {
        if (browser) await browser.close();
        server.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
