# First Journey: lore and gameplay design

This document combines the project's original design decisions with the current
RPG Maker MZ prototype. **Design intent** describes the larger game; **prototype**
describes behavior implemented today. Names, numerical balance, and later story
details remain provisional. The [conversation log](conversation-log.txt) preserves
the decisions in order, including ideas that were subsequently replaced.

## The game at a glance

First Journey is a fantasy adventure with a JRPG party and the on-map,
turn-based exploration style of Pokémon Mystery Dungeon. Its central promise is
a protagonist who can eventually learn every skill and ability in the game by
watching others use them: sword techniques, spells, attacks, and support skills.
Learning is specific to each skill, rather than a generic purchase from a skill
tree. Allies are both travelling companions and sources of techniques, while
enemies offer opportunities to observe abilities the party does not yet possess.

The long-term design includes multiple heroines with recognizable RPG jobs.
The first playable slice deliberately contains only Aren, Mira, a starting town,
one shrine dungeon split across two maps, and its first boss. There is no
separate battle screen or arena. Exploration, positioning, combat, skill previews,
and interaction all happen on the same overworld maps.

## Aren and the meaning of copying a skill

**Aren** is the temporary name for the protagonist, tentatively male. He was born
and raised in this world. His father is a swordmaster and his mother a master
mage. They have taught him the foundations of swordsmanship and magic before
he leaves home; his first journey is a coming-of-age adventure, not an arrival
from another world.

His ability is sometimes described as “stealing” a skill, but it does not remove
anything from its original owner. Aren develops his own interpretation of what
he sees. At first he copies the **form rather than the essence**: the movement,
shape, or apparent method, producing a recognizably similar but weaker result.
Observation and practice gradually turn that imitation into something he
understands and can use effectively.

Two distinct concepts underpin this design:

- **Understanding** measures how well Aren comprehends a technique, potentially
  culminating in mastery of its core essence.
- **Proficiency** measures how well he executes it. Repeated use makes the
  copied technique more effective, such as increasing damage or healing.

The prototype combines these into learning progress followed by practice/mastery
tiers. Separating the two is a future design option, not a second implemented
progression system. Copying every ability is the eventual goal; it does not mean
every ability is immediately usable or simultaneously equipped.

## Mira, the party, and the Goddess

**Mira** is the temporary name of the first heroine. She is Aren's childhood
friend and a novice priestess who joins his coming-of-age journey. They begin
as slightly stronger villagers with useful basic training. Their first assignment
should be credible for inexperienced adventurers.

Mira follows a conventional fixed job. She starts with healing and Light magic,
then gains stronger spells as she levels. Future heroines should likewise teach
the fundamentals of their own roles early and expose advanced abilities as they
develop. The broader design permits unique skills unlocked by story milestones;
the current prototype primarily uses level-based job tables.

Mira and other priests worship the Goddess. The setting currently has one
Goddess, whose proper name is undecided. This is background lore, not a fact
that Mira needs to repeat in conversation. Town recovery uses her statue;
dungeon recovery uses campfires.

Human or humanoid enemies with jobs use the same job progression model as party
members. The prototype implements Priestess, Fighter, and Supporter tables:

| Job | Level 1 | Later techniques |
| --- | --- | --- |
| Priestess | Heal I, Saint I | Starlight I at 2; Heal II at 3; Revive at 5 |
| Fighter | Quick Jab | Brace and Piercing Thrust at 2; Heavy Swing and Whirlwind at 3 |
| Supporter | Fire I, Haste, Slow | Quickening Chorus at 3 |

Mira remains a Priestess. A goblin chanter in the shrine is a Supporter, providing
a source of speed manipulation for Aren to observe. Later heroines, their names,
their personal stories, and any relationship systems are not yet defined.

## The first adventure

The prototype begins in **Briar Glen**. Aren and Mira visit the guild steward,
who sends them to clear a small goblin nest in an abandoned shrine as their first
test as adventurers. This replaces the earlier suggestion of a corrupted guardian:
the opening threat is intentionally modest.

The expedition passes through the **Abandoned Shrine — Approach** and the
**Inner Court**, meeting lookouts, sentries, a chanter, and **Ruk, the nest leader**.
Players can collect abandoned supplies and spend rations at campfires. Defeating
Ruk changes the objective to returning to the steward. Reporting back completes
the prototype's first test and awards a guild reward.

A typical loop is: prepare in town, explore and observe skills, manage resources
through encounters, rest or retreat when needed, improve the party and Aren's
loadout, then return to the guild after defeating the boss. The current maps are
authored grids; procedural dungeon generation has not been implemented.

## Learning, practice, and loadouts

The initial tuning is **three observations to learn a basic copied skill**.
Aren must be conscious, within seven grid steps of the user, and able to see
them. Both ally and enemy uses can count. Walls block observation. Using his own
copy develops practice rather than counting as another external observation.

Advanced skills have prerequisites. Revive, for example, requires mastered
Heal I. Aren still gains a small, non-zero amount of progress from seeing a locked
advanced skill: the prototype uses 0.05 observation points per use rather than
the normal 1 point. Saved progress becomes useful when the prerequisite is met.

| Prototype progression | Current value |
| --- | --- |
| Basic learning threshold | 3 observation points |
| Initially copied effectiveness | 60% |
| Practice from using a learned copy | +1 per cast, including an empty cast |
| Practice from observing an already learned skill | +0.25 |
| Practice thresholds | 0 / 6 / 12 / 18 points |
| Effectiveness at those thresholds | 60% / 80% / 100% / 120% |
| Mastery needed for a prerequisite | 18 practice points, displayed as 100% |

The final 120% tier is prototype tuning, not a statement that the lore's concept
of understanding exceeds perfect knowledge. All visible progress uses integer
percentages. For testing, the UI also shows integer raw units: 100 units per
point, so initial learning requires 300 units and mastery requires 1,800 units.

Aren can equip a limited number of copied skills, initially two. Capacity grows
by one slot every two levels. The player may change the loadout only outside
combat. Learning a technique does not automatically equip it. His starting
**Sword Cut** and **Fire I** are always available and use no copied-skill slots.

## Resources and recovery

Characters have **Hit Points (HP)**, **Stamina (SP)**, and **Mana (MP)**.
Physical techniques consume SP and spells consume MP. Even the fallback basics
cost resources: Sword Cut costs 1 SP, and Fire I costs 1 MP. There is no free
attack when the relevant pool is empty. Resource exhaustion is an intended
expedition constraint rather than an exception to the rules.

- Town recovery at the Goddess statue is free.
- Designated dungeon campfires consume one ration to restore the party.
- HP, SP, and MP potions provide quick recovery but are more expensive and less
  plentiful than rations. In the prototype, potion use also consumes an action.
- Waiting does not regenerate resources; leveling raises capacity without
  automatically healing. Ordinary potions do not revive downed characters.

Prototype potions restore 25 HP or 12 SP/MP. Town prices are 6 gold per ration
and 18/22/24 gold for HP/SP/MP potions, with limited potion stock. Supplies caches
contain a ration and gold. These values are provisional playtest settings.

## Movement, facing, and entrances

Movement is on a four-direction grid. Tapping a direction different from Aren's
current facing turns him without spending a turn; tapping the direction he
already faces takes one step. Holding any direction makes him turn and walk.
He can turn even when the tile ahead is blocked. The camera follows the walking
animation in thirds of a tile—16 pixels on the current 48-pixel grid.

Walls and interactable objects are solid. Party members are passable: stepping
into Mira's tile swaps her into the vacated tile. In automatic following, Mira
normally moves into Aren's previous position; following consumes her action and
respects her behavior setting and turn order. Aren can face her and interact to
talk, following the companion-interaction idea from Pokémon Yellow.

Dungeon entrances and exits are two adjacent floor tiles recessed into boundary
walls. There is no doorway sprite and no interaction prompt required to enter.
Walking into either tile transfers to the next area, with arrival inside it to
avoid immediately transferring back.

## Skills, hitboxes, and targeting

Skills act on **blocks of the map**, not a mandatory creature selection. A cast
can hit empty ground and can be used outside combat. Occupants of the skill's
hitbox receive its effects according to its targeting rules. Costs and practice
are charged once per cast, not once per affected creature.

Hovering over a skill in the list displays its range, footprint, default aim
when available, cost, and effect details. Selecting it proceeds to map targeting.
Arrows or a click choose a ground tile; confirmation uses the skill. Canceling
the preview or target selection spends no resources. While targeting a skill
relative to Aren (such as a sword strike or sweep), direction inputs turn him
and rotate the footprint without moving him or spending an action. Ground-aimed
magic continues to move its cursor instead.

| Shape | Example | Behavior |
| --- | --- | --- |
| One tile ahead | Sword Cut, Quick Jab | Facing determines the affected square |
| One selected tile at range | Fire I, Saint I, Heal I | Aim within four grid steps and line of sight |
| Two tiles ahead | Piercing Thrust | Hits along the facing direction |
| Three tiles across ahead | Heavy Swing | Rotates the row with the caster's facing |
| Surrounding area | Whirlwind | Hits the eight neighboring tiles |
| Area around a selected tile | Starlight I | A 3×3 footprint centered within four steps |

Offensive AoEs affect enemies only, relative to the caster. Healing and buff AoEs
affect allies only. Neutral villagers are excluded from offensive AoEs.
**Single-block hitboxes can affect either side**, so a basic attack can hurt an
ally and a single-tile heal can help an enemy. The spell's long casting range
does not make it an AoE. Walls clipping a multi-tile footprint do not change its
classification into a single-target skill.

Villagers struck by single-tile attacks currently warn Aren not to attack people
in public. They stay alive and remain available for conversation; they give no
combat rewards. Any future reputation or other penalty is not implemented.

Holding a direction into a wall or solid object keeps the living party’s walking animations
playing, with companions facing the preceding party member, without advancing time or spending resources. Releasing the direction
returns the party to idle. Party walking frames are centered with aligned feet and
are at least as wide and tall as the Guild Steward and Provisioner.

Offensive AoE skills spend their normal cost plus at least 1 of the other
resource: physical areas require 1 MP and magical areas require 1 SP. This
applies to party and enemy attacks, even empty or wall-clipped casts. Both
pools must be sufficient; costs are shown together in skill selection.
Healing and support buffs retain their normal costs. Only combat actions
increase round counters. The timeline shows the current encounter round, reset
to 0 at every combat start. The separate Stats window shows cumulative combat
rounds and successful exploration steps; turns, blocked moves, casts, waits,
and follower steps do not add exploration steps.

## Sequential turns, Speed, and companion commands

Outside combat, only Aren receives player commands; Mira acts automatically.
Tab retains the direct-command preference for future combat encounters.

Aren always leads exploration. Mira acts automatically by default. **Tab** now
toggles direct commands for Mira; it no longer swaps the movement leader.
In combat with direct mode enabled the player chooses Aren's action, then Mira's skill, guard,
follow, or wait action. Both choices are collected before execution. Canceling
the companion command menu abandons the round without advancing time or spending
resources. If Mira is down, her command step is skipped.

During combat, participating actions resolve sequentially in descending **Speed** order.
The animation or movement for an action finishes before the next begins. Speed
is sampled at the start of the round; ties use Aren, Mira, then map enemy order.
A character defeated before their turn skips their action. A spell aimed at a
block retains that aim even if a faster creature moves away.

Outside combat, actions and following resolve immediately without initiative
sorting or sequential delays. Speed-effect durations advance only in combat.

Combat begins with a four-option menu: Move, Skill, Guard, and View Turn Order.
Selecting Move or pressing Cancel from this menu enters persistent Move mode.
Each valid directional step resolves a combat round, then stays in Move mode,
including after direct companion commands. Enter reopens combat commands; Esc
opens the normal field menu, which returns to Move when closed. Blocked steps
and menu navigation spend no action. The top timeline shows faces, names, and
Speed in execution order, marking the active actor while resolving. View Turn
Order lets the player select faces with arrows or a click to highlight each
actor's overworld location, with camera focus when needed. Inspection costs no
action; Enter/Esc returns to commands. Esc from commands enters Move mode.

Base Speed is 10 for Aren, 8 for Mira, 7 for ordinary goblins, 11 for supporters,
and 9 for the boss; each level above the first adds 1. Speed changes turn order,
not the number of actions or the walking animation speed.

Supporter skills introduce three-round speed effects:

| Skill | Cost | Full-strength effect |
| --- | --- | --- |
| Haste | 3 MP | +4 Speed to one selected tile |
| Slow | 3 MP | −4 Speed to one selected tile |
| Quickening Chorus | 6 MP | +3 Speed to allies in a 3×3 selected area |

These effects influence the next three combat rounds rather than reordering the
current one. New speed effects replace existing ones; they do not stack. Rest
clears them. Aren's copies scale with mastery, and learning Chorus requires
mastered Haste.

Mira's automatic modes are Support, Attack, Guard, Follow, and Conserve. Support
heals wounded allies before using offensive magic when MP permits; Attack
prioritizes offense; Guard holds position and protects; Follow spends no skill
resources; Conserve heals as needed without offensive casting. If Aren falls,
the player can wait to let Mira act or command a learned revival spell. Full
party defeat triggers the return-to-town recovery behavior.

## Presentation and player information

Party status is stacked at the upper left, with **red HP**, **green SP**, and
**blue MP** bars, numeric values, levels, and in-combat Speed. A narrow field menu inspired
by Pokémon provides party details, options, skills, loadout, potions, companion
behavior, and save/load access. Basic slashes, spell effects, and floating
numbers show party and enemy actions on the map.

Conversations use anime portraits in a visual-novel layout. The person being
addressed appears on the right. When talking to the steward, Aren is in front
of Mira on the left, closer to the center. Portraits meet the dialogue box
without background showing through their interiors. Generic male and female
villager portraits have shadowed faces.

Aren's visual identity includes brown hair, a blue tunic, red scarf, leather
equipment, and a longsword at his left waist, with its straight body behind his
waist. Mira has blonde hair, purple eyes, white/green priestess clothes, gold
trim, and relaxed overlapping hands in her portrait. Her requested visual
reference was Elise Katharina von Hohenheim from *Hachi-nan tte, Sore wa Nai
deshou!*. The current overworld walking sprites were generated to match these
project portraits, using large heads and compact bodies to match map NPCs. Source images and prompts are recorded in the art manifest.

## Saves, defeat, and testing aids

Autosaves are created at combat start, combat end, and area entry, with additional
saves for rest and other milestones. The latest autosave is slot 0, and manual
saving uses slot 1. Separate rolling files retain the combat-start, combat-end,
and area-entry checkpoints.

The default defeat behavior is recovery in town with progress retained. The
prototype returns the party to Briar Glen, restores it, preserves levels,
learning, practice, inventory, gold, quest progress and defeated enemies, and
heals surviving enemies. A later multi-town game would need a stored last-town
destination. Old-save migration support has been removed; begin a new game
after incompatible updates.

A temporary second Goddess statue toggles access to all of Aren's skills for
testing. This “God Mode” does not provide invulnerability or free resources.
Turning it off restores normal skill availability and loadout. It does not
represent a story unlock or replace the intended learning loop.

## Remaining design space

The prototype does not yet contain additional heroines, a full campaign,
story-specific unique spell unlocks, separate understanding/proficiency tracks,
penalties for attacking villagers, or final balance. These are future design
areas rather than promised completed features. Pokémon and JRPG references
describe interaction goals; the game uses its own cast and shrine adventure.

For current controls, test commands, and implementation details, see the
[prototype guide](../src/FIRST_JOURNEY.md) and [repository README](../README.md).
