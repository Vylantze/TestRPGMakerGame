# Repository Guidelines

## Project Structure & Module Organization

The playable RPG Maker MZ project is `src/`. Lore and design are documented
in `docs/GAME_DESIGN.md`; conversation history is in `docs/conversation-log.txt`. Open
`src/game.rmmzproject` in RPG Maker MZ to edit maps, events, and database records.
Runtime data lives in `src/data/` (`Map001.json`,
`Actors.json`, `System.json`, etc.); treat these JSON files as editor-managed
artifacts. Engine scripts are in `src/js/`, with project plugins in `src/js/plugins/`
(for example, `AltMenuScreen.js`). Art, audio, and visual effects belong in
`src/img/`, `src/audio/`, and `src/effects/`. Keep third-party downloads and reference
material in the repository-level `Addons/` directory; do not place archives in
the game project unless required at runtime.

## Build, Test, and Development Commands

There is no npm build pipeline. `src/package.json` configures the RPG
Maker/NW.js game window. Node.js helpers in `tools/` generate maps and run
rules, sequential-turn, expedition, browser-engine, and conversation-log tests.
See README.md for commands and local Playwright/Sharp dependencies.

- Open `src/game.rmmzproject` in RPG Maker MZ and use **Playtest** (`Ctrl+R`) to run the game.
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
playtest with the console open. Run the appropriate scripts under `tools/` for affected behavior. There is
no coverage target; do not rerun game tests for documentation-only changes.

## Commit & Pull Request Guidelines

This workspace is a Git repository. After each completed task that changes
project files, run the appropriate checks, review the diff, and summarize the
changes for the user. Local commits may be made at any time without further
user approval. Stage only files belonging to the task; preserve unrelated user
changes and never include player saves.
For every commit performed by this agent, use `Codex Agent` with email
`mira.dev.agent@gmail.com` as both author and committer. Preserve the user's
default Git identity. Local commits do not require a GitHub access token;
never store tokens in project files, commit messages, or Git remote URLs.
Before EVERY commit performed by this agent, refresh and stage
`docs/conversation-log.txt` with the current conversation's visible messages and
clarification questions. Preserve prior task sections. Redact access tokens,
passwords, keys, and other secrets; never copy raw session/tool/internal data.
Review the staged export for sensitive content. Do not invent missing messages.
The file records its pre-commit cutoff; post-commit replies enter the next refresh.
Use the repository-local `git agent-commit` alias, configured as
`!node tools/agent-commit.cjs`. This wrapper refreshes and stages the log before
calling Git with the agent author/committer identity. It aborts if the transcript
is unavailable. If the alias is absent, restore it as documented in README.md.
If another commit command is necessary, run `tools/update-conversation-log.cjs`
and stage the updated log immediately beforehand, then use the same identity.
Do not bypass this logging requirement. The wrapper never authorizes a push.
For agent pushes, authenticate as GitHub account `Mira-Dev-Agent` using Git
Credential Manager. This repository selects that account with local
`credential.https://github.com.username` and enables `useHttpPath` to scope
credential selection by repository. Never fall back to the user's personal
account if agent authentication or repository access fails.
Do not rewrite existing commits to change their authors unless requested.
Use concise imperative commit subjects (for example, `Add innkeeper dialogue`).
Do not create empty commits for tasks with no file changes. Pushes require
explicit user approval for the push; permission to commit does not authorize
a push. Report the commit hash after committing.
Keep unrelated assets and game-data changes out of the same commit.
Pull requests should describe player-
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
or the appropriate runtime directory under `src/`, such as
`src/img/pictures/MiraPortrait-v2.png`. Record the original source path
and modifications in the project's asset provenance documentation.

Do not commit player-specific files from `src/save/` (including `config.rmmzsave`).
Before adding media or plugins, confirm their license permits redistribution and
record required attribution in the PR description or project documentation.
