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
    const directions = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };
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
        // Saves made before the temporary statue was added lack its Game_Event.
        if (R.maps[s.mapId].debugStatue && !$gameMap.event(9) && $dataMap.events[9] && this._spriteset) {
            const statue = new Game_Event(s.mapId, 9);
            $gameMap._events[9] = statue;
            const sprite = new Sprite_Character(statue);
            this._spriteset._characterSprites.push(sprite);
            this._spriteset._tilemap.addChild(sprite);
        }
        const rest = $gameMap.event(2);
        if (rest) {
            rest.setImage(s.mapId === 1 ? "!Other2" : "!Flame", s.mapId === 1 ? 4 : 2);
            rest.setDirectionFix(false); rest.setDirection(2); rest.setDirectionFix(true);
            rest.setPattern(1); rest.setStepAnime(s.mapId !== 1); rest.setThrough(false);
        }
        // Old saves may have placed a character on a formerly walkable object.
        for (const unit of R.party(s)) {
            if (R.solid(s, unit.x, unit.y)) {
                const open = Object.values(R.directions).map(([dx, dy]) => ({ x: unit.x + dx, y: unit.y + dy })).find(p => !R.wall(s, p.x, p.y) && !R.solid(s, p.x, p.y) && ![...R.party(s), ...R.enemies(s)].some(other => other !== unit && other.hp > 0 && other.x === p.x && other.y === p.y));
                if (open) { Object.assign(unit, open); (unit.id === "aren" ? $gamePlayer : $gameMap.event(1)).locate(unit.x, unit.y); }
            }
        }
        for (const id of [3, 4, 5, 6]) if ($gameMap.event(id)) $gameMap.event(id).setThrough(false);
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
            if (facing[0] === dx && facing[1] === dy) R.move(current(), dx, dy);
            R.face(current(), dx, dy); this.syncJourney();
            return;
        }
        R.face(current(), dx, dy); this.syncJourney();
        if (Graphics.frameCount >= this._journeyNextStep) {
            R.move(current(), dx, dy); this.syncJourney();
            this._journeyNextStep = Graphics.frameCount + 9;
        }
    };
    Scene_Map.prototype.beginJourneyTargeting = function(id) {
        this.closeJourneyChoices(); this.ensureJourneyPresentation();
        const s = current(), unit = s[s.controlled], skill = R.skills[id];
        const valid = R.targetOptions(s, unit, id);
        if (!valid.length) { R.log(s, "No valid targets for " + skill.name + ". No resources spent."); this.skillMenu(); return; }
        const enemy = skill.kind === "damage" ? R.enemies(s).find(target => R.canTarget(s, unit, id, target)) : unit;
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
        if (selection.targets.length > 1) {
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
            this.act(() => R.cast(current(), selection.id, target)); Input.update(); return true;
        }
        bitmap.clear();
        const context = bitmap.context;
        const s = current();
        for (const tile of R.footprint(s, s[s.controlled], selection.id, target)) {
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
        bitmap.fillRect(8, Graphics.height - 104, Graphics.width - 16, 96, "#111f31");
        bitmap.fontSize = 22; bitmap.textColor = "#ffdc91";
        bitmap.drawText(R.skills[selection.id].name + " → " + target.name, 24, Graphics.height - 98, Graphics.width - 48, 32);
        bitmap.fontSize = 17; bitmap.textColor = "#ffffff";
        bitmap.drawText((selection.targets.length > 1 ? "Arrows: aim on ground    " : "Facing determines hitbox    ") + "Enter: use skill    Esc: back", 24, Graphics.height - 58, Graphics.width - 48, 30);
        bitmap.baseTexture.update();
        return true;
    };
    R.onSkill = function(effect) {
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Map)) return;
        scene.ensureJourneyPresentation();
        const previous = scene._journeyEffects[scene._journeyEffects.length - 1];
        scene._journeyEffects.push({ ...effect, start: previous ? Math.max(Graphics.frameCount, previous.start + 30) : Graphics.frameCount });
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
        this.choices(R.party(current()).map(unit => ({ label: unit.name + "   Lv." + unit.level + "   " + (unit.id === "aren" ? "Skill learner" : "Priestess") + "   HP " + unit.hp + "/" + R.maxStats(unit).hp,
            run: () => {
                const max = R.maxStats(unit), skills = R.availableSkills(current(), unit);
                this.conversation([unit.name], [{ speaker: unit.name, text: "Level " + unit.level + "  •  EXP " + unit.xp + "/" + unit.level * 16 + "\nHP " + unit.hp + "/" + max.hp + "   SP " + unit.sp + "/" + max.sp + "   MP " + unit.mp + "/" + max.mp + "\nSkills: " + skills.map(id => R.skills[id].name).join(", ") }], () => this.partyMenu());
            } })), () => this.fieldMenu());
    };
    Scene_Map.prototype.updateJourneyPresentation = function() {
        this.ensureJourneyPresentation();
        if (this._journeyDialogue) return this.updateJourneyDialogue();
        if (this._journeyTarget) return this.updateJourneyTargeting();
        return this.updateJourneyEffects();
    };
})();
