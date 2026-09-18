# Aren and Mira overworld sprites — v1

Created with the built-in imagegen tool for this project on 2026-09-19.
No third-party sprite sheets or files from the read-only shared assets library
were used. The existing project portraits supplied the character references.

## Sources and outputs

- Aren reference: `src/img/pictures/ArenPortrait-v4.png`
- Mira reference: `src/img/pictures/MiraPortrait.png`
- Original generated Aren sheet: `Addons/FirstJourneyArt/Aren-walk-source-v1.png`
  (generated file `exec-516e7459-b135-4e23-83d5-db94e7204b0d.png`)
- Original generated Mira sheet: `Addons/FirstJourneyArt/Mira-walk-source-v1.png`
  (generated file `exec-8ba4aaa4-8e6d-44d4-a415-3fb77e5c0388.png`)
- Runtime sheets: `src/img/characters/$ArenJourney-v1.png` and
  `src/img/characters/$MiraJourney-v1.png`.

The source images are retained unchanged. `tools/pack-first-journey-sprites.cjs`
finds the four sprite rows, crops transparent frame padding, scales all frames
of each character uniformly with nearest-neighbor sampling, centers each frame,
and aligns the feet inside 48×48 cells. The result is a standard MZ 3×4 sheet
(144×192), with down/left/right/up rows and walk/idle/walk columns. RGBA alpha is
preserved. This is mechanical sprite-sheet packing; no portrait was edited.

## Generation prompts

### Aren

Use case: stylized-concept. Create a production RPG Maker MZ overworld walking sprite sheet for Aren based on the supplied portrait (reference identity and outfit only). Transparent background, no text, no grid lines, no shadows outside character. EXACT 3 columns by 4 rows of equal cells. All twelve full-body chibi pixel-art sprites same size centered within cells, generous transparent margins. Row1 faces DOWN toward viewer, row2 LEFT profile, row3 RIGHT profile, row4 UP back view. Each row: left foot forward, neutral standing, right foot forward. Brown tousled hair, royal blue tunic with white trim, red neck scarf, brown leather diagonal strap gloves belt boots, dark trousers, sheathed longsword at his anatomical left waist behind him. Friendly young swordsman. Crisp low resolution pixel art appropriate to a 48x48 tile game, character about 42px tall when scaled to 48px cells. Layout must be exact aligned uniform 3x4 and retain consistent foot baseline per row. Output a portrait 3:4 aspect sprite sheet, 768x1024 preferred. This is a NEW sprite asset, do not modify portrait.

### Mira

Use case: stylized-concept. Create NEW production RPG Maker MZ overworld walking sprite sheet for Mira using portrait as identity/outfit reference only. Exactly 3 columns x 4 rows equal cells, transparent background, no grid lines no text no labels no scenery no shadows outside character. All twelve full-body chibi pixel-art sprites same size centered in cells, foot baseline consistent. Row1 facing DOWN toward viewer; row2 LEFT profile; row3 RIGHT profile; row4 UP back view. Columns for each row: left foot forward / neutral standing / right foot forward. Mira is a blonde priestess with long golden hair, purple eyes, white veil edged with sage green and gold, white robes with green stole and gold edging, violet bow at chest, small golden star pendant, brown shoes just visible under hem. Arms down naturally walking, unarmed. Charming crisp pixel art for 48x48 tiles, final character about42px high in48px cell. Uniform aligned grid with generous margins around each sprite, equal apparent scale every frame. Portrait3:4 canvas preferred768x1024. No portrait changes.
