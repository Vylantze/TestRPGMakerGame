/*:
 * @target MZ
 * @plugindesc First Journey controls, map targeting, battle feedback and portrait dialogue.
 * @author Project
 * @help Enable after FirstJourneyRules and FirstJourney. Tap to turn or step forward;
 * hold for 12 frames to walk. A opens skills; arrows select map targets and
 * Enter confirms. Face Mira and press Enter to talk. Esc opens the field menu.
 */
(() => {
    "use strict";
    const R = FirstJourneyRules;
    const current = () => $gameSystem._firstJourney;
    const portraits = { Aren: "ArenPortrait-v4", Mira: "MiraPortrait", Steward: "VillagerMalePortrait", Provisioner: "VillagerFemalePortrait" };
    const position = unit => ({ x: $gameMap.adjustX(unit.x) * 48 + 24, y: $gameMap.adjustY(unit.y) * 48 + 20 });
    const originalScroll = Game_Player.prototype.updateScroll;
    Game_Player.prototype.updateScroll = function(x, y) {
        if (!current()) return originalScroll.call(this, x, y);
        // Follow animation position in thirds of a tile (16 px), rather than snapping to destinations.
        const focus = SceneManager._scene?._journeyInspectUnit;
        this.center(focus ? focus.x : Math.round(this._realX * 3) / 3, focus ? focus.y : Math.round(this._realY * 3) / 3);
    };
    const directions = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };
    const originalStepAnime = Game_CharacterBase.prototype.hasStepAnime;
    Game_CharacterBase.prototype.hasStepAnime = function() {
        const scene = SceneManager._scene, s = current();
        const unit = s && (this === $gamePlayer ? s.aren : this === $gameMap.event(1) ? s.mira : null);
        if (!unit) return originalStepAnime.call(this);
        const walking = s && s.aren.hp > 0 && unit.hp > 0 && scene instanceof Scene_Map && scene.isActive() &&
            !s.round && !scene._journeyChoices && !scene._journeyDialogue && !scene._journeyTarget &&
            !$gameMessage.isBusy() && !$gamePlayer.isTransferring() && (!s.combat || scene._journeyCombatMove);
        const blocked = walking && scene._journeyBlockedWalkKey &&
            (Input.isPressed(scene._journeyBlockedWalkKey) || Graphics.frameCount < scene._journeyBlockedWalkUntil);
        if (this === $gamePlayer && scene && !blocked) scene._journeyBlockedWalkKey = null;
        return originalStepAnime.call(this) || !!blocked;
    };
    Scene_Map.prototype.animateJourneyBlockedStep = function(dx, dy) {
        this._journeyBlockedWalkKey = Object.keys(directions).find(key => directions[key][0] === dx && directions[key][1] === dy);
        this._journeyBlockedWalkUntil = Graphics.frameCount + $gamePlayer.animationWait() + 1;
        const members = R.party(current()).filter(unit => unit.hp > 0);
        for (let i = 1; i < members.length; i++) {
            const follower = members[i], leader = members[i - 1];
            if (follower.x === leader.x && follower.y === leader.y) follower.direction = leader.direction;
            else R.faceToward(follower, leader);
        }
        this.syncJourney();
    };
    function wrapped(bitmap, text, x, y, width, lineHeight = 29) {
        let line = "";
        for (const paragraph of text.split("\n")) {
            for (const word of paragraph.split(" ")) {
                const next = line ? line + " " + word : word;
                if (bitmap.measureTextWidth(next) > width && line) { bitmap.drawText(line, x, y, width, lineHeight); y += lineHeight; line = word; }
                else line = next;
            }
            bitmap.drawText(line, x, y, width, lineHeight); y += lineHeight; line = "";
        }
        return y;
    }
    Scene_Map.prototype.ensureJourneyPresentation = function() {
        if (this._journeyOverlay) {
            this.setChildIndex(this._journeyOverlay, this.getChildIndex(this._windowLayer) - 1);
            return;
        }
        this._journeyOverlay = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChildAt(this._journeyOverlay, this.getChildIndex(this._windowLayer));
        this._journeyEffects = [];
    };
    const originalSync = Scene_Map.prototype.syncJourney;
    Scene_Map.prototype.syncJourney = function() {
        originalSync.call(this);
        const s = current();
        if ($gameMap.mapId() !== s.mapId) return;
        this.updateJourneyDefeatedSprites();
    };
    Scene_Map.prototype.updateJourneyDefeatedSprites = function() {
        const s = current();
        if ($gameMap.mapId() !== s.mapId) return;
        for (const unit of [...R.party(s), ...R.area(s).enemies]) {
            if (unit.hp > 0) continue;
            const character = unit.id === "aren" ? $gamePlayer : unit.id === "mira" ? $gameMap.event(1) : $gameMap.event(10 + Number(unit.id.slice(5)));
            const pendingHit = (this._journeyEffects || []).some(effect => effect.mapId === s.mapId && effect.target.id === unit.id && Graphics.frameCount < effect.start + 20);
            if (character) character.setTransparent(!pendingHit);
        }
    };
    Scene_Map.prototype.updateJourneyWalking = function() {
        const key = Object.keys(directions).find(name => Input.isTriggered(name)) || Object.keys(directions).find(name => Input.isPressed(name));
        if (!key) { this._journeyHeldDirection = null; return; }
        const [dx, dy] = directions[key];
        if (this._journeyHeldDirection !== key || Input.isTriggered(key)) {
            this._journeyHeldDirection = key;
            this._journeyHoldStart = Graphics.frameCount;
            this._journeyNextStep = Graphics.frameCount + 12;
            const unit = current()[current().controlled];
            const facing = R.directions[unit.direction || 2];
            if (facing[0] === dx && facing[1] === dy) this.submitJourneyAction({ type: "move", dx, dy });
            R.face(current(), dx, dy); this.syncJourney();
            return;
        }
        R.face(current(), dx, dy); this.syncJourney();
        if (Graphics.frameCount >= this._journeyNextStep) {
            this.submitJourneyAction({ type: "move", dx, dy }); this.syncJourney();
            this._journeyNextStep = Graphics.frameCount + 9;
        }
    };
    Scene_Map.prototype.beginJourneyTargeting = function(id) {
        this.closeJourneyChoices(); this._journeyPreview = null; this.ensureJourneyPresentation();
        const s = current(), unit = this.commandUnit(), skill = R.skills[id];
        const valid = R.targetOptions(s, unit, id);
        if (!valid.length) { R.log(s, "No valid targets for " + skill.name + ". No resources spent."); this.skillMenu(); return; }
        const enemy = R.offensive(id) ? R.enemies(s).find(target => R.canTarget(s, unit, id, target)) : R.party(s).filter(target => R.canTarget(s, unit, id, target)).sort((a, b) => a.hp / R.maxStats(a).hp - b.hp / R.maxStats(b).hp)[0] || unit;
        this._journeyTarget = { id, targets: valid, index: Math.max(0, valid.findIndex(tile => enemy && tile.x === enemy.x && tile.y === enemy.y)) };
        Input.update();
    };
    Scene_Map.prototype.updateJourneyTargeting = function() {
        const selection = this._journeyTarget;
        if (!selection) return false;
        const bitmap = this._journeyOverlay.bitmap;
        if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
            this._journeyTarget = null; bitmap.clear(); this.skillMenu(); return true;
        }
        let confirm = Input.isTriggered("ok");
        const directional = ["front", "line", "arc", "around"].includes(R.skills[selection.id].shape);
        if (directional) {
            const key = Object.keys(directions).find(name => Input.isRepeated(name));
            if (key) {
                const unit = this.commandUnit(), [dx, dy] = directions[key];
                R.faceToward(unit, { x: unit.x + dx, y: unit.y + dy });
                selection.targets = R.targetOptions(current(), unit, selection.id); selection.index = 0;
                this.syncJourney();
            }
        } else if (selection.targets.length > 1) {
            const key = Object.keys(directions).find(name => Input.isRepeated(name));
            if (key) {
                const [dx, dy] = directions[key], tile = selection.targets[selection.index];
                const next = selection.targets.findIndex(p => p.x === tile.x + dx && p.y === tile.y + dy);
                if (next >= 0) selection.index = next;
            }
        } else {
            if (Input.isRepeated("left") || Input.isRepeated("up")) selection.index = (selection.index + selection.targets.length - 1) % selection.targets.length;
            if (Input.isRepeated("right") || Input.isRepeated("down")) selection.index = (selection.index + 1) % selection.targets.length;
        }
        if (TouchInput.isTriggered()) {
            const index = selection.targets.findIndex(target => { const p = position(target); return Math.abs(TouchInput.x - p.x) < 24 && Math.abs(TouchInput.y - p.y) < 30; });
            if (index >= 0) { confirm = selection.index === index; selection.index = index; }
        }
        const target = selection.targets[selection.index];
        if (confirm) {
            this._journeyTarget = null; bitmap.clear();
            this.submitJourneyAction({ type: "skill", id: selection.id, target: { x: target.x, y: target.y } }); Input.update(); return true;
        }
        this.drawJourneyTarget(selection, false);
        return true;
    };
    Scene_Map.prototype.drawJourneyTarget = function(selection, preview) {
        const bitmap = this._journeyOverlay.bitmap, target = selection.targets[selection.index];
        bitmap.clear();
        const context = bitmap.context;
        const s = current();
        for (const tile of R.footprint(s, this.commandUnit(), selection.id, target)) {
            const p = position(tile);
            bitmap.fillRect(p.x - 24, p.y - 20, 48, 48, "rgba(255,177,65,0.38)");
        }
        selection.targets.forEach((unit, index) => {
            const p = position(unit), selected = index === selection.index;
            context.strokeStyle = selected ? "#ffd979" : "#91dae9";
            context.lineWidth = selected ? 3 : 2;
            context.strokeRect(p.x - 21, p.y - 28, 42, 43);
            if (selected) {
                context.fillStyle = "#ffd979"; context.beginPath();
                context.moveTo(p.x - 8, p.y - 42); context.lineTo(p.x + 8, p.y - 42); context.lineTo(p.x, p.y - 32); context.fill();
            }
        });
        bitmap.fillRect(8, Graphics.height - 124, Graphics.width - 16, 116, "#111f31");
        bitmap.fontSize = 22; bitmap.textColor = "#ffdc91";
        bitmap.drawText(R.skills[selection.id].name + " [" + R.targetRule(selection.id) + "] → " + target.name, 24, Graphics.height - 120, Graphics.width - 48, 32);
        bitmap.fontSize = 15; bitmap.textColor = "#d3dfeb";
        const skill = R.skills[selection.id], unit = this.commandUnit();
        const power = Math.round((skill.power + (unit.level - 1) * 2) * (unit.id === "aren" && !skill.basic ? 0.6 + R.mastery(s, selection.id) * 0.2 : 1));
        const speedPower = Math.sign(skill.power) * Math.max(1, Math.round(Math.abs(skill.power) * (unit.id === "aren" ? 0.6 + R.mastery(s, selection.id) * 0.2 : 1)));
        const detail = skill.kind === "speed" ? "Speed " + (skill.power > 0 ? "+" : "") + speedPower + " for " + skill.duration + " rounds" : skill.kind === "guard" ? "Reduce the next hit" : (skill.kind === "damage" ? "Damage " : "Restore HP ") + power;
        bitmap.drawText(unit.name + " • " + R.costText(selection.id) + " • Range " + skill.range + " • " + detail, 24, Graphics.height - 87, Graphics.width - 48, 26);
        bitmap.fontSize = 15; bitmap.textColor = "#ffffff";
        bitmap.drawText((preview ? "Select skill to aim    " : selection.targets.length > 1 ? "Arrows: aim on ground    " : "Arrows: turn to aim    ") + "Enter: use skill    Esc: back", 24, Graphics.height - 58, Graphics.width - 48, 30);
        bitmap.baseTexture.update();
        return true;
    };
    R.onSkill = function(effect) {
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Map)) return;
        scene.ensureJourneyPresentation();
        const previous = scene._journeyEffects[scene._journeyEffects.length - 1];
        scene._journeyEffects.push({ ...effect, start: current().combat && previous ? Math.max(Graphics.frameCount, previous.start + 30) : Graphics.frameCount });
    };
    Scene_Map.prototype.updateJourneyEffects = function() {
        const effects = this._journeyEffects;
        if (!effects?.length) return false;
        const bitmap = this._journeyOverlay.bitmap;
        bitmap.clear();
        this._journeyEffects = effects.filter(effect => effect.mapId === current().mapId && Graphics.frameCount - effect.start < 38);
        this.updateJourneyDefeatedSprites();
        for (const effect of this._journeyEffects) {
            const elapsed = Graphics.frameCount - effect.start;
            if (elapsed < 0) continue;
            const progress = elapsed / 38, from = position(effect.user), to = position(effect.target), skill = R.skills[effect.skill];
            const color = skill.kind === "heal" || skill.kind === "revive" ? "#8dffc1" : skill.pool === "sp" ? "#fff0ce" : effect.skill === "spark" ? "#ffa156" : "#fff3a7";
            const ctx = bitmap.context;
            ctx.save(); ctx.globalAlpha = Math.min(1, (1 - progress) * 3); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 5;
            if (skill.kind === "guard") {
                ctx.beginPath(); ctx.arc(to.x, to.y, 16 + progress * 18, 0, Math.PI * 2); ctx.stroke();
            } else if (skill.pool === "sp") {
                ctx.beginPath(); ctx.moveTo(to.x - 22 + progress * 10, to.y + 20); ctx.lineTo(to.x + 22, to.y - 24 + progress * 10); ctx.stroke();
                ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
            } else if (skill.kind === "damage") {
                const flight = Math.min(1, progress * 2);
                ctx.beginPath(); ctx.arc(from.x + (to.x - from.x) * flight, from.y + (to.y - from.y) * flight, 6 + Math.sin(progress * Math.PI) * 5, 0, Math.PI * 2); ctx.fill();
                if (flight === 1) { ctx.beginPath(); ctx.arc(to.x, to.y, 12 + progress * 18, 0, Math.PI * 2); ctx.stroke(); }
            } else {
                for (let i = 0; i < 4; i++) { const x = to.x + Math.sin(i * 2) * 17, y = to.y - progress * 28 + i * 5; ctx.fillRect(x - 2, y - 6, 4, 12); ctx.fillRect(x - 6, y - 2, 12, 4); }
            }
            ctx.restore();
            bitmap.fontSize = 20; bitmap.textColor = color;
            bitmap.drawText(effect.change === 0 ? skill.name : (effect.change > 0 ? "+" : "") + effect.change, to.x - 75, to.y - 38 - progress * 22, 150, 28, "center");
            bitmap.fontSize = 17;
            bitmap.drawText(effect.user.name + " • " + skill.name, 24, Graphics.height - 48, Graphics.width - 48, 28);
        }
        bitmap.baseTexture.update();
        if (!this._journeyEffects.length) bitmap.clear();
        return true;
    };
    Scene_Map.prototype.conversation = function(participants, lines, after) {
        this.closeJourneyChoices(); this.ensureJourneyPresentation();
        this._journeyHeldDirection = null;
        const outsider = participants.some(name => !["Aren", "Mira"].includes(name));
        // Draw Mira first so Aren stands in front of her, nearer the interlocutor.
        participants = outsider ? ["Mira", "Aren", ...participants.filter(name => !["Aren", "Mira"].includes(name))] : participants;
        this._journeyDialogue = { participants, lines, index: 0, after, frame: Graphics.frameCount };
        this._journeyPortraits = participants.map((name, index) => {
            const sprite = new Sprite(ImageManager.loadPicture(portraits[name]));
            sprite.anchor.set(0.5, 1);
            sprite.x = participants.length === 1 ? Graphics.width / 2 : outsider ? (name === "Mira" ? 120 : name === "Aren" ? 275 : Graphics.width - 145) : index === 0 ? 155 : Graphics.width - 155;
            sprite.y = Graphics.height - 158;
            // Generated cutouts contain partial alpha in the painted figure.
            // Make interior pixels opaque while keeping a soft silhouette edge.
            sprite.filters = [new PIXI.Filter(undefined, `varying vec2 vTextureCoord;
                uniform sampler2D uSampler;
                void main() {
                    vec4 color = texture2D(uSampler, vTextureCoord);
                    float alpha = smoothstep(0.02, 0.35, color.a);
                    gl_FragColor = vec4(color.rgb / max(color.a, 0.0001) * alpha, alpha);
                }`)];
            const fit = () => { if (!sprite.destroyed && sprite.bitmap) { const scale = Math.min(340 / sprite.bitmap.height, 260 / sprite.bitmap.width); sprite.scale.set(outsider && name === "Mira" ? -scale : scale, scale); } };
            sprite.bitmap.addLoadListener(fit);
            this.addChildAt(sprite, this.getChildIndex(this._windowLayer)); return sprite;
        });
        // Portraits behind the dialogue text overlay.
        this.setChildIndex(this._journeyOverlay, this.getChildIndex(this._windowLayer) - 1);
        Input.update();
    };
    Scene_Map.prototype.say = function(lines) {
        const dialogue = [];
        for (const block of lines) {
            for (const segment of block.split(/\n(?=(?:Aren|Mira|Steward|Provisioner):)/)) {
                const match = segment.match(/^(Aren|Mira|Steward|Provisioner):\s*([\s\S]*)$/);
                dialogue.push({ speaker: match ? match[1] : "Journey", text: match ? match[2] : segment });
            }
        }
        const participants = [...new Set(dialogue.map(line => line.speaker).filter(name => portraits[name]))];
        if (participants.length && !participants.includes("Aren")) participants.unshift("Aren");
        this.conversation(participants, dialogue);
    };
    Scene_Map.prototype.updateJourneyDialogue = function() {
        const dialogue = this._journeyDialogue;
        if (!dialogue) return false;
        const bitmap = this._journeyOverlay.bitmap;
        if (Graphics.frameCount > dialogue.frame + 8 && (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered())) {
            dialogue.index++; dialogue.frame = Graphics.frameCount;
            if (dialogue.index >= dialogue.lines.length) {
                this._journeyDialogue = null;
                for (const sprite of this._journeyPortraits) { this.removeChild(sprite); sprite.destroy({ texture: false, baseTexture: false }); }
                this._journeyPortraits = [];
                bitmap.clear(); Input.update();
                if (dialogue.after) dialogue.after();
                return true;
            }
        }
        const line = dialogue.lines[dialogue.index];
        bitmap.clear();
        this._journeyPortraits.forEach((sprite, index) => { sprite.tint = dialogue.participants[index] === line.speaker ? 0xffffff : 0x999999; });
        bitmap.fillRect(8, Graphics.height - 164, Graphics.width - 16, 156, "#0c1827");
        bitmap.fillRect(8, Graphics.height - 164, Graphics.width - 16, 3, "#d5b873");
        bitmap.fontSize = 21; bitmap.textColor = "#f4d68c";
        bitmap.drawText(line.speaker, 28, Graphics.height - 157, Graphics.width - 56, 30);
        bitmap.fontSize = 19; bitmap.textColor = "#eef2f4";
        wrapped(bitmap, line.text, 28, Graphics.height - 123, Graphics.width - 56, 25);
        bitmap.fontSize = 12; bitmap.textColor = "#c1c9cf";
        bitmap.drawText("Enter / click to continue", 28, Graphics.height - 30, Graphics.width - 56, 20, "right");
        return true;
    };
    const originalInteract = Scene_Map.prototype.interactJourney;
    Scene_Map.prototype.interactJourney = function() {
        const s = current(), unit = s[s.controlled], [dx, dy] = R.directions[unit.direction || 2];
        const other = R.party(s).find(friend => friend !== unit && friend.x === unit.x + dx && friend.y === unit.y + dy);
        if (other) {
            R.faceToward(other, unit); this.syncJourney();
            const reply = s.mira.hp <= 0 ? "Mira needs rest or a revival spell before she can answer." : s.combat ? "Stay close, Aren. I will support you. Watch your stamina!" : s.quest === "complete" ? "Our first test is behind us. I am glad we took this journey together." : s.mira.mp < 8 ? "My mana is running low. Let us find a camp and share a ration." : s.mapId === 1 ? "May the Goddess watch over us. I am ready when you are." : "An old shrine is still a sacred place. Let us clear these goblins out, then rest together.";
            this.conversation(["Aren", "Mira"], [{ speaker: "Aren", text: "How are you doing, Mira?" }, { speaker: s.mira.hp <= 0 ? "Journey" : "Mira", text: reply }]);
            return;
        }
        const npc = (R.maps[s.mapId].npcs || []).find(person => person.x === unit.x + dx && person.y === unit.y + dy);
        if (npc?.type === "shop") {
            this.conversation(["Aren", "Provisioner"], [{ speaker: "Provisioner", text: "Setting out for the shrine? Rations are affordable, but I have only a few recovery potions in stock." }, { speaker: "Aren", text: "Let us see what we can carry." }], () => this.shop());
            return;
        }
        const rest = R.maps[s.mapId].rest;
        if (s.mapId === 1 && rest[0] === unit.x + dx && rest[1] === unit.y + dy) {
            R.rest(s); this.syncJourney();
            this.conversation(["Aren", "Mira"], [{ speaker: "Mira", text: "May the Goddess bless our journey." }, { speaker: "Aren", text: "A moment of peace before the road. We are ready to go." }]);
            return;
        }
        originalInteract.call(this);
    };
    Scene_Map.prototype.partyMenu = function() {
        this.choices(R.party(current()).map(unit => ({ label: unit.name + "   Lv." + unit.level + "   " + (unit.id === "aren" ? "Skill learner" : "Priestess") + "   SPD " + R.speed(unit) + "   HP " + unit.hp + "/" + R.maxStats(unit).hp,
            run: () => {
                const max = R.maxStats(unit), skills = R.availableSkills(current(), unit);
                this.conversation([unit.name], [{ speaker: unit.name, text: "Level " + unit.level + "  •  Speed " + R.speed(unit) + "  •  EXP " + unit.xp + "/" + unit.level * 16 + "\nHP " + unit.hp + "/" + max.hp + "   SP " + unit.sp + "/" + max.sp + "   MP " + unit.mp + "/" + max.mp + "\nSkills: " + skills.map(id => R.skills[id].name).join(", ") }], () => this.partyMenu());
            } })), () => this.fieldMenu());
    };
    Scene_Map.prototype.updateJourneySkillPreview = function() {
        const win = this._journeyChoices, id = win?._entries[win.index()]?.skillId;
        if (!id) {
            if (this._journeyPreview) { this._journeyPreview = null; this._journeyOverlay.bitmap.clear(); }
            return false;
        }
        const s = current(), unit = this.commandUnit(), targets = R.targetOptions(s, unit, id);
        if (!targets.length) { this._journeyOverlay.bitmap.clear(); return false; }
        const candidate = R.offensive(id) ? R.enemies(s).find(u => R.canTarget(s, unit, id, u)) : R.party(s).filter(u => R.canTarget(s, unit, id, u)).sort((a,b) => a.hp / R.maxStats(a).hp - b.hp / R.maxStats(b).hp)[0];
        this._journeyPreview = { id, targets, index: Math.max(0, targets.findIndex(p => candidate && p.x === candidate.x && p.y === candidate.y)) };
        this.drawJourneyTarget(this._journeyPreview, true);
        return false;
    };
    Scene_Map.prototype.enterJourneyMove = function() {
        this.closeJourneyChoices(); this._journeyCombatMove = true; Input.update();
    };
    Scene_Map.prototype.combatMenu = function() {
        if (!current().combat || current().round) return;
        this._journeyCombatMove = false;
        this.choices([
            { label: "Move", enabled: current().aren.hp > 0, run: () => {
                this.enterJourneyMove();
            } },
            { label: "Skill", enabled: current().aren.hp > 0, run: () => this.skillMenu() },
            { label: "Guard", run: () => this.submitJourneyAction({ type: current().aren.hp > 0 ? "guard" : "wait" }) },
            { label: "View Turn Order", run: () => {
                this.closeJourneyChoices(); this._journeyInspectOrder = true; this._journeyOrderIndex = 0; Input.update();
            } }
        ], () => this.enterJourneyMove(), 248);
        this._journeyCombatMenu = true;
    };
    Scene_Map.prototype.updateJourneyCombatMove = function() {
        const b = this._journeyOverlay.bitmap;
        b.clear(); b.fillRect(8, Graphics.height - 88, Graphics.width - 16, 80, "#111f31");
        b.fontSize = 20; b.textColor = "#ffdc91";
        b.drawText("Move — choose a direction", 24, Graphics.height - 82, Graphics.width - 48, 30);
        b.fontSize = 16; b.textColor = "#ffffff";
        b.drawText("Arrows: move    Enter: combat commands    Esc: menu", 24, Graphics.height - 48, Graphics.width - 48, 28);
        if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
            b.clear(); this.fieldMenu(); return true;
        }
        if (Input.isTriggered("ok")) { b.clear(); this.combatMenu(); return true; }
        if (Input.isTriggered("journeySkills")) { b.clear(); this.skillMenu(); return true; }
        if (Input.isTriggered("journeyWait")) { b.clear(); this.submitJourneyAction({ type: "wait" }); return true; }
        if (Input.isTriggered("journeyControl")) { this.toggleMiraCommands(); return true; }
        const key = Object.keys(directions).find(name => Input.isRepeated(name));
        if (key) {
            const [dx, dy] = directions[key]; R.face(current(), dx, dy);
            if (R.validAction(current(), current().aren, { type: "move", dx, dy })) {
                b.clear(); this.submitJourneyAction({ type: "move", dx, dy });
            } else { this.animateJourneyBlockedStep(dx, dy); if (Input.isTriggered(key)) SoundManager.playBuzzer(); this.syncJourney(); }
        }
        return true;
    };
    Scene_Map.prototype.drawJourneyTimeline = function() {
        if (!this._journeyTimeline) {
            this._journeyTimeline = new Sprite(new Bitmap(Graphics.width, 120));
            this.addChildAt(this._journeyTimeline, this.getChildIndex(this._windowLayer));
        }
        const s = current(), sprite = this._journeyTimeline, b = sprite.bitmap;
        sprite.visible = s.combat && !this._journeyDialogue;
        this._journeyTimelineCards = [];
        if (!sprite.visible) return;
        b.clear(); b.fontFace = $gameSystem.mainFontFace();
        const entries = R.turnOrder(s), units = [...R.party(s), ...R.area(s).enemies];
        const x0 = 244, width = Graphics.width - x0 - 12, cell = Math.min(88, (width - 16) / Math.max(1, entries.length));
        b.fillRect(x0, 12, width, 104, "rgba(12,20,32,0.96)");
        b.fontSize = 14; b.textColor = "#f4d68c";
        b.drawText("Round " + s.turn + (s.round ? " • TURN ORDER → resolving" : " • TURN ORDER → fastest first"), x0 + 8, 15, width - 16, 22);
        entries.forEach((entry, index) => {
            const unit = units.find(u => u.id === entry.unitId);
            if (!unit) return;
            const x = x0 + 8 + index * cell, y = 39, size = 38;
            const active = s.round && index === s.round.index - 1;
            const selected = this._journeyInspectOrder && this._journeyOrderIndex === index;
            const done = s.round && index < s.round.index - 1;
            b.fillRect(x, y, cell - 4, 70, selected ? "#315b71" : active ? "#715b2d" : "#1e2c40");
            b.paintOpacity = done || unit.hp <= 0 ? 100 : 255;
            const image = unit.id === "aren" || unit.id === "mira" ? ImageManager.loadPicture(portraits[unit.name]) : ImageManager.loadFace("Monster");
            if (image.isReady()) {
                if (unit.id === "aren" || unit.id === "mira") {
                    const left = unit.id === "aren" ? 0.27 : 0.24, top = unit.id === "aren" ? 0.015 : 0.04;
                    b.blt(image, image.width * left, image.height * top, image.width * 0.5, image.width * 0.5, x + (cell - 4 - size) / 2, y + 2, size, size);
                } else b.blt(image, ImageManager.faceWidth, 0, ImageManager.faceWidth, ImageManager.faceHeight, x + (cell - 4 - size) / 2, y + 2, size, size);
            }
            b.fontSize = 11; b.textColor = "#ffffff";
            const label = unit.id.startsWith("enemy") ? (unit.boss ? "Ruk" : unit.name.replace("Goblin ", "")) + " #" + (Number(unit.id.slice(5)) + 1) : unit.name;
            b.drawText(label, x + 2, y + 39, cell - 8, 16, "center");
            b.textColor = "#b7d8eb"; b.drawText("SPD " + entry.speed, x + 2, y + 54, cell - 8, 15, "center");
            b.paintOpacity = 255;
            this._journeyTimelineCards.push({ x, y, width: cell - 4, height: 70, unitId: unit.id });
        });
    };
    Scene_Map.prototype.updateJourneyOrderInspection = function() {
        const s = current(), entries = R.turnOrder(s), b = this._journeyOverlay.bitmap;
        if (!entries.length || Input.isTriggered("cancel") || Input.isTriggered("ok") || TouchInput.isCancelled()) {
            this._journeyInspectOrder = false; this._journeyInspectUnit = null;
            b.clear(); this.combatMenu(); return true;
        }
        if (Input.isRepeated("left") || Input.isRepeated("up")) this._journeyOrderIndex = (this._journeyOrderIndex + entries.length - 1) % entries.length;
        if (Input.isRepeated("right") || Input.isRepeated("down")) this._journeyOrderIndex = (this._journeyOrderIndex + 1) % entries.length;
        if (TouchInput.isTriggered()) {
            const index = this._journeyTimelineCards.findIndex(card => TouchInput.x >= card.x && TouchInput.x < card.x + card.width && TouchInput.y >= card.y && TouchInput.y < card.y + card.height);
            if (index >= 0) this._journeyOrderIndex = index;
        }
        this._journeyOrderIndex %= entries.length;
        const entry = entries[this._journeyOrderIndex];
        const unit = [...R.party(s), ...R.area(s).enemies].find(u => u.id === entry.unitId);
        this._journeyInspectUnit = unit;
        this.drawJourneyTimeline();
        b.clear();
        const p = position(unit), ctx = b.context;
        ctx.strokeStyle = "#ffe28b"; ctx.lineWidth = 3;
        ctx.strokeRect(p.x - 24, p.y - 30, 48, 54);
        ctx.fillStyle = "#ffe28b"; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 44); ctx.lineTo(p.x + 8, p.y - 44); ctx.lineTo(p.x, p.y - 33); ctx.fill();
        b.fillRect(8, Graphics.height - 88, Graphics.width - 16, 80, "#111f31");
        b.fontSize = 20; b.textColor = "#ffdc91";
        b.drawText((this._journeyOrderIndex + 1) + ". " + unit.name + " — Speed " + entry.speed, 24, Graphics.height - 82, Graphics.width - 48, 30);
        b.fontSize = 16; b.textColor = "#ffffff";
        b.drawText("Arrows / click a face: inspect actor    Enter / Esc: return    No action spent", 24, Graphics.height - 48, Graphics.width - 48, 28);
        b.baseTexture.update();
        return true;
    };
    Scene_Map.prototype.updateJourneyPresentation = function() {
        this.ensureJourneyPresentation();
        this.drawJourneyTimeline();
        if (this._journeyInspectOrder) return this.updateJourneyOrderInspection();
        if (!current().combat && this._journeyCombatMove) { this._journeyCombatMove = false; this._journeyOverlay.bitmap.clear(); }
        if (this._journeyDialogue) return this.updateJourneyDialogue();
        if (this._journeyTarget) return this.updateJourneyTargeting();
        if (this.updateJourneyEffects()) return true;
        if (this._journeyCombatMove && !current().round && !this._journeyChoices && !this._journeyPendingAction && !$gamePlayer.isMoving() && !$gameMap.events().some(event => event.isMoving())) return this.updateJourneyCombatMove();
        return this.updateJourneySkillPreview();
    };
})();
