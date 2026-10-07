# Orbital Defender

**Orbital Defender** is a browser-based orbital gunship defense game focused on target identification, precision fire support, and protecting friendly units.

It shares some targeting, impact-feedback, mobile-control, and tactical-terminal DNA with Graph War, but it is a separate game with its own core loop.

## V0.2 — Tactical Diorama / Full Fire-Control HUD

Current prototype direction:

- orbiting oblique camera around a fixed tactical board
- flat graph-board battlefield with raised pseudo-3D avatars and structures
- outlined convoy, hostile vehicle, AA, radar, bunker, building, tree, crate, and barrier silhouettes
- direct tap / drag reticle targeting
- target identification states: **UNIDENTIFIED → TRACKING → CONFIRMED HOSTILE**
- visible descending ordnance with near-3D projectile trails
- distinct weapon silhouettes, ammo counts, cooldowns, heat, stability, blast radius, and impact ETA
- three weapon classes:
  - **40mm AUTO** — fast, precise, low damage
  - **105mm HE** — slower, heavier area damage
  - **GUIDED STRIKE** — long-cycle, high-damage precision ordnance
- unmistakable result feedback for hostile hit, target destroyed, structure hit, miss, and friendly fire
- mission, orbit, attack-window, sensor, threat, friendly, and system-status telemetry
- incoming enemy pressure and convoy survival objective
- mobile-first pointer controls with text-selection suppression

## Goal

Protect the convoy while scanning, confirming, and eliminating hostile contacts. Avoid friendly fire.

## Controls

- **Tap / drag battlefield:** move the targeting reticle
- **SCAN / ID:** advance the selected contact's identification state
- **Weapon cards:** choose 40mm, 105mm, or guided strike
- **FIRE:** launch selected ordnance toward the reticle

## Status

Early playable prototype.
