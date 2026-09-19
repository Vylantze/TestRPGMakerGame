// js/plugins/Skills.json is authoritative. Export an editor-readable MZ skill database.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const skills = require(path.join(root, "src/js/plugins/Skills.json"));
const archive = require(path.join(root, "Addons/FirstJourneyBackup/SkillArchive/Skills-original-2026-09-19.json"));
const rows = [null], used = new Set();
let next = archive.length;
for (const [key, skill] of Object.entries(skills)) {
    const source = archive[skill.sourceId];
    if (!source) throw new Error(key + ": missing archived source");
    if (skill.prerequisite && !skills[skill.prerequisite]) throw new Error(key + ": missing prerequisite");
    const id = used.has(source.id) ? next++ : source.id;
    used.add(id);
    const area = ["arc", "around", "burst", "line"].includes(skill.shape);
    const attack = skill.kind === "damage" || (skill.kind === "speed" && skill.power < 0);
    const secondary = area && attack ? Math.max(1, skill.secondaryCost || 1) : 0;
    rows[id] = {
        ...source, id, name: skill.name,
        description: "Tier " + skill.tier + ". " + skill.delivery + ", " + (area ? "area" : "single tile") + "." + (skill.prerequisite ? " Requires mastered " + skills[skill.prerequisite].name + "." : ""),
        mpCost: skill.pool === "mp" ? skill.cost : secondary,
        tpCost: skill.pool === "sp" ? skill.cost : secondary,
        damage: { critical: false, elementId: source.damage.elementId, formula: String(skill.power), type: skill.kind === "damage" ? 1 : ["heal", "revive"].includes(skill.kind) ? 3 : 0, variance: 0 },
        effects: [], repeats: 1, speed: 0, scope: skill.kind === "revive" ? 9 : area ? attack ? 2 : 8 : attack ? 1 : 7,
        note: "<TestSkill:" + key + ">\n<SourceSkill:" + source.id + ">\nOverworld execution uses js/plugins/Skills.json. Editor TP cost represents SP; no engine battle scene is used."
    };
}
// Keep unused numeric slots valid in the editor without retaining old skills.
for (let id = 1; id < rows.length; id++) if (!rows[id]) rows[id] = { ...archive[4], id, name: "" };
fs.writeFileSync(path.join(root, "src/data/Skills.json"), JSON.stringify(rows, null, 2) + "\n");
console.log("Exported " + Object.keys(skills).length + " runtime entries to src/data/Skills.json; original archive unchanged.");
