# Skill catalogue and progression

`src/js/plugins/Skills.json` is the authoritative 78-skill overworld catalogue. It loads through RPG Maker’s database loader and directly through CommonJS for rules tests. Run `node tools/build-test-skills.cjs` to regenerate the editor-facing `src/data/Skills.json`; that export is not the overworld rules source.

The original database is preserved unchanged at `Addons/FirstJourneyBackup/SkillArchive/Skills-original-2026-09-19.json`. Original numeric IDs supply names, elements, icons and animation references; damage and costs are retuned for the prototype. Source effects involving status ailments, drains, escape, MP recovery, reflection, and unsupported stat modifiers were not imported as playable mechanics. Weapon attacks that originally inflicted status ailments now deal direct damage only. Empty/reserved rows are omitted from the runtime catalogue. No original formula is evaluated in overworld combat.

## Damage balance

At the same skill tier, actor level and proficiency, damage per target follows this table. Tier II and III multiply the base by 2 and 3. The existing actor-level bonus and copied-skill proficiency multiplier still apply. Higher-tier AoEs can therefore exceed lower-tier single-target attacks, while equal-tier comparisons preserve the requested advantages.

| Delivery | Single tile | Area, per target |
| --- | ---: | ---: |
| Melee | 12 | 8 |
| Ranged | 10 | 6 |

Offensive AoEs pay a secondary cost based on their full footprint: one resource per five tiles, rounded up. Five-tile blasts cost 1, eight-neighbor sweeps cost 2, and twenty-one-tile blasts cost 5 (MP for physical attacks; SP for magic). Clipping a blast against walls does not reduce its cost. Both pools are checked before either is spent. Healing and support buffs retain their normal costs.

## Learning and proficiency

Numbered skills require the preceding rank at 100% mastery: Heal II requires Heal I, Heal III requires Heal II. The first area spell in each elemental family requires its matching single-tile spell. Locked observations still earn 5/300 units; unlocked basic observations earn 100/300 units. Practising starting skills now advances their proficiency too, allowing Fire I to unlock its higher ranks; they remain fallback skills with no equipment-slot cost and fixed baseline power.

Jobs retain their opening skills and gain further catalogue skills at later levels (generated additions use level 3 + 2 × skill tier). Priestess, fighter, supporter and mage progression use the same rules for party and humanoid enemies. The prototype’s existing first-act AI still prioritizes its original attack/heal patterns; later skills can be selected in direct commands at the required level, or tested with the all-skills statue.

Journal bars show overall practice toward 18 uses (1800 debug units): grey Novice at 0, green Practiced at 6, blue Adept at 12, gold Master at 18. Text labels and integer percentages accompany the colour. Unlearned skills display an empty bar and retain their observation progress beside their names.

## Targeted area profiles

All targeted area skills use a circle, including healing and buffs. Compact profiles have five affected tiles, spanning three tiles horizontally and vertically. Wide profiles have 21 affected tiles within a 5×5 footprint, excluding its four corners. Compact circles have five tiles at this grid resolution. The wide footprint uses a 2.5-tile radius measured between tile centers. Walls and line of sight still clip these footprints. Self-centered Whirlwind Slash remains an eight-neighbor attack.

Radius and power are explicit per skill, not forced by tier. Blizzard III is a compact circle with 18 base damage; Flame III and Spark III use wide circular areas with 13 base damage. Wave II and Tornado II offer wide circular areas at 9 base damage while Quake II and Starlight II retain compact circular areas at 12. This preserves variety among high-tier attacks. Wider offensive profiles give up 25% of their usual same-tier area power, rounded down, while compact skills keep it. Recovery spells retain their healing progression.

Skill selection is remembered per party member when selecting a skill for targeting, even if targeting is canceled. Reopening restores the remembered row; unavailable skills fall back to the first available row. The choice is part of normal save data.

Combat begins at round 1. The label advances after a resolved round when combat continues; cumulative rounds in Stats remain a separate action count.

Targeted and directional area skills affect both factions. Only self-centered areas retain enemy-only damage and ally-only healing/buffs. Healing Circle and Quickening Chorus include the caster. Mira's automatic targeted blasts avoid friendly fire.

Four new self-centered spells use the existing elemental/healing prerequisites: Flame Nova, Frost Nova, Storm Nova, and Healing Circle. Quickening Chorus is now self-centered too. Guard absorbs 1 damage from the next hit; Brace's novice copied reduction is 2 and increases with proficiency and level.

## Catalogue

| Runtime key | Name | Tier | Source ID | Prerequisite | Cost | Area profile | Base power |
| --- | --- | ---: | ---: | --- | --- | --- | ---: |
| haste | Haste | 1 | 89 | — | 3 MP | single | 4 |
| slow | Slow | 1 | 90 | — | 3 MP | single | -4 |
| quickening | Quickening Chorus | 2 | 89 | Haste | 6 MP | self | 3 |
| cut | Slash | 1 | 1 | — | 1 SP | front | 12 |
| spark | Fire I | 1 | 99 | — | 1 MP | single | 10 |
| mend | Heal I | 1 | 52 | — | 3 MP | single | 15 |
| light | Saint I | 1 | 141 | — | 2 MP | single | 10 |
| jab | Quick Slash | 1 | 41 | — | 2 SP | front | 12 |
| thrust | Piercing Thrust | 1 | 197 | — | 3 SP + 1 MP | line | 8 |
| whirlwind | Whirlwind Slash | 2 | 201 | Quick Slash | 4 SP + 2 MP | around | 16 |
| burst | Starlight I | 1 | 144 | Saint I | 5 MP + 1 SP | compact | 6 |
| brace | Brace | 1 | 2 | — | 2 SP | single | 3 |
| sweep | Heavy Slash | 2 | 216 | Quick Slash | 4 SP + 1 MP | arc | 16 |
| greaterMend | Heal II | 2 | 53 | Heal I | 5 MP | single | 28 |
| revive | Raise I | 2 | 64 | Heal I | 8 MP | single | 20 |
| source54 | Heal III | 3 | 54 | Heal II | 5 MP | single | 45 |
| source56 | Recover I | 1 | 56 | Heal I | 4 MP | compact | 15 |
| source57 | Recover II | 2 | 57 | Recover I | 7 MP | compact | 30 |
| source58 | Recover III | 3 | 58 | Recover II | 10 MP | wide | 45 |
| source65 | Raise II | 2 | 65 | Raise I | 12 MP | single | 40 |
| source100 | Fire II | 2 | 100 | Fire I | 4 MP | single | 20 |
| source101 | Fire III | 3 | 101 | Fire II | 7 MP | single | 30 |
| source103 | Flame I | 1 | 103 | Fire I | 4 MP + 1 SP | compact | 6 |
| source104 | Flame II | 2 | 104 | Flame I | 7 MP + 1 SP | compact | 12 |
| source105 | Flame III | 3 | 105 | Flame II | 12 MP + 5 SP | wide | 13 |
| source107 | Ice I | 1 | 107 | — | 2 MP | single | 10 |
| source108 | Ice II | 2 | 108 | Ice I | 4 MP | single | 20 |
| source109 | Ice III | 3 | 109 | Ice II | 7 MP | single | 30 |
| source111 | Blizzard I | 1 | 111 | Ice I | 4 MP + 1 SP | compact | 6 |
| source112 | Blizzard II | 2 | 112 | Blizzard I | 7 MP + 1 SP | compact | 12 |
| source113 | Blizzard III | 3 | 113 | Blizzard II | 12 MP + 1 SP | compact | 18 |
| source115 | Thunder I | 1 | 115 | — | 2 MP | single | 10 |
| source116 | Thunder II | 2 | 116 | Thunder I | 4 MP | single | 20 |
| source117 | Thunder III | 3 | 117 | Thunder II | 7 MP | single | 30 |
| source119 | Spark I | 1 | 119 | Thunder I | 4 MP + 1 SP | compact | 6 |
| source120 | Spark II | 2 | 120 | Spark I | 7 MP + 1 SP | compact | 12 |
| source121 | Spark III | 3 | 121 | Spark II | 12 MP + 5 SP | wide | 13 |
| source123 | Water I | 1 | 123 | — | 3 MP | single | 10 |
| source124 | Water II | 2 | 124 | Water I | 5 MP | single | 20 |
| source126 | Wave I | 1 | 126 | Water I | 5 MP + 1 SP | compact | 6 |
| source127 | Wave II | 2 | 127 | Wave I | 10 MP + 5 SP | wide | 9 |
| source129 | Stone I | 1 | 129 | — | 3 MP | single | 10 |
| source130 | Stone II | 2 | 130 | Stone I | 5 MP | single | 20 |
| source132 | Quake I | 1 | 132 | Stone I | 5 MP + 1 SP | compact | 6 |
| source133 | Quake II | 2 | 133 | Quake I | 10 MP + 1 SP | compact | 12 |
| source135 | Wind I | 1 | 135 | — | 3 MP | single | 10 |
| source136 | Wind II | 2 | 136 | Wind I | 3 MP | single | 20 |
| source138 | Tornado I | 1 | 138 | Wind I | 5 MP + 1 SP | compact | 6 |
| source139 | Tornado II | 2 | 139 | Tornado I | 10 MP + 5 SP | wide | 9 |
| source142 | Saint II | 2 | 142 | Saint I | 5 MP | single | 20 |
| source145 | Starlight II | 2 | 145 | Starlight I | 10 MP + 1 SP | compact | 12 |
| source147 | Shade I | 1 | 147 | — | 3 MP | single | 10 |
| source148 | Shade II | 2 | 148 | Shade I | 5 MP | single | 20 |
| source150 | Darkness I | 1 | 150 | Shade I | 5 MP + 1 SP | compact | 6 |
| source151 | Darkness II | 2 | 151 | Darkness I | 10 MP + 1 SP | compact | 12 |
| source153 | Burst I | 1 | 153 | — | 4 MP | single | 10 |
| source154 | Burst II | 2 | 154 | Burst I | 7 MP | single | 20 |
| source156 | Nuke I | 1 | 156 | Burst I | 7 MP + 1 SP | compact | 6 |
| source157 | Nuke II | 2 | 157 | Nuke I | 12 MP + 1 SP | compact | 12 |
| source172 | Strong Attack | 1 | 172 | — | 2 SP | front | 12 |
| source173 | Sweeping Slash | 1 | 173 | — | 3 SP + 2 MP | around | 8 |
| source174 | Dual Attack | 2 | 174 | Quick Slash | 4 SP | front | 24 |
| source176 | First Aid | 1 | 176 | — | 2 MP | single | 15 |
| source177 | Maiden’s Stance | 3 | 177 | Quick Slash | 7 SP | front | 36 |
| source178 | Spin Crash | 3 | 178 | Quick Slash | 12 SP + 2 MP | around | 24 |
| source198 | Double Thrust | 2 | 198 | Quick Slash | 4 SP | front | 24 |
| source199 | Armor Piercer | 2 | 199 | Quick Slash | 4 SP | front | 24 |
| source203 | Wild Thrust | 3 | 203 | Quick Slash | 6 SP + 2 MP | around | 24 |
| source218 | Roundhouse Kick | 3 | 218 | Quick Slash | 7 SP + 2 MP | around | 24 |
| source219 | Tiger Dance | 3 | 219 | Quick Slash | 12 SP | front | 36 |
| source226 | Point Shot | 1 | 226 | — | 2 SP | single | 10 |
| source227 | Stun Shot | 2 | 227 | Quick Slash | 4 SP + 1 MP | compact | 12 |
| source228 | Team Shot | 3 | 228 | Quick Slash | 7 SP | single | 30 |
| source229 | Rain Shot | 3 | 229 | Quick Slash | 12 SP + 5 MP | wide | 13 |
| flameNova | Flame Nova | 2 | 103 | Flame I | 5 MP + 1 SP | self | 12 |
| frostNova | Frost Nova | 2 | 111 | Blizzard I | 5 MP + 1 SP | self | 12 |
| stormNova | Storm Nova | 3 | 121 | Spark I | 9 MP + 5 SP | self | 13 |
| healingCircle | Healing Circle | 2 | 56 | Heal I | 6 MP | self | 24 |
