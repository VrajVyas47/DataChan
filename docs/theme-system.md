# Multi-Theme Token System

Data-Chan rejects hardcoded colors and rigid two-mode limitations in favor of a semantic CSS token system supporting 5 distinct themes:

## 1. Available Themes

| Theme ID | Name | Background | Primary Accent | Secondary Accent | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lavender-light` | Lavender Light | `#faf8ff` | `#5b44ca` | `#9f420a` | Default educational aesthetic with lavender & papaya |
| `midnight-dark` | Midnight Dark | `#13141b` | `#9b87f5` | `#ff8a50` | Developer dark mode with glowing accents |
| `ocean-blue` | Ocean Blue | `#0b1329` | `#2563eb` | `#06b6d4` | Deep marine blue with high readability |
| `mint-lab` | Mint Lab | `#f0fdf4` | `#059669` | `#84cc16` | Clean botanical green laboratory theme |
| `sunset-amber` | Sunset Amber | `#fffbeb` | `#d97706` | `#dc2626` | Warm terracotta, honey & amber tones |

## 2. CSS Custom Properties Contract
Themes inject variables into the `html[data-theme="..."]` root:
- `--color-bg`: Canvas background
- `--color-surface`: Base structural card surface
- `--color-surface-low`: Subtle background for nested modules
- `--color-surface-elevated`: High-elevation cards and popovers
- `--color-inverse-surface`: Navigation shell and code editor background
- `--color-inverse-text`: Text on navigation shell and code editor
- `--color-text`: Primary typography color
- `--color-text-muted`: Subtitles, outlines, and placeholders
- `--color-border`: 1px structural dividers and boundaries
- `--color-primary`: Brand accent and active selection states
- `--color-primary-text`: Text on primary buttons
- `--color-secondary`: Milestone, execution time, and XP highlights
- `--color-tertiary`: Mint success, cluster health, and index markers
- `--color-error`: Error pills and destructive actions

Tailwind CSS references these variables directly, ensuring that swapping themes recalculates every component instantaneously without page reload or duplicated components.
