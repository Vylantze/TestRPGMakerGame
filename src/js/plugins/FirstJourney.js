/*:
 * @target MZ
 * @plugindesc First Journey: map combat, companion control, skill journal and checkpoints.
 * @author Project
 * @help
 * Requires FirstJourneyRules above this plugin. Start a NEW GAME.
 * Arrows: move one turn. Z/Enter: interact. Space: wait. A: skills.
 * Tab: switch direct control. C: companion behavior. K: skill journal/loadout.
 * I: potions. Esc: field menu, help, save, load and retreat.
 * Automatic saves use a separate firstJourney_ prefix. No engine scripts edited.
 */
(() => {
    "use strict";
    const R = FirstJourneyRules;
    const state = () => $gameSystem._firstJourney;
    const existingSetup = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        existingSetup.call(this);
        $gameSystem._firstJourney = R.create();
        $gamePlayer.setImage("$ArenJourney-v3", 0);
        $gamePlayer.followers().hide();
    };
    // Use a dedicated save namespace; existing Project1 saves are untouched.
    DataManager.makeSavename = function(id) { return "firstJourney_file" + id; };
    DataManager.loadGlobalInfo = function() {
        return StorageManager.loadObject("firstJourney_global").then(info => { this._globalInfo = info; this.removeInvalidGlobalInfo(); }).catch(() => { this._globalInfo = []; });
    };
    DataManager.saveGlobalInfo = function() { return StorageManager.saveObject("firstJourney_global", this._globalInfo); };
    const oldSaveInfo = DataManager.makeSavefileInfo;
    DataManager.makeSavefileInfo = function() {
        const info = oldSaveInfo.call(this);
        if (state()) info.title = "First Journey • " + R.maps[state().mapId].name;
        return info;
    };
    let saveChain = Promise.resolve();
    let saveStatus = "";
    function save(reason, slot = 0) {
        $gameSystem.onBeforeSave();
        const snapshot = JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
        const info = DataManager.makeSavefileInfo();
        saveStatus = "Saving…";
        saveChain = saveChain.then(async () => {
            await StorageManager.saveObject(DataManager.makeSavename(slot), snapshot);
            // Keep separate rolling checkpoints in addition to the latest autosave.
            if (["combat-start", "combat-end", "area-entry"].includes(reason)) await StorageManager.saveObject("firstJourney_" + reason, snapshot);
            DataManager._globalInfo[slot] = info;
            await DataManager.saveGlobalInfo();
            saveStatus = "Saved • " + reason;
        }).catch(error => { console.error(error); saveStatus = "Save failed — use field menu to retry"; });
        return saveChain;
    }
    R.onCheckpoint = (_, reason) => save(reason);
    Input.keyMapper[65] = "journeySkills";
    Input.keyMapper[67] = "journeyBehavior";
    Input.keyMapper[75] = "journeyJournal";
    Input.keyMapper[73] = "journeyItems";
    Input.keyMapper[9] = "journeyControl";
    Input.keyMapper[32] = "journeyWait";
    const oldCanMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() { return state() ? false : oldCanMove.call(this); };
    const oldEncounter = Game_Player.prototype.executeEncounter;
    Game_Player.prototype.executeEncounter = function() { return state() ? false : oldEncounter.call(this); };
    const oldMenuEnabled = Scene_Map.prototype.isMenuEnabled;
    Scene_Map.prototype.isMenuEnabled = function() { return state() ? false : oldMenuEnabled.call(this); };
    const oldAuto = Scene_Map.prototype.shouldAutosave;
    Scene_Map.prototype.shouldAutosave = function() { return state() ? false : oldAuto.call(this); };
    class JourneyChoices extends Window_Command {
        initialize(rect, entries) { this._entries = entries; super.initialize(rect); }
        itemTextAlign() { return "left"; }
        itemHeight() { return 36; }
        resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = 20; }
        makeCommandList() { for (let i = 0; i < this._entries.length; i++) this.addCommand(this._entries[i].label, String(i), this._entries[i].enabled !== false); }
        drawItem(index) {
            const entry = this._entries[index];
            if (!entry.journalId) return super.drawItem(index);
            const rect = this.itemLineRect(index), id = entry.journalId;
            const known = R.learned(state(), id), progress = known ? state().knowledge[id]?.practice || 0 : 0;
            const tier = R.mastery(state(), id), colors = ["#8995a7", "#48bd76", "#478ce0", "#efc45a"];
            const names = ["Novice", "Practiced", "Adept", "Master"];
            this.resetTextColor(); this.changePaintOpacity(true);
            this.contents.fillRect(rect.x, rect.y + 8, 104, 20, "#18232f");
            this.contents.fillRect(rect.x, rect.y + 8, Math.round(104 * Math.min(1, progress / 18)), 20, colors[tier]);
            this.contents.fontSize = 13;
            this.drawText(known ? Math.min(100, Math.floor(progress / 18 * 100)) + "% " + names[tier] : "Unlearned", rect.x, rect.y, 104, "center");
            this.contents.fontSize = 18;
            this.drawText(entry.label, rect.x + 114, rect.y, rect.width - 114);
            this.resetFontSettings();
        }
        processOk() {
            if (!this.isCurrentItemEnabled()) { this.playBuzzerSound(); return; }
            this.playOkSound(); this.updateInputData(); this.deactivate();
            this._entries[this.index()].run();
        }
    }
    function syncUnit(character, unit) {
        if (!character) return;
        const dx = unit.x - character.x, dy = unit.y - character.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) {
            character.setDirection(dx ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8));
            character._x = unit.x; character._y = unit.y;
        } else if (dx || dy) character.locate(unit.x, unit.y);
        if (unit.direction) character.setDirection(unit.direction);
        character.setTransparent(unit.hp <= 0);
        character.setMoveSpeed(5);
    }
    const oldStart = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        oldStart.call(this);
        if (!state()) return;
        this._mapNameWindow.hide();
        this._journeyHud = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChildAt(this._journeyHud, this.getChildIndex(this._windowLayer));
        this.syncJourney();
        if (!state().introduced) {
            state().introduced = true;
            R.log(state(), "Aren and Mira set out from Briar Glen. Visit the guild steward at the crossroads.");
            this.say([
                "Aren: Father taught me the sword. Mother taught me magic.\nNow it is time to discover what I can make of both.",
                "Mira: And I am coming with you. Our first guild test is\nonly a goblin nest in the old shrine. We can handle that.",
                "Tap to turn or step forward; hold to walk. Moving advances time.\nA: skills  •  Tab: Mira commands  •  Space: wait\nEnter: interact with what you face  •  Esc: menu"
            ]);
            save("journey-start");
        }
    };
    Scene_Map.prototype.say = function(lines) { for (const text of lines) { $gameMessage.add(text); } };
    Scene_Map.prototype.syncJourney = function() {
        const s = state();
        if ($gameMap.mapId() !== s.mapId) {
            if (!$gamePlayer.isTransferring()) $gamePlayer.reserveTransfer(s.mapId, s.aren.x, s.aren.y, 2, 0);
            return;
        }
        syncUnit($gamePlayer, s.aren);
        syncUnit($gameMap.event(1), s.mira);
        R.area(s).enemies.forEach((unit, index) => syncUnit($gameMap.event(10 + index), unit));

    };
    Scene_Map.prototype.closeJourneyChoices = function() {
        this._journeyCombatMenu = false;
        if (this._journeyChoices) {
            this._windowLayer.removeChild(this._journeyChoices);
            this._journeyChoices.destroy();
            this._journeyChoices = null;
        }
    };
    Scene_Map.prototype.choices = function(entries, cancel, width = 360) {
        this.closeJourneyChoices();
        this._journeyPreview = null;
        const y = state().combat ? 132 : 24;
        const height = Math.min(460, Graphics.boxHeight - y - 132, entries.length * 36 + 24);
        const win = new JourneyChoices(new Rectangle(Graphics.boxWidth - width - 16, y, width, height), entries);
        win.setHandler("cancel", () => { this.closeJourneyChoices(); if (cancel) cancel(); });
        this._journeyChoices = win;
        this.addWindow(win);
        win.backOpacity = 245; win.activate(); win.select(0);
    };
    Scene_Map.prototype.act = function(callback) {
        this.closeJourneyChoices();
        if (callback() === false) R.log(state(), "Cannot do that: check resources, range and line of sight.");
        this.syncJourney();
    };
    Scene_Map.prototype.commandUnit = function() { return this._journeyPendingAction ? state().mira : state().aren; };
    Scene_Map.prototype.submitJourneyAction = function(action) {
        this.closeJourneyChoices(); this._journeyPreview = null;
        const s = state(), unit = this.commandUnit();
        if (!R.validAction(s, unit, action)) {
            if (action.type === "move" && unit.id === "aren") this.animateJourneyBlockedStep(action.dx, action.dy);
            else R.log(s, "Cannot do that: check resources, range and line of sight.");
            return false;
        }
        if (this._journeyPendingAction) {
            const arenAction = this._journeyPendingAction; this._journeyPendingAction = null;
            R.submit(s, arenAction, action, true);
        } else if (s.combat && s.direct && s.mira.hp > 0) {
            this._journeyPendingAction = action; this.miraCommandMenu();
        } else R.submit(s, action, null, true);
        this.syncJourney(); return true;
    };
    Scene_Map.prototype.miraCommandMenu = function() {
        this.choices([
            { label: "Mira — choose action", enabled: false },
            { label: "Skills", run: () => this.skillMenu() },
            { label: "Guard", run: () => this.submitJourneyAction({ type: "guard" }) },
            { label: "Follow Aren", run: () => this.submitJourneyAction({ type: "follow", target: { x: state().aren.x, y: state().aren.y } }) },
            { label: "Wait", run: () => this.submitJourneyAction({ type: "wait" }) },
            { label: "Cancel round", run: () => { this._journeyPendingAction = null; this.closeJourneyChoices(); } }
        ], () => { this._journeyPendingAction = null; });
    };
    Scene_Map.prototype.skillMenu = function() {
        const s = state(), unit = this.commandUnit(), ids = R.availableSkills(s, unit);
        this.choices(ids.map(id => ({ label: R.skills[id].name + "  " + R.costText(id),
            skillId: id, enabled: unit.hp > 0 && R.canAfford(unit, id), run: () => this.beginJourneyTargeting(id)
        })), () => { this._journeyPreview = null; this._journeyOverlay?.bitmap.clear(); if (this._journeyPendingAction) this.miraCommandMenu(); }, 296);
        this._journeyChoices.select(Math.max(0, ids.indexOf(unit.lastSkill)));
    };
    Scene_Map.prototype.journal = function() {
        const s = state();
        const entries = [{ label: (s.godMode ? "GOD MODE: all skills available | " : "") + "Copied slots: " + s.equipped.length + "/" + R.slots(s) + (s.combat ? " — locked during combat" : " — select a learned skill to equip"), enabled: false }];
        for (const id of Object.keys(R.skills)) {
            const skill = R.skills[id], k = s.knowledge[id];
            const text = R.progressText(s, id);
            entries.push({ journalId: id, label: (skill.basic ? "[Basic] " : s.equipped.includes(id) ? "[E] " : "") + skill.name + "  |  " + text, enabled: !skill.basic && !s.combat && !!k?.learned, run: () => { if (!R.equip(s, id)) R.log(s, "No free skill slots. Unequip another skill first."); this.journal(); } });
            if (skill.prerequisite && !R.ready(s, id)) entries.push({ label: "       Requires " + R.skills[skill.prerequisite].name + " at 100% mastery; locked observations +5 units", enabled: false });
        }
        this.choices(entries, null, 680);
    };
    Scene_Map.prototype.behavior = function() {
        const s = state();
        const modes = { Support: "heal, then attack if MP permits", Attack: "prioritize Saint I", Guard: "hold position; heal and reduce damage", Follow: "follow without spending resources", Conserve: "heal when needed; no offensive spells" };
        this.choices(Object.entries(modes).map(([mode, description]) => ({ label: (s.mode === mode ? "[x] " : "[ ] ") + mode + " — " + description, run: () => { s.mode = mode; s.direct = false; this.closeJourneyChoices(); R.log(s, "Mira behavior: " + mode + "."); } })));
    };
    Scene_Map.prototype.items = function() {
        const s = state();
        this.choices(["hp", "sp", "mp"].map(type => ({ label: type.toUpperCase() + " potion ×" + s.inventory[type] + "  (restores " + (type === "hp" ? 25 : 12) + ")", enabled: s.inventory[type] > 0,
            run: () => this.choices(R.party(s).map(unit => ({ label: unit.name + " " + unit[type] + "/" + R.maxStats(unit)[type], enabled: unit.hp > 0 && unit[type] < R.maxStats(unit)[type], run: () => this.submitJourneyAction({ type: "potion", pool: type, targetId: unit.id }) })), () => this.items()) })));
    };
    Scene_Map.prototype.shop = function() {
        const s = state();
        s.shopStock = s.shopStock || { hp: 2, sp: 1, mp: 1 };
        this.choices([{ label: "Provisioner • " + s.gold + " gold • potions have limited stock", enabled: false }, ...[["ration", 6], ["hp", 18], ["sp", 22], ["mp", 24]].map(([id, price]) => ({ label: (id === "ration" ? "Ration" : id.toUpperCase() + " potion") + "   " + price + " gold   (owned " + s.inventory[id] + ")" + (id === "ration" ? "" : "   stock " + s.shopStock[id]), enabled: s.gold >= price && (id === "ration" || s.shopStock[id] > 0), run: () => { s.gold -= price; s.inventory[id]++; if (id !== "ration") s.shopStock[id]--; this.shop(); } }))]);
    };
    Scene_Map.prototype.statsMenu = function() {
        const s = state();
        this.choices([
            { label: "Adventure Stats", enabled: false },
            { label: "Total combat rounds: " + s.totalRounds, enabled: false },
            { label: "Exploration steps: " + s.explorationSteps, enabled: false },
            { label: "Back", run: () => this.fieldMenu() }
        ], () => this.fieldMenu(), 420);
    };
    Scene_Map.prototype.fieldMenu = function() {
        this.choices([
            { label: "Party", run: () => this.partyMenu() },
            { label: "Options", run: () => { this.closeJourneyChoices(); SceneManager.push(Scene_Options); } },
            { label: "Stats", run: () => this.statsMenu() },
            { label: "Skills / attack [A]", run: () => this.skillMenu() },
            { label: "Skill journal [K]", run: () => this.journal() },
            { label: "Potions [I]", run: () => this.items() },
            { label: "Mira behavior [C]", run: () => this.behavior() },
            { label: "Mira combat: " + (state().direct ? "Direct" : "Auto") + " [Tab]", run: () => { this.closeJourneyChoices(); this.toggleMiraCommands(); } },
            { label: "Save", run: () => { this.closeJourneyChoices(); save("manual", 1); } },
            { label: "Load", run: () => { this.closeJourneyChoices(); SceneManager.push(Scene_Load); } },
            { label: "Controls and rules", run: () => { this.closeJourneyChoices(); this.say([
                "Tap to turn or step forward; hold to walk. Space: wait. A: skills.\nChoose a skill, aim its hitbox, then confirm. Empty casts work.\nTab: Mira commands • C: behavior • K: journal • I: potions",
                "Enter: interact beside a rest, person or supplies. Walk into doorways.\nTown rests are free. Shrine rests cost one ration.\nWaiting restores nothing. Slash costs SP; Fire I costs MP.",
                "Witness a basic skill 3 times to copy its form at 60% power.\nPractice raises it at 6/12/18 points to 80/100/120%.\nDebug units: watching +25; using +100.",
                "Advanced skills need their prerequisite at 100% mastery.\nUntil then each observation adds 5/300 learning units.\nLoadouts change outside combat; starting attacks use no slots.",
                "Combat actions resolve in descending Speed order.\nCancel from combat commands enters persistent Move.\nEnter reopens commands; Esc in Move opens the normal menu.",
                "AoE attacks also cost 1 of the other resource: SP or MP.\nOnly combat actions count rounds. Downed allies need rest\nor Revive. Defeat returns you to town with progress retained."
            ]); } }
        ], null, 280);
    };
    Scene_Map.prototype.toggleMiraCommands = function() {
        state().direct = !state().direct;
        R.log(state(), "Mira: " + (state().direct ? "direct commands in combat after Aren's action." : "automatic " + state().mode + "."));
    };
    Scene_Map.prototype.interactJourney = function() {
        const s = state(), result = R.interact(s);
        if (result === "shop") this.shop();
        if (result === "guild") {
            if (s.quest === "return") {
                s.quest = "complete"; s.gold += 40;
                this.say(["Steward: The shrine road is safe again. A fine first test!\nHere is your reward: 40 gold. You are adventurers now.", "Mira: You copied their movements, but made them your own.\nAren: There is still so much I do not understand.\nOur journey has only just begun. — Prototype complete —"]);
                save("act-complete");
            } else if (s.quest === "complete") this.say(["Steward: Well done, you two. Rest and prepare for the road.\nYou can continue exploring and practicing your skills."]);
            else this.say(["Steward: Goblins have nested in the abandoned shrine.\nClear their lookout posts and drive out their leader.\nTake the eastern road. This is your first adventurers' test.", "Mira: I know Mend and Saint I. Watch carefully!\nWe have three rations; camp only at marked rest points.\nTown lodging is free, and the provisioner sells supplies."]);
        }
        this.syncJourney();
    };
    Scene_Map.prototype.drawJourney = function() {
        const b = this._journeyHud.bitmap, s = state();
        const key = JSON.stringify([s.combat, !!this._journeyChoices, s.turn, s.mapId, s.direct, s.round?.index, R.speed(s.aren), R.speed(s.mira), s.mode, s.quest, s.gold, s.inventory, s.log, s.aren.hp, s.mira.hp, s.aren.sp, s.aren.mp, s.mira.sp, s.mira.mp, $gameMap.displayX(), $gameMap.displayY(), saveStatus]);
        if (this._journeyHudKey === key) return;
        this._journeyHudKey = key;
        b.clear(); b.fontFace = $gameSystem.mainFontFace(); b.fontSize = 17;
        b.fillRect(0, Graphics.height - 108, Graphics.width, 108, "rgba(12,20,32,0.94)");
        const text = (value, x, y, width = 760, color = "#edf1ea") => { b.textColor = color; b.drawText(value, x, y, width, 24); };
        R.party(s).forEach((unit, index) => {
            const max = R.maxStats(unit), x = 12, y = 12 + index * 116;
            b.fillRect(x, y, 220, 108, "rgba(12,20,32,0.9)");
            b.fontSize = 16;
            text(unit.name + "  Lv." + unit.level + (s.combat ? "  SPD " + R.speed(unit) : "") + (unit.hp <= 0 ? "  DOWN" : ""), x + 10, y + 3, 204);
            [["hp", "#d94c55"], ["sp", "#48bd76"], ["mp", "#478ce0"]].forEach(([pool, color], row) => {
                const yy = y + 32 + row * 23;
                b.fillRect(x + 10, yy, 200, 18, "#233044");
                b.fillRect(x + 10, yy, Math.round(200 * Math.max(0, Math.min(1, unit[pool] / max[pool]))), 18, color);
                b.fontSize = 13; text(pool.toUpperCase() + "  " + unit[pool] + " / " + max[pool], x + 18, yy - 3, 185);
            });
        });
        if (!this._journeyChoices && !s.combat) {
            b.fillRect(Graphics.width - 320, 12, 308, 108, "rgba(12,20,32,0.9)");
            b.fontSize = 15;
            text(R.maps[s.mapId].name, Graphics.width - 310, 15, 290, "#f0d79b");
            text((s.round ? "RESOLVING" : s.combat ? "COMBAT" : "EXPLORING") + (s.combat ? " • Round " + s.turn : "") + " • Mira " + (s.combat && s.direct ? "Direct" : "Auto"), Graphics.width - 310, 40, 290);
            b.fontSize = 13;
            text("Rations " + s.inventory.ration + "   Gold " + s.gold + "   " + saveStatus, Graphics.width - 310, 65, 290, "#a9c1cf");
            text(s.quest === "return" ? "Return to the guild" : s.quest === "complete" ? "First test complete" : "Clear the goblin nest", Graphics.width - 310, 88, 290, "#f0d79b");
        }
        // Location labels remain attached to their map coordinates while scrolling.
        const map = R.maps[s.mapId];
        const markers = [...(map.debugStatue ? [{ p: map.debugStatue, label: "GOD MODE " + (s.godMode ? "ON" : "OFF"), color: "#c6a5ff" }] : []), { p: map.rest, label: s.mapId === 1 ? "FREE REST" : "CAMP • 1 RATION", color: "#ffe2a4" }, ...[map.exit, map.back].filter(Boolean).map(p => ({ p, label: "PASSAGE", color: "#a6e4ef" })), ...(map.npcs || []).map(npc => ({ p: [npc.x, npc.y], label: npc.name, color: "#fff1c9" })), ...(map.caches || []).filter((_, i) => !R.area(s).caches.includes(i)).map(p => ({ p, label: "SUPPLIES", color: "#b5dfab" }))];
        for (const marker of markers) {
            const x = $gameMap.adjustX(marker.p[0]) * 48 + 24, y = $gameMap.adjustY(marker.p[1]) * 48;
            if (y > 145 && y < Graphics.height - 120) { b.textColor = marker.color; b.drawText(marker.label, x - 90, y - 26, 180, 22, "center"); }
        }
        for (const enemy of R.enemies(s)) {
            const x = $gameMap.adjustX(enemy.x) * 48 + 6, y = $gameMap.adjustY(enemy.y) * 48;
            if (y > 118 && y < Graphics.height - 120) { b.fillRect(x, y, 36, 4, "#31252b"); b.fillRect(x, y, Math.ceil(36 * enemy.hp / enemy.maxHp), 4, "#df8b70"); }
        }
        const bottom = Graphics.height - 105;
        s.log.slice(-3).forEach((line, index) => text(line, 18, bottom + index * 23, Graphics.width - 36));
        b.fontSize = 13;
        text("Tap: turn/step / Hold: walk   A skills   Tab commands   Enter talk   Space wait   Esc menu", 18, Graphics.height - 30, 680, "#a9c1cf");

    };
    const oldUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        const hadChoices = !!this._journeyChoices;
        oldUpdate.call(this);
        if (!state() || !this._journeyHud) return;
        this.drawJourney();
        if (this.updateJourneyPresentation && this.updateJourneyPresentation()) return;
        if (state().round) {
            if (Graphics.frameCount >= (this._journeyActionUntil || 0) && !$gamePlayer.isMoving() && !$gameMap.events().some(event => event.isMoving())) { R.advance(state()); this._journeyActionUntil = Graphics.frameCount + 12; this.syncJourney(); }
            return;
        }
        if (this._journeyCombatMenu) {
            if (Input.isTriggered("journeySkills")) this.skillMenu();
            else if (Input.isTriggered("journeyItems")) this.items();
            else if (Input.isTriggered("journeyBehavior")) this.behavior();
            else if (Input.isTriggered("journeyJournal")) this.journal();
            else if (Input.isTriggered("journeyControl")) this.toggleMiraCommands();
            else if (Input.isTriggered("journeyWait")) this.submitJourneyAction({ type: "wait" });
            return;
        }
        if (hadChoices || this._journeyChoices || $gameMessage.isBusy() || $gamePlayer.isTransferring() || !this.isActive() || SceneManager.isSceneChanging()) return;
        if ($gamePlayer.isMoving() || $gameMap.events().some(event => event.isMoving())) return;
        if (state().combat) {
            if (Input.isTriggered("journeySkills")) this.skillMenu();
            else if (Input.isTriggered("journeyWait")) this.submitJourneyAction({ type: "wait" });
            else if (Input.isTriggered("journeyItems")) this.items();
            else if (Input.isTriggered("journeyBehavior")) this.behavior();
            else if (Input.isTriggered("journeyJournal")) this.journal();
            else if (Input.isTriggered("journeyControl")) { this.toggleMiraCommands(); this.combatMenu(); }
            else this.combatMenu();
            return;
        }
        if (Input.isTriggered("journeySkills")) this.skillMenu();
        else if (Input.isTriggered("journeyBehavior")) this.behavior();
        else if (Input.isTriggered("journeyJournal")) this.journal();
        else if (Input.isTriggered("journeyItems")) this.items();
        else if (Input.isTriggered("journeyControl")) this.toggleMiraCommands();
        else if (Input.isTriggered("cancel") || TouchInput.isCancelled()) this.fieldMenu();
        else if (Input.isTriggered("ok")) this.interactJourney();
        else if (Input.isTriggered("journeyWait")) this.submitJourneyAction({ type: "wait" });
        else {
            this.updateJourneyWalking();
        }
    };
})();
