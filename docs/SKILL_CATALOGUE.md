# Skill catalogue and progression

`src/data/TestSkills.json` is the authoritative 74-skill overworld catalogue. It loads through RPG Maker’s database loader and directly through CommonJS for rules tests. Run `node tools/build-test-skills.cjs` to regenerate the editor-facing `src/data/Skills.json`; that export is not the overworld rules source.

The original database is preserved unchanged at `Addons/FirstJourneyBackup/SkillArchive/Skills-original-2026-09-19.json`. Original numeric IDs supply names, elements, icons and animation references; damage and costs are retuned for the prototype. Source effects involving status ailments, drains, escape, MP recovery, reflection, and unsupported stat modifiers were not imported as playable mechanics. Weapon attacks that originally inflicted status ailments now deal direct damage only. Empty/reserved rows are omitted from the runtime catalogue. No original formula is evaluated in overworld combat.

## Damage balance

At the same skill tier, actor level and proficiency, damage per target follows this table. Tier II and III multiply the base by 2 and 3. The existing actor-level bonus and copied-skill proficiency multiplier still apply. Higher-tier AoEs can therefore exceed lower-tier single-target attacks, while equal-tier comparisons preserve the requested advantages.

| Delivery | Single tile | Area, per target |
| --- | ---: | ---: |
| Melee | 12 | 8 |
| Ranged | 10 | 6 |

Offensive areas pay at least 1 of the opposite resource. Healing and buffs do not gain this surcharge. Shape classification determines AoE even when a wall clips it to one tile.

## Learning and proficiency

Numbered skills require the preceding rank at 100% mastery: Heal II requires Heal I, Heal III requires Heal II. The first area spell in each elemental family requires its matching single-tile spell. Locked observations still earn 5/300 units; unlocked basic observations earn 100/300 units. Practising starting skills now advances their proficiency too, allowing Fire I to unlock its higher ranks; they remain fallback skills with no equipment-slot cost and fixed baseline power.

Jobs retain their opening skills and gain further catalogue skills at later levels (generated additions use level 3 + 2 × skill tier). Priestess, fighter, supporter and mage progression use the same rules for party and humanoid enemies. The prototype’s existing first-act AI still prioritizes its original attack/heal patterns; later skills can be selected in direct commands at the required level, or tested with the all-skills statue.

Journal bars show overall practice toward 18 uses (1800 debug units): grey Novice at 0, green Practiced at 6, blue Adept at 12, gold Master at 18. Text labels and integer percentages accompany the colour. Unlearned skills display an empty bar and retain their observation progress beside their names.

## Catalogue

| Runtime key | Name | Tier | Source ID | Prerequisite | Cost |
| --- | --- | ---: | ---: | --- | --- |
| haste | Haste | 1 | 89 | — | 3 MP |
| slow | Slow | 1 | 90 | — | 3 MP |
| quickening | Quickening Chorus | 2 | 89 | Haste | 6 MP |
| cut | Sword Cut | 1 | 1 | — | 1 SP |
| spark | Fire I | 1 | 99 | — | 1 MP |
| mend | Heal I | 1 | 52 | — | 3 MP |
| light | Saint I | 1 | 141 | — | 2 MP |
| jab | Quick Jab | 1 | 41 | — | 2 SP |
| thrust | Piercing Thrust | 1 | 197 | — | 3 SP + 1 MP |
| whirlwind | Whirlwind | 2 | 201 | Quick Jab | 4 SP + 1 MP |
| burst | Starlight I | 1 | 144 | Saint I | 5 MP + 1 SP |
| brace | Brace | 1 | 2 | — | 2 SP |
| sweep | Heavy Swing | 2 | 216 | Quick Jab | 4 SP + 1 MP |
| greaterMend | Heal II | 2 | 53 | Heal I | 5 MP |
| revive | Raise I | 2 | 64 | Heal I | 8 MP |
| source54 | Heal III | 3 | 54 | Heal II | 5 MP |
| source56 | Recover I | 1 | 56 | Heal I | 4 MP |
| source57 | Recover II | 2 | 57 | Recover I | 7 MP |
| source58 | Recover III | 3 | 58 | Recover II | 10 MP |
| source65 | Raise II | 2 | 65 | Raise I | 12 MP |
| source100 | Fire II | 2 | 100 | Fire I | 4 MP |
| source101 | Fire III | 3 | 101 | Fire II | 7 MP |
| source103 | Flame I | 1 | 103 | Fire I | 4 MP + 1 SP |
| source104 | Flame II | 2 | 104 | Flame I | 7 MP + 1 SP |
| source105 | Flame III | 3 | 105 | Flame II | 12 MP + 1 SP |
| source107 | Ice I | 1 | 107 | — | 2 MP |
| source108 | Ice II | 2 | 108 | Ice I | 4 MP |
| source109 | Ice III | 3 | 109 | Ice II | 7 MP |
| source111 | Blizzard I | 1 | 111 | Ice I | 4 MP + 1 SP |
| source112 | Blizzard II | 2 | 112 | Blizzard I | 7 MP + 1 SP |
| source113 | Blizzard III | 3 | 113 | Blizzard II | 12 MP + 1 SP |
| source115 | Thunder I | 1 | 115 | — | 2 MP |
| source116 | Thunder II | 2 | 116 | Thunder I | 4 MP |
| source117 | Thunder III | 3 | 117 | Thunder II | 7 MP |
| source119 | Spark I | 1 | 119 | Thunder I | 4 MP + 1 SP |
| source120 | Spark II | 2 | 120 | Spark I | 7 MP + 1 SP |
| source121 | Spark III | 3 | 121 | Spark II | 12 MP + 1 SP |
| source123 | Water I | 1 | 123 | — | 3 MP |
| source124 | Water II | 2 | 124 | Water I | 5 MP |
| source126 | Wave I | 1 | 126 | Water I | 5 MP + 1 SP |
| source127 | Wave II | 2 | 127 | Wave I | 10 MP + 1 SP |
| source129 | Stone I | 1 | 129 | — | 3 MP |
| source130 | Stone II | 2 | 130 | Stone I | 5 MP |
| source132 | Quake I | 1 | 132 | Stone I | 5 MP + 1 SP |
| source133 | Quake II | 2 | 133 | Quake I | 10 MP + 1 SP |
| source135 | Wind I | 1 | 135 | — | 3 MP |
| source136 | Wind II | 2 | 136 | Wind I | 3 MP |
| source138 | Tornado I | 1 | 138 | Wind I | 5 MP + 1 SP |
| source139 | Tornado II | 2 | 139 | Tornado I | 10 MP + 1 SP |
| source142 | Saint II | 2 | 142 | Saint I | 5 MP |
| source145 | Starlight II | 2 | 145 | Starlight I | 10 MP + 1 SP |
| source147 | Shade I | 1 | 147 | — | 3 MP |
| source148 | Shade II | 2 | 148 | Shade I | 5 MP |
| source150 | Darkness I | 1 | 150 | Shade I | 5 MP + 1 SP |
| source151 | Darkness II | 2 | 151 | Darkness I | 10 MP + 1 SP |
| source153 | Burst I | 1 | 153 | — | 4 MP |
| source154 | Burst II | 2 | 154 | Burst I | 7 MP |
| source156 | Nuke I | 1 | 156 | Burst I | 7 MP + 1 SP |
| source157 | Nuke II | 2 | 157 | Nuke I | 12 MP + 1 SP |
| source172 | Strong Attack | 1 | 172 | — | 2 SP |
| source173 | Slash | 1 | 173 | — | 3 SP + 1 MP |
| source174 | Dual Attack | 2 | 174 | Quick Jab | 4 SP |
| source176 | First Aid | 1 | 176 | — | 2 MP |
| source177 | Maiden’s Stance | 3 | 177 | Quick Jab | 7 SP |
| source178 | Spin Crash | 3 | 178 | Quick Jab | 12 SP + 1 MP |
| source198 | Double Thrust | 2 | 198 | Quick Jab | 4 SP |
| source199 | Armor Piercer | 2 | 199 | Quick Jab | 4 SP |
| source203 | Wild Thrust | 3 | 203 | Quick Jab | 6 SP + 1 MP |
| source218 | Roundhouse Kick | 3 | 218 | Quick Jab | 7 SP + 1 MP |
| source219 | Tiger Dance | 3 | 219 | Quick Jab | 12 SP |
| source226 | Point Shot | 1 | 226 | — | 2 SP |
| source227 | Stun Shot | 2 | 227 | Quick Jab | 4 SP + 1 MP |
| source228 | Team Shot | 3 | 228 | Quick Jab | 7 SP |
| source229 | Rain Shot | 3 | 229 | Quick Jab | 12 SP + 1 MP |
