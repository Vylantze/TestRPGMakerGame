# First Journey workspace

Open this `TestProject` folder as the workspace root.

- `Project1/`: playable RPG Maker MZ project. Open `Project1/game.rmmzproject` and use Ctrl+R to playtest.
- `tools/`: map generator, rules tests, expedition test, and engine playtest.
- `Addons/`: art provenance, original backups, QA screenshots, reference packs, and installers. These are not runtime assets.
- `AGENTS.md`: project contribution instructions.

The shared [`../assets/`](../assets/) folder is a read-only source library.
Its assets may be used in this project. Save edited versions outside that
folder, in `Addons/EditedAssets/` or the appropriate `Project1/` asset directory,
using a new versioned filename and recording its source. This is a project
workflow rule; it does not change Windows filesystem permissions.

Run from this directory:

```powershell
node tools/build-first-journey.cjs
node tools/test-first-journey.cjs
node tools/test-first-journey-expedition.cjs
node tools/test-first-journey-engine.cjs
```

The engine playtest uses the locally installed Chrome browser and bundled Playwright runtime. Tests store screenshots in `Addons/FirstJourneyQA/` and use isolated browser saves.

See [the prototype guide](Project1/FIRST_JOURNEY.md) for controls and mechanics.
