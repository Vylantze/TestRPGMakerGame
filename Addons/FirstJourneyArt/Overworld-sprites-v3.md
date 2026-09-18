# Walking sprite alignment v3

The v2 generated source artwork is unchanged: Aren-walk-source-v2.png and Mira-walk-source-v2.png in this directory. See [v2 provenance and original prompts](Overworld-sprites-v2.md) for generation inputs and licensing context. No files in the shared assets library were changed.

The corrected atlas packer selects each frame's main connected silhouette instead of including isolated stray pixels in its bounding box. It crops that frame, resizes with nearest-neighbor sampling to 44px height and at least 34px width, centers it horizontally in a 48px cell, and aligns its feet with the cell bottom. The Guild Steward and Provisioner reference frames in src/img/characters/People1.png reach 33px width and 44px height. Each party frame meets or exceeds those visible dimensions.

Runtime outputs: src/img/characters/$ArenJourney-v3.png and src/img/characters/$MiraJourney-v3.png. Previous atlases remain preserved. Rebuild using node tools/pack-first-journey-sprites.cjs v3; validate using node tools/test-first-journey-sprites.cjs. This change repairs mechanical atlas packing and scaling; it does not regenerate character artwork.
