# Frontend Specification

## 1. Design Language & Aesthetics
Data-Chan adopts a "Playful Structural Framing" design language combining tactile ed-tech warmth with developer utility:
- **Floating Command Island**: Fixed top pill navigation container with high z-index and subtle drop-shadow (`shadow-[0_12px_32px_-6px_rgba(19,20,27,0.24)]`).
- **High-Radius Containers**: Rounded corners (24px to 32px) on major structural cards.
- **Pill Controls**: 9999px border radius on filter chips, status badges, buttons, and search inputs.
- **Dual-Font System**:
  - Primary UI: **Plus Jakarta Sans** for approachable headlines and airy body text.
  - Technical Data: **JetBrains Mono** for MQL code editors, JSON viewers, latency metrics, and schema tokens.

## 2. Component Composition
- `TopCommandNav`: Floating header with active route indication, database connection status, user level/XP capsule, and theme switcher.
- `WorkspaceExplorer`: Hierarchical database and collection tree with document counters.
- `DocumentViewer`: Supports both friendly Card View, compact Table View, and syntax-highlighted JSON View.
- `FieldInspector`: Discovers fields dynamically without assuming a rigid relational schema.
- `MongoEditor`: Powered by Monaco Editor with MQL presets, formatting, and shortcut execution (`Ctrl+Enter`).
- `DataModelCanvas`: Powered by React Flow for designing MongoDB document structures (embedding vs referencing).
