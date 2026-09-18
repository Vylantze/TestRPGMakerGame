# Aren longsword correction

## Left-waist placement correction (current)

Source: `src/img/pictures/ArenPortrait-v2.png`, preserved unchanged.
Final: `src/img/pictures/ArenPortrait-v3.png`, generated with the built-in image tool.
The pommel projects toward viewer right at Aren's left hip. The aligned scabbard extends down-left behind his waist, occluded by his tunic. The runtime dialogue mapping uses v3.

Prompt:

Use case: precise-object-edit. Edit the supplied Aren portrait. Correct ONLY the sword placement, belt attachment and resting hand contact. User's exact requirement: sword at Aren's anatomical LEFT waist (viewer RIGHT); pommel toward image RIGHT, scabbard/body toward image LEFT, with the sword body BEHIND Aren's waist. Remove the current front-hanging sword completely. Place a single sheathed longsword suspended at his left hip, hilt projecting diagonally UP-RIGHT from its crossguard on the right side of his waist; the straight scabbard runs from that same crossguard diagonally DOWN-LEFT BEHIND his hips and tunic. His opaque body and clothing must OCCLUDE the middle of the scabbard: do not draw a scabbard across the front of his belt, abdomen or thighs. Only a small continuation may emerge behind his opposite hip on viewer left. Pommel, long two-handed grip, crossguard center and scabbard all lie on one consistent straight axis sloping down-left. Clearly a longsword, not a dagger. Keep his resting left hand natural at the hilt/hip. Preserve exact face, expression, hairstyle, blue tunic, red scarf, leather equipment, outstretched right hand, body pose, head-to-thigh crop, scale, colors and anime rendering. Genuine alpha-transparent background, opaque character silhouette. No scenery, text, duplicated weapons or extra hands.

## Previous proportions correction

- Source: `src/img/pictures/ArenPortrait.png` (original preserved).
- Final runtime asset: `src/img/pictures/ArenPortrait-v2.png`.
- Method: built-in image generation, precise-object edit of the original generated portrait; no external artwork imported.
- Changes: elongated two-handed grip, substantial crossguard, and straight scabbard aligned along the same axis. Preserved face, clothing, pose, framing, and transparent silhouette.
- The dialogue portrait mapping uses the new version. The shared `assets/` library was not modified.

## Final prompt

Use case: precise-object-edit. Edit target: the supplied existing anime portrait of Aren. Correct ONLY the sword and its immediate belt attachment/hand overlap as needed. Replace the stubby, crooked dagger-like weapon at his left hip (viewer right) with a convincingly full-sized sheathed longsword. The pommel, elongated two-hand leather grip, center of the crossguard, and long straight scabbard MUST share one continuous straight axis, angled gently down toward the lower right. A substantial straight symmetrical crossguard, grip long enough for two hands, and a scabbard that continues beyond the bottom crop establish longsword proportions. Do not bend or offset the scabbard relative to the hilt. Keep his resting hand anatomically natural beside/on the scabbard, not through the weapon. Preserve Aren's exact face, hairstyle, expression, pose, blue tunic, red scarf, leather straps, open outstretched hand, colors, anime linework, shading, and original portrait framing. Output a PNG character cutout with genuine transparent alpha outside his silhouette, opaque character interior, no dark gradient backdrop, no checkerboard or scenery. Keep the same head-to-thigh composition; do not shrink the character to show the entire sword.
