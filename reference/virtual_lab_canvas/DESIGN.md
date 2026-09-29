---
name: Virtual Lab Canvas
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e7'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ededfb'
  surface-container-high: '#e7e7f5'
  surface-container-highest: '#e1e1ef'
  on-surface: '#191b25'
  on-surface-variant: '#484554'
  inverse-surface: '#2e303a'
  inverse-on-surface: '#f0effe'
  outline: '#787585'
  outline-variant: '#c9c4d6'
  surface-tint: '#5d47cd'
  primary: '#5b44ca'
  on-primary: '#ffffff'
  primary-container: '#745fe5'
  on-primary-container: '#fffbff'
  inverse-primary: '#c8bfff'
  secondary: '#9f420a'
  on-secondary: '#ffffff'
  secondary-container: '#fd894f'
  on-secondary-container: '#6c2800'
  tertiary: '#00694f'
  on-tertiary: '#ffffff'
  tertiary-container: '#008564'
  on-tertiary-container: '#f5fff8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#1a0064'
  on-primary-fixed-variant: '#452ab4'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb694'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#7b2f00'
  tertiary-fixed: '#64fcc9'
  tertiary-fixed-dim: '#40dfae'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#00513c'
  background: '#faf8ff'
  on-background: '#191b25'
  surface-variant: '#e1e1ef'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-capsule:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an approachable, playful, yet structurally rigorous design narrative tailored for database education and interactive computer science laboratories. Blending tactile ed-tech warmth with developer utility, the UI removes the intimidation barrier of distributed systems, indexing theory, and query execution. 

The aesthetic is characterized by:
- **Playful Structural Framing:** High-radius nesting cards, soft pill badges, and organic capsule metrics set against crisp surfaces.
- **Deep Contrast Chrome:** A dark navy/charcoal command anchor (`#1E202A`) framing a buoyant, illuminated canvas (`#F4F5FA`).
- **Chromatic Segmenting:** Saturated pastel accent tiles (lavender, warm papaya, solar yellow, and fresh mint) used purposefully to demarcate database models, query stages, and latency profiles.
- **Developer Affordances:** Strict, monospaced query panels harmonized with friendly geometric type, balancing playground joy with technical precision.

## Colors

The palette establishes an upbeat learning atmosphere without sacrificing contrast or legibility.

### Palette Architecture
- **Primary (`#7C68EE` / Soft Lavender Purple):** Directs the primary eye path, powering brand actions, active queries, schema links, and selected states.
- **Secondary (`#FF8A50` / Warm Papaya Orange):** Reserved for metrics, progress milestones, execution time highlights, and key educational rewards.
- **Tertiary (`#38D9A9` / Soft Mint):** Signals successful query resolutions, cluster health, and index efficiency markers.
- **Neutral Core (`#1E202A` / Midnight Charcoal):** Acts as the solid master shell header and deep focal surface for code snippet editors and high-priority action pills.
- **Support Tone (`#FFC837` / Solar Yellow):** Accents warnings, intermediate index hints, and gamified streak capsules.
- **Canvas & Surface System:** 
  - Outer viewport background: `#ECEEF6`
  - Inner workspace canvas: `#F4F5FA`
  - High-elevation cards: `#FFFFFF`
  - Outlines & dividers: `#E8EAF3`

## Typography

The type system balances rounded humanist forms with precision monospace rendering.

- **Plus Jakarta Sans** provides a friendly, welcoming aura with wide apertures and gentle geometry. Headlines command confidence at tight tracking (`-0.02em`), while body text maintains airy line heights for instructional material.
- **JetBrains Mono** handles all technical artifact display—including MongoDB collection structures, JSON pipelines, indexes, and terminal inputs—retaining crisp horizontal alignment within pill containers.

## Layout & Spacing

The layout follows a stacked, nested-capsule model across a 12-column adaptive grid.

- **Master Floating Frame:** Content resides within a broad, high-radius outer boundary (`28px` to `32px` corner curvature) embedded on the viewport canvas with `margin` breathing room.
- **Grid Architecture:** 
  - Desktop: 12-column fluid grid, `1.25rem` gutters, containing 3 major dynamic zones (Lab Explorer / Active Interactive Bench / Contextual Metrics & Roadmap).
  - Tablet (768px - 1024px): 8-column layout with pinned bottom navigation replacing the top pill bar.
  - Mobile (< 768px): 4-column single-stream stack with vertical scroll sections and horizontal gesture carousels for metric capsules.
- **Padding Philosophy:** Cards use generous interior air (`space-md` to `space-lg`) to preserve light, floating separation among dense metric readouts and query outputs.

## Elevation & Depth

Visual depth is achieved through ambient, chromatic drop-shadows combined with soft outline definitions rather than harsh blurs or flat opaque borders.

- **Level 0 (Canvas Base):** Flat `#F4F5FA` surface.
- **Level 1 (Structural Cards):** Solid `#FFFFFF` surfaces with a 1px border (`#E8EAF3`) and diffuse multi-layered ambient shadow: `0 8px 24px -4px rgba(30, 32, 42, 0.04), 0 2px 6px -1px rgba(30, 32, 42, 0.02)`.
- **Level 2 (Interactive Floating Modules & Top Pill Header):** Dark slate surface (`#1E202A`) or elevated action elements, cast with directional depth: `0 12px 32px -6px rgba(19, 20, 27, 0.16)`.
- **Level 3 (Popovers, Tooltips & Schema Drawers):** `0 20px 40px -8px rgba(30, 32, 42, 0.18)` bordered by 1px translucent ring (`rgba(255, 255, 255, 0.2)` on dark or `#E8EAF3` on light).
- **Chromatic Glow:** Accent cards (such as progress capsules or hero banners) project localized 5% to 8% colored ambient undertones matching their fill hex.

## Shapes

The design system embraces an exaggerated pill-and-capsule curvature profile:

- **Full Pill (`9999px`):** Used universally for filter chips, metric badges, progress bars, interactive buttons, floating nav pods, and query condition pills.
- **Major Containers & Cards (`24px` to `32px`):** All major educational modules, charts, and query environments use sweeping, friendly corner radii.
- **Nested Controls (`14px` to `18px`):** Inner cards and code terminal viewports step down curvature gracefully to avoid visual distortion when nested inside parent panels.

## Components

### Top Command Island (Navigation)
- Distinct dark charcoal (`#1E202A`) pill container floating at the top edge.
- Hosts pill segment controls: active tab is isolated inside a pill shape with a soft contrasting background (`#2A2D3A`), accompanied by vibrant pastel icon indicators.
- User profile element terminates in a circular avatar ring paired with a dual-toned pill status badge.

### Action Buttons
- **Primary:** Full pill radius (`9999px`), bold lavender (`#7C68EE`) fill, white Plus Jakarta Sans text. On hover, shifts to `#6B56E8` with a soft lift.
- **Directional Icon Button:** Circular (`44px` x `44px`) dark or pastel button housing a centered directional arrow, positioned at card corners for navigational prompts.
- **Secondary / Ghost:** White surface with 1px border (`#E8EAF3`), dark text, transitioning to `#F4F5FA` on press.

### Metric Capsules & Progress Indicators
- **Vertical Pill Bars:** Segmented pill tracks with custom patterned fills (e.g., diagonal micro-stripes) demarcating completed versus pending stages.
- **Horizontal Progress Pill:** Light pastel track backing a saturated bar, rounded to full pill caps on both ends.
- **Metric Badges:** Dual-element pills featuring a circular icon badge joined to a data readout (e.g., orange circle with book icon + "78 Lessons").

### Code & Query Playground
- Enclosed inside an inner rounded card (`20px` radius) with a dark (`#13141B`) or clean crisp off-white background.
- Employs **JetBrains Mono** typography.
- JSON key-value pairs formatted with pastel syntax highlights matching the brand system (lavender keys, mint values, orange operators).

### Input Fields & Search Bars
- Pill-shaped (`9999px`) search and query inputs with recessed interior background (`#FFFFFF` or `#ECEEF6`), framed by a subtle 1px border (`#E8EAF3`).
- Left-aligned rounded pastel icon capsule; right-aligned keyboard shortcut tag in monospace.
- Focus state activates a 2px lavender glow (`#7C68EE`) with zero outline break.

### Form Controls (Checkboxes & Radios)
- Checkboxes: `20px` squircle shapes (`6px` radius) that transition from neutral grey border to solid `#7C68EE` with an animated white checkmark.
- Radio buttons: Outer circle framing an inner solid circle dot upon selection, surrounded by a faint pastel glow.