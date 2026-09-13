# Cozy TTRPG GM Dashboard

## Goal
Build one polished dashboard page focused on fast in-session access to sound effects, notes, and character summaries, while keeping scene, lighting, and music controls compact.

## Interface
- Persistent current-scene strip with atmospheric artwork, scene title, and compact scene/lighting/music controls.
- Primary work area split between a large soundboard and a unified notes panel, each clearly separating scene-specific items from campaign-wide items.
- Pin-ready character summaries for PCs and NPCs, prioritized for the current scene with general characters available nearby.
- Mobile layout that preserves the same action-first hierarchy and keeps frequently used controls within easy reach.
- Warm pastel visual system with friendly typography, crisp information density, subtle paper texture, and restrained motion.

## Interaction
- Scene/general filters across sound, notes, and characters.
- One-shot effects trigger independently; loops visibly toggle and can overlap.
- Music behaves as a single active track with play/pause and volume controls.
- Notes can be written into one unified notes area and tagged to the current scene or campaign.
- Character summaries can be pinned and dismissed on-screen.
- Secondary scene and lighting choices open focused dialogs.

## Technical details
- React, Tailwind CSS v4, and existing shadcn components only.
- Local demo state only; no database, authentication, integrations, uploads, or persistence.
- Semantic design tokens in the global stylesheet and route-specific social metadata.
- Generated original scene artwork bundled with the page.
