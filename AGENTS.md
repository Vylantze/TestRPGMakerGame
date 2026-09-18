# Repository Guidelines

## Project Structure & Module Organization

The playable RPG Maker MZ project is `Project1/`. Open
`game.rmmzproject` in RPG Maker MZ to edit maps, events, and database records.
Runtime data lives in `data/` (`Map001.json`,
`Actors.json`, `System.json`, etc.); treat these JSON files as editor-managed
artifacts. Engine scripts are in `js/`, with project plugins in `js/plugins/`
(for example, `AltMenuScreen.js`). Art, audio, and visual effects belong in
`img/`, `audio/`, and `effects/`. Keep third-party downloads and reference
material in the repository-level `Addons/` directory; do not place archives in
the game project unless required at runtime.

## Build, Test, and Development Commands

There is no package build or test script. `package.json` configures the RPG
Maker/NW.js game window rather than npm tooling.

- Open `Project1/game.rmmzproject` in RPG Maker MZ and use **Playtest** (`Ctrl+R`) to run the game.
- Use the editor's **Deployment** workflow to produce a distributable build.
- For plugin changes, launch a new playtest and use the developer console to check for JavaScript errors.

## Coding Style & Naming Conventions

Follow the surrounding RPG Maker MZ JavaScript style: four-space indentation,
semicolon-terminated statements, `const`/`let` instead of `var`, and braces on
the same line as control statements. Use descriptive PascalCase plugin file
names, such as `TextPicture.js`; name plugin parameters consistently with their
existing metadata. Preserve RPG Maker's supplied `rmmz_*.js` files unless an
engine upgrade intentionally replaces them. Keep asset filenames stable and
match their exact case, because event and database references depend on them.

## Testing Guidelines

Manually test every changed event, map transfer, menu path, battle flow, and
save/load behavior affected by a change. Test from a new game and, when save
compatibility matters, from an existing save. Verify plugin changes in a clean
playtest with the console open. This project has no automated test framework or
coverage target.

## Commit & Pull Request Guidelines

No Git history is available in this workspace, so use concise imperative commit
subjects (for example, `Add innkeeper dialogue`). Keep unrelated assets and
game-data changes out of the same commit. Pull requests should describe player-
visible behavior, list modified maps/data/plugins, link the relevant issue when
available, and include screenshots or a short capture for visual/UI changes.
Mention any added asset's source and license.

## Configuration & Assets

The shared source library at `../assets/` (`D:/User/Workspace/RPGMaker/assets`)
is read-only, including all subfolders. Any asset there may be read, referenced,
or copied for this project. Never modify, overwrite, rename, move, delete, or
create files in that library; preserve source files and metadata. Extract
archives, generate previews, convert formats, and perform edits elsewhere.
Save edited assets as distinctly named new versions in `Addons/EditedAssets/`
or the appropriate runtime directory under `Project1/`, such as
`Project1/img/pictures/MiraPortrait-v2.png`. Record the original source path
and modifications in the project's asset provenance documentation.

Do not commit player-specific files from `save/` (including `config.rmmzsave`).
Before adding media or plugins, confirm their license permits redistribution and
record required attribution in the PR description or project documentation.
