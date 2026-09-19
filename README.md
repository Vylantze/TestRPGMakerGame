# First Journey: The Abandoned Shrine

A fantasy RPG Maker MZ prototype about Aren, a novice adventurer who learns his
own versions of skills by observing allies and enemies. He and his childhood
friend Mira explore a goblin-occupied shrine in a turn-based overworld, with no
separate battle scene.

Open **`TestProject/` as the workspace root**. The playable MZ project is in
**`src/`**; the former `Project1/` directory name is no longer current.

## Play

1. Open `src/game.rmmzproject` in RPG Maker MZ.
2. Choose **Playtest** (`Ctrl+R`), then **New Game**.
3. Speak to the guild steward in Briar Glen, enter the shrine through the eastern
   wall opening, defeat the nest leader, and return to the guild.

Arrow keys turn/walk; **A** opens skills; **Enter** interacts; **Space** waits.

Outside combat, only Aren receives player commands; Mira acts automatically.
Tab retains the direct-command preference for future combat encounters.

**Tab** toggles Mira's automatic/direct commands; **Esc** opens the field menu.
In combat, direct mode collects Aren's action and then Mira's before resolving the round
in Speed order. Exploration resolves immediately. Combat opens
Move / Skill / Guard / View Turn Order commands. Cancel enters persistent Move;
Enter reopens combat commands, while Esc in Move opens the field menu. A face-based initiative
timeline shows execution order; selecting an actor highlights their map location. Directional
skills can be rotated with arrows during targeting. Legacy-save migration is
not supported.

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
to 1 at every combat start. The separate Stats window shows cumulative combat
rounds and successful exploration steps; turns, blocked moves, casts, waits,
and follower steps do not add exploration steps.

Targeted AoEs use compact or wide circular areas (up to five tiles across each axis).
Higher tiers offer both compact, powerful attacks and wider, weaker variants.
The skill menu remembers each character’s last selected skill across targeting
cancellation and reopening, and stores the choice in saves.

## Skill data and Stats

The field menu’s **Stats** item opens lifetime combat rounds and exploration
steps. The skill journal displays tier-coloured proficiency bars.

`src/js/plugins/Skills.json` contains the current 74-skill catalogue;
`src/data/Skills.json` is its generated RPG Maker editor export. The original
database is archived in `Addons/FirstJourneyBackup/SkillArchive/`. See
[skill catalogue and tuning](docs/SKILL_CATALOGUE.md) for sources, prerequisites,
balance, omissions and regeneration instructions. Start a New Game for the
new counters and catalogue; legacy-save migration remains unsupported.

## Documentation

- [Lore and game design](docs/GAME_DESIGN.md): original concept, characters,
  copying abilities, progression, resources, combat, presentation, and future scope.
- [Prototype guide](src/FIRST_JOURNEY.md): controls, current tuning, saves, and
  implementation details.
- [Conversation log](docs/conversation-log.txt): chronological user/assistant
  text and clarification questions, with credentials redacted.
- [Agent instructions](AGENTS.md): development, asset, logging, and Git policy.
- [Art sources](Addons/FirstJourneyArt/ART_SOURCES.md) and
  [walking-sprite provenance](Addons/FirstJourneyArt/Overworld-sprites-v3.md).

## Repository layout

```text
TestProject/
├── README.md
├── AGENTS.md
├── .gitignore
├── docs/
│   ├── GAME_DESIGN.md
│   └── conversation-log.txt
├── src/                         Playable RPG Maker MZ project
│   ├── game.rmmzproject         Open this in the MZ editor
│   ├── index.html               Browser/NW.js entry point
│   ├── package.json            NW.js window/runtime configuration
│   ├── FIRST_JOURNEY.md
│   ├── data/                   Maps, actors, system, and MZ database JSON
│   ├── js/
│   │   ├── rmmz_*.js           Supplied engine scripts
│   │   ├── libs/               Runtime libraries
│   │   ├── plugins.js          Enabled plugin list
│   │   └── plugins/            FirstJourneyRules, FirstJourney, Presentation
│   ├── img/                    Runtime art, portraits, and walking sprites
│   ├── audio/  effects/  movies/  fonts/  css/  icon/
│   └── save/                   Local saves and settings; ignored by Git
├── tools/                      Generation, testing, and commit/log helpers
└── Addons/
    ├── FirstJourneyArt/         Source art, prompts, and provenance
    ├── FirstJourneyBackup/      Preserved original starter-project data
    └── FirstJourneyQA/          Playtest screenshots
```

The shared source library is outside the repository at **`../assets/`**. It is
read-only: read, reference, or copy assets, but do not modify their files or
metadata. Save derivatives under a new versioned name in `src/img/` or an
appropriate runtime directory, or create `Addons/EditedAssets/` when needed.
Record their source and changes in the art documentation. This is a workflow
policy, not a change to Windows filesystem permissions.

## Build and test

Run commands from `TestProject/`. There is no npm build pipeline; `src/package.json`
is the game runtime configuration.

```powershell
# Rebuild the three editor-readable maps and related generated data.
node tools/build-first-journey.cjs
node tools/build-test-skills.cjs

# Pure Node.js rules, sequential turns, and complete expedition checks.
node tools/test-first-journey.cjs
node tools/test-first-journey-turns.cjs
node tools/test-first-journey-catalogue.cjs
node tools/test-first-journey-expedition.cjs

# Real MZ browser playtest, including input, UI, targeting, and save/load.
node tools/test-first-journey-engine.cjs
node tools/test-first-journey-sprites.cjs

# Check conversation filtering and credential redaction.
node tools/test-conversation-log.cjs
```

The map generator reads the shared grids in `src/js/plugins/FirstJourneyRules.js`
and writes Maps 001–003, MapInfos, selected actor/system fields, and the enabled
plugin list. Review changes before rebuilding; edits to generated map tiles
alone do not change the custom rules' collision grid.

The engine test requires Chrome and Playwright. It currently imports Playwright
from the local bundled runtime at
`C:/Users/digi9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/`.
Adjust that import for another machine. It serves `src/` on loopback, uses
isolated browser storage, and writes screenshots to `Addons/FirstJourneyQA/`.
It does not use the native MZ playtest's `src/save/` files.

`node tools/pack-first-journey-sprites.cjs` regenerates the two 144×192 walking
sheets from the preserved generated source images. It uses Sharp from the same
local bundled runtime; its import also needs adapting on another machine.
Use MZ's **Deployment** workflow to prepare a distributable build. Existing
RPG Maker engine/art assets remain subject to their original licenses.

## Conversation logging and agent commits

Local agent commits may be made without further approval. **Every push requires
explicit user approval.** Agent author and committer are `Codex Agent
<mira.dev.agent@gmail.com>`; pushes use the authenticated `Mira-Dev-Agent`
GitHub account. Keep personal Git identity unchanged and never commit saves or
credentials.

The repository-local `git agent-commit` alias invokes `tools/agent-commit.cjs`.
Immediately before committing, it refreshes and stages `docs/conversation-log.txt`,
then commits the already-staged task files using the agent identity. It stops
if the current transcript cannot be read. On a new checkout, install the alias:

```powershell
git config --local alias.agent-commit '!node tools/agent-commit.cjs'
```

Stage only the intended changes, then run `git agent-commit -m "Describe the change"`.
The wrapper uses `CODEX_THREAD_ID` to find the current local transcript under
`$CODEX_HOME/sessions`, or `~/.codex/sessions` when `CODEX_HOME` is unset. It preserves
previous task sections and refreshes the current one, without duplicating it.

For a standalone log refresh, run:

```powershell
node tools/update-conversation-log.cjs
# Or provide an exact local transcript path:
node tools/update-conversation-log.cjs --session <path-to-rollout.jsonl>
```

The text export includes visible user/assistant messages and clarification
questions. It excludes tool traces, internal instructions, hidden reasoning,
and binary images; credentials and password suggestions are redacted. The
pre-commit cutoff is recorded. A final reply written after a commit is captured
at the next refresh. The agent must review the staged log for sensitive material
and ensure it is updated before every commit, including when an alternative
Git command is necessary. The helper neither pushes nor grants push approval.
