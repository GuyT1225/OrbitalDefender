# Orbital Defender — Main Menu & Pre-Flight Identity (Approved Direction)

Status: visual direction approved by user, October 9, 2026. Concept sketches, not final production assets.

## Identity
A grounded operator/crew perspective from inside an orbital gunship command and weapons bay. Minimalist, angular, slightly edgy tactical UI; influenced by classic command-and-control RTS presentation without copying another game's interface. Avoid generic sci-fi neon, heavy HUD clutter, or requiring photorealistic assets.

Visual language: dark gunmetal, charcoal, olive, pale green optics, restrained amber/alert-red; angular brackets, sparse technical labels, fine linework, crew silhouette, gun/ammunition feed, operator workstation, and a glimpse of the plateau battlefield. The story is carried by a human crew and physical machinery, not just an abstract map.

## Main screen
- Title: ORBITAL DEFENDER.
- Visible operator station + weapons bay establishes whose perspective player is inhabiting.
- START MISSION is the primary action. Training / Loadout / Options are future interfaces; do not represent them as finished gameplay.
- On mobile, prioritize legible controls and compact composition over exact widescreen art.

## Pre-flight screen
- Transition: main menu → pre-flight systems → deployed battlefield.
- AUDIO COMMS check is functional. Safari WebAudio must reach `running` after an explicit user gesture before declaring ready.
- Supporting checks: TARGETING OPTICS, ORBIT STABILIZATION, WEAPON FEED, FIRE CONTROL, BATTLEFIELD LINK. Present these as simulated checks, not fake measured diagnostics.
- Use short radio click / restrained mechanical audio as confirmation. No fixed countdown pretending sound is ready.
- Allow BEGIN DEPLOYMENT only after audio is ready, or provide an explicit continue-muted option in a future design.
- Integration should replace the technical audio-unlock modal, not add a second onboarding layer.

## References
User-provided AC-130 crew compartment, operator, gun feed and loading photographs, October 9. Visual concept studies generated in this conversation: cinematic main menu and matching pre-flight system check. Images are *directional references*, not yet checked in as game assets.
Avoid using actual US military identities or unit insignia as fictional in-game claims.

## Next integration
Keep the existing game on main unchanged. Consolidate proven experimental mechanics from Study 05.6 into a standalone vertical slice: world-space Gatling, touch-hold aim/fire, optical PIP, stable orbit/manual rotation, improved mesa and audio activation through pre-flight. Prioritize reliability; do not merge prototype wholesale into Arcade mode until validated.
