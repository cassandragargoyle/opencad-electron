# About Banner Image Prompt

## Overview

Prompt for generating the banner image shown at the top of the Help → About window.
The style follows the About banner of SweetHome Studio
(`sweethome-studio/apps/web/src/assets/about-banner.webp`): a photorealistic, wide,
dusk-lit scene where glowing lines connect the physical world with the design on screen.

## Target Format

- Final size: **1920 × 685 px** (aspect ratio ~2.8 : 1), saved as WebP
- Generate the widest landscape format available (e.g. 1536 × 1024) and crop to 1920 × 685;
  keep all important content inside the middle horizontal band so the crop is safe
- No text, no logos, no watermarks

## Prompt

```text
Create a photorealistic, ultra-wide panoramic banner image (cinematic 21:9 or wider composition,
it will be cropped to 1920x685 px, so keep all important content in the central horizontal band).

Scene: a modern architect's studio at dusk, warm interior lighting contrasted with the deep blue
evening sky outside. The image tells the story "from design to building" in one continuous scene,
read from left to right:

- Left: a large physical architectural scale model of a contemporary multi-storey building made of
  white card and light wood, standing on a side table, softly lit from above. Next to it rolled-up
  technical drawings and a set square.
- Center: a wooden desk with an open silver laptop. The laptop screen shows a clean, light-themed
  CAD/BIM application with a 3D model of the same building (walls, slabs, windows, roof), a floor
  plan panel and a properties panel on the side. The UI is generic and abstract, with no readable
  text or brand names. On the desk: a printed floor plan with dimension lines, pencils, a scale
  ruler and a smartphone.
- Right: a large floor-to-ceiling window revealing the real, finished building from the model,
  illuminated at dusk, with a partially built neighbouring structure and a construction crane
  silhouetted against the evening sky.

Thin glowing lines of light (cool blue and warm white, with small bright nodes where they bend)
run through the scene and connect the scale model, the 3D model on the laptop screen and the real
building outside, suggesting that the design, the documentation and the construction are one
connected system.

Style: high-end architectural photography, shallow depth of field with a softly blurred plant in
the left foreground, realistic materials (wood, glass, concrete, paper), balanced composition,
calm and professional mood, color palette of deep navy blue, warm amber and clean white.

Do not include any text, letters, logos, brand names or watermarks anywhere in the image.
```

## Usage

- Save the result as `assets/about-banner.webp` (1920 × 685 px)
- Alt text for the About window: "An architectural scale model, a 3D building model on a laptop and
  the finished building outside the window, joined by glowing lines"
