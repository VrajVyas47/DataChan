# ADR 006: Semantic Multi-Theme Token Architecture

## Status
Accepted

## Context
Educational software must cater to different student preferences and lighting environments without maintaining distinct component hierarchies for each theme.

## Decision
Implement a semantic design token architecture using CSS Custom Properties and Tailwind CSS mapping. Support at least 5 themes (Lavender Light, Midnight Dark, Ocean Blue, Mint Lab, Sunset Amber). Each theme redefines root CSS variables without changing HTML structure or business logic. Themes are stored in the user's profile and browser localStorage.

## Consequences
- Single unified component codebase across all themes.
- High contrast accessibility across both light and dark variations.
- Instantaneous switching without page refreshes.
