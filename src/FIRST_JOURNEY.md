# First Journey: The Abandoned Shrine

A playable RPG Maker MZ mechanics prototype. Temporary names: **Aren** and **Mira**.

Open `game.rmmzproject` in RPG Maker MZ, press **Ctrl+R**, and choose **New Game**.
The original starter project's data and plugin list were preserved in
`../Addons/FirstJourneyBackup/` before the first build. Its saves are not migrated.

## The opening act

Aren grew up in Briar Glen with a swordmaster father and a master mage mother.
He leaves on his coming-of-age journey with childhood friend Mira, a novice
priestess. The local guild's first test is to clear a small goblin nest from an
abandoned shrine. Speak to the steward at the town crossroads, leave east,
explore two connected shrine maps, defeat Ruk and his sentries, and return to
the steward for the ending and reward.

This is a small systems prototype with simple maps and brief dialogue, not a
finished or timed 20–30 minute adventure. It uses the existing project's MZ
graphics for maps, generated portrait-based walking sprites, and anime portraits for conversations. No new
downloaded art, audio, or third-party plugins were added. Portrait prompts and
provenance are recorded in `../Addons/FirstJourneyArt/ART_SOURCES.md`.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys | Tap a new direction to turn for free; tap the facing direction to step; hold any direction to walk |
| A | Choose a skill, preview or aim its hitbox, then Enter to use it |
| Enter / Z | Interact with the person or object directly in front of you |
| Space | Wait one turn; does not regenerate resources |
| Tab | Toggle Mira between automatic behavior and direct action commands |
| C | Set Mira's automatic behavior |
| K | View learning/mastery and equip or unequip copied skills |
| I | Use a potion on either conscious party member |
| Esc / X | Field menu; also cancel a menu |

Menu entries also support mouse selection. Walking is keyboard-controlled.
The field menu is a narrow panel on the right. Hovering a skill previews its
range, footprint, default aim, resource cost and effect; selecting it opens the
existing ground-target confirmation. No resources are spent while previewing.
The camera tracks the walking animation in one-third-tile (16 pixel) increments.
Party frames stack vertically at the top left, with red HP, green SP and blue MP
bars and numeric values. Speed is shown beside each character's name in combat.
Skills preview their hitboxes directly on the map. Directional attacks use
the current facing and can be rotated with arrows during targeting; ranged spells and healing let you aim at ground tiles
with arrows or a click. Press Enter to cast, even when the hitbox is empty. Cancel spends no turn or resources. Physical
attacks have slash effects; magic has projectiles or restorative effects, with
floating damage/healing numbers for both party and enemy actions.

Walls and interactable objects block movement, but never block turning. Mira
steps into Aren's previous tile when he walks; her move uses her action for that
turn. She acts according to her behavior setting when Aren attacks or waits.
Outside combat, only Aren receives player commands; Mira acts automatically.
Tab retains the direct-command preference for future combat encounters.

Guard still holds position during combat. Companions are passable: walking into
one swaps them into the tile you vacated. Turn to face Mira and press Enter
for contextual conversation. Aren always leads movement. In combat with direct mode enabled,
choose Aren's action first, then Mira's skill, guard, follow or wait action.
Neither action executes until both are chosen. Canceling Mira's command menu
cancels the whole round without spending resources or advancing time.

Town recovery is at the **statue of the Goddess**. Dungeon recovery is at **campfires**.
The Goddess has deliberately not been given a proper name yet.

Conversations show the participating characters' anime portraits, highlighting
the current speaker. Portrait interiors render opaque and overlap the textbox
edge. Interlocutors stand on the right; when speaking to townspeople, Mira
stands behind Aren on the left. The guild steward and provisioner use male/female villager
portraits with shadowed faces. Mira's corrected portrait has one hand resting
over the other. The field menu includes **Party** (stats, jobs and skills) and
**Options** (MZ audio and control settings).
In combat, actions resolve one at a time in descending Speed order; each action and its
animation finish before the next begins. Speed is sampled when the round
starts. Ties resolve Aren, Mira, then enemies in map order. Downed actors skip
their queued action. Ground-targeted spells retain their chosen tile even if
a faster creature moves away. Combat-start saves occur before the first action.
Outside combat, actions and following resolve immediately without Speed sorting
or sequential delays. Speed effects do not lose duration while exploring.
Combat uses the exploration map; there is no battle scene.

The combat menu opens automatically between rounds: **Move**, **Skill**,
**Guard**, and **View Turn Order**. Move accepts one direction; a blocked step
or cancellation spends no action. Esc opens the usual field menu.
The top timeline shows actor faces, names and Speed from fastest to slowest;
the current actor is marked during execution. View Turn Order lets arrows or
a click select any actor and highlight their location, panning the camera
when needed. Enter/Esc returns to commands without spending an action.

Mira's **Support** mode heals allies below 65% HP, then attacks while retaining
some MP. **Attack** prioritizes Light Lance. **Guard** holds position, heals
when possible, and reduces the next incoming hit. **Follow** spends no
resources. **Conserve** follows and heals but does not cast offensive magic.
In combat with direct mode enabled, Aren remains the leader and Mira receives a command after each
Aren action. If Aren falls, choose Wait to let Mira act; command her to revive
him when available. If Mira falls, her command step is skipped.

Holding a direction into a wall or solid object keeps Aren’s walking animation
playing without advancing time or spending resources. Releasing the direction
returns him to idle. Party walking frames are centered with aligned feet and
are at least as wide and tall as the Guild Steward and Provisioner.

## Attack areas and entrances

Sword Cut and Quick Jab only hit the tile immediately ahead. Arrow inputs
during directional targeting turn Aren and rotate the footprint for free;
confirming casts in that direction. Ranged ground targeting still moves the
aim cursor instead. Enemy and
companion AI turn toward their intended target before attacking.

| Skill | Area | Source |
| --- | --- | --- |
| Piercing Thrust | Both tiles directly ahead | Level 2 fighters |
| Heavy Swing | Three tiles across in front, rotated with facing | Level 3 fighters |
| Whirlwind | All eight surrounding tiles | Level 3 fighters |
| Radiant Burst | A 3×3 square centered on a selected ground tile, within four walking steps | Mira at level 2 |

Offensive AoEs hit enemies only; healing and buff AoEs affect allies only, relative
to the caster. Neutral villagers are excluded from offensive AoEs. Single-tile
skills can affect either side. Ember, Light Lance and Mend affect one chosen tile
up to four tiles away; sword basics affect only the tile directly ahead.
AoE classification uses the full shape even when walls clip its footprint.
Skills cost resources once and grant practice once per cast, including empty
casts. The gold cursor selects an aim point; amber tiles preview the footprint.
Ground cursors move spatially with arrows, and skills work outside combat.
Single-tile attacks on villagers trigger a warning without harming them or
awarding rewards. Mira uses Burst against clusters in Support/Attack mode.
Aren learns these techniques using the usual prerequisites.

Passages are two adjacent floor tiles recessed into the boundary walls, without
doorway sprites. Walking into either tile transfers automatically. Arrival is
inside the destination map to prevent immediate return transfers. Area-entry
autosaves are retained.

## Temporary all-skills statue

A second Goddess statue at town tile (5, 7), directly south of the recovery
statue, toggles **God Mode**. Face it and press Enter. The label shows ON/OFF.
While enabled, Aren's skill menu exposes every skill without prerequisite or
loadout restrictions. This is an all-skills testing toggle: HP, costs, and
normal resource recovery still apply. Borrowed access does not overwrite
learned skills, mastery, or equipped slots; using skills in this mode does not
add Aren's practice. Turning it off restores normal availability. The toggle
is saved and an interaction creates an autosave.

## Resources and progression

- Aren starts with Sword Cut (1 SP) and Ember (1 MP). They never occupy copied
  skill slots. He has no free attack when the corresponding resource is empty.
- Town rest is free. Both shrine camps consume one ration to fully restore
  the party's HP, SP and MP, including downed members. Rest is unavailable in
  combat. Each supplies cache contains one ration and 6 gold, collectible once.
- Rations cost 6 gold. HP/SP/MP potions cost 18/22/24 gold and have limited town
  stock of 2/1/1. Potions restore 25 HP or 12 SP/MP and consume a world turn.
  They do not revive a downed member. Waiting and leveling do not heal.
- Mira starts with Mend and Light Lance; Radiant Burst arrives at level 2,
  Greater Mend at level 3 and
  Revive at level 5. The priestess and fighter job tables are shared with
  humanoid enemies. Fighters learn Quick Jab at level 1, Brace and Piercing
  Thrust at level 2, and Heavy Swing and Whirlwind at level 3.
- Aren copies a skill's form, never taking it away from its original user.
  A visible use within seven grid steps gives one observation point. Walls
  block observation; Aren must be conscious. Three points unlock a basic skill.
- Advanced skills accrue 0.05 observation points per witnessed use until their
  prerequisite reaches 100% mastery. Progress is retained and checked again
  when prerequisites improve. Heavy Swing and Whirlwind require Quick Jab; Radiant Burst requires Light
  Lance; Greater Mend and
  Revive require Mend.
- Understanding and proficiency are intentionally combined for this prototype.
  Using a copied skill adds 1 practice point; witnessing it after unlocking adds
  0.25. At 0/6/12/18 practice points its effectiveness is
  60%/80%/100%/120% of the corresponding normal skill at the same level.
  The UI shows integer learning/mastery percentages, plus raw debug units
  (100 units per internal point): learning needs 300 units, mastery 1800.
  Practice gained after full mastery remains visible in raw data; mastery
  displays at most 100%. Power is shown separately as an integer percentage.
  A future design can split knowledge and execution without changing the lore.
- Copied loadouts start with two slots and gain one every two levels. Changes
  are allowed only outside combat. Copied skills are not automatically equipped.

These numerical values, four-direction movement, observation radius, AI
thresholds and starting supplies are **provisional implementation defaults**.

## Speed and the Supporter job

Aren starts with Speed 10, Mira with 8, ordinary goblins with 7, goblin
supporters with 11, and the boss with 9. Each level adds 1 Speed. Speed does
not grant extra actions or change walking animation speed; it determines order.

Supporters learn Ember, Haste and Slow at level 1, then Quickening Chorus at
level 3. A goblin chanter on the shrine approach demonstrates these techniques.
Mira retains her Priestess job. Aren can copy supporter skills normally or try
them immediately through the testing statue.

| Skill | Cost | Effect |
| --- | --- | --- |
| Haste | 3 MP | Single tile within 4; +4 Speed for 3 rounds |
| Slow | 3 MP | Single tile within 4; −4 Speed for 3 rounds |
| Quickening Chorus | 6 MP | 3×3 allied area within 4; +3 Speed for 3 rounds |

Copied versions scale with mastery. Chorus requires mastered Haste. A new
speed effect replaces the existing one rather than stacking. Effects influence
the next three combat rounds, expire after those rounds, and clear when resting.
The current round's order never changes halfway through resolution.

## Saves and defeat

The latest autosave is slot 0; the field menu's manual save is slot 1. Automatic
saves occur at combat start, combat end and area entry, as well as rests,
supplies collection, the opening and the ending. Snapshots are captured
immediately and written in order, preventing later turns from changing an
earlier queued checkpoint. Three additional rolling checkpoint files retain
the last combat-start, combat-end and area-entry snapshots.

All prototype saves use the `firstJourney_` prefix, including a separate global
save index. Existing `file*.rmmzsave` files and `config.rmmzsave` are not changed
by the prototype save code. Do not commit playtest save files.

If both characters fall, villagers bring them back to Briar Glen and restore
them. Levels, skill learning, practice, inventory, gold, quest progress and
defeated enemies remain saved. Surviving enemies regain HP. Map exits permit a
normal retreat; there is no free teleport command. Briar Glen is the only town
in this act. Additional towns will need a stored last-visited-town destination.

## Implementation and editing

- `js/plugins/FirstJourneyRules.js`: plain-data expedition state, skills, jobs,
  maps, pathfinding, resource rules, observations, turns and encounters.
- `js/plugins/FirstJourney.js`: MZ map sprites, keyboard/menu UI, HUD, dialogue,
  shopping and engine save integration.
- `js/plugins/FirstJourneyPresentation.js`: tap/hold controls, targeting cursors,
  combat effects, portrait conversations and party details. Enable the three
  plugins in the order Rules, FirstJourney, Presentation.
- `../tools/build-first-journey.cjs`: generates MZ-readable Maps 001–003,
  MapInfos, actor identities, starting party/settings and plugin registration.
  Map layouts/collision come from the shared grids in the rules plugin.
  Edit those grids and rebuild together; changing only editor tiles will not
  change plugin collision. The build script overwrites its generated fields.
- `../tools/test-first-journey-turns.cjs`: sequential resolution, speed effects,
  cancellation validation and serialized-round regression checks.
- `../tools/pack-first-journey-sprites.cjs`: packs generated frames into 144×192
  MZ single-character sheets, preserving transparent pixels.
- No supplied `rmmz_*.js` engine scripts were modified. Default database skills
  are not used by this prototype's custom map-combat system. Future content
  should be added to the prototype skill registry or integrated with MZ data.

Run from the repository root:

```text
node tools/test-first-journey.cjs
node tools/test-first-journey-turns.cjs
node tools/test-first-journey-expedition.cjs
node tools/test-first-journey-engine.cjs
```

The first three checks require only Node. The engine test uses locally bundled
Playwright and Chrome, serves the game on loopback, uses an isolated browser
profile, and records QA screenshots under `Addons/FirstJourneyQA/`. Its local
Playwright import path will need adjusting on another machine. It does not
change the native MZ playtest's saves. MZ/NW.js deployment should still receive
a complete manual playthrough before distribution.

Verified on 19 September 2026: 27 rules checks and 12 sequential-turn checks
pass. The baseline expedition clears both shrine maps and returns to the guild
in 131 turns, at level 3 with one ration left and no defeats. The browser run
passes new-game startup, movement, one-third-tile camera scrolling, menus, skill
hover, direct companion commands and cancellation, combat menus, timeline
inspection, directional aiming, targeting, combat checkpoints,
save/load, defeat return, rest, shopping and the ending, with no console errors.
This establishes functionality, not final difficulty or pacing.

## Assets and licensing

New plugin, generator and test code was authored for this project. Four anime
portraits were created with the built-in image generation tool; source and edit
prompts are recorded in the art manifest. Map art, fonts,
engine files and any default title music are reused from the existing RPG Maker
MZ project. Those existing files
remain subject to their original RPG Maker licenses. The prototype has not been
packaged or published as a distributable game.

Save compatibility: start a new game after this update. Legacy-save migrations
are not supported; saves created with the current build still save and load normally.
