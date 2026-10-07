# Orbital Defender

**Orbital Defender** is a browser-based orbital gunship defense game focused on target identification, precision fire support, and protecting friendly units.

This project grew out of the targeting, impact-feedback, mobile-control, and tactical-terminal ideas explored in Graph War, but it is a separate game with a different core loop.

## V0.1.0 — Sensor Sweep

The first playable baseline establishes:

- a continuously orbiting top-down tactical view
- direct tap / drag reticle targeting
- target identification states: **UNIDENTIFIED → TRACKING → CONFIRMED HOSTILE**
- friendly units that must be protected
- three ordnance classes:
  - **LIGHT** — fast, precise, low damage
  - **MEDIUM** — moderate reload and blast radius
  - **HEAVY** — large impact, long reload
- destructible cover / structures
- synthesized browser audio with no external runtime assets
- mobile-first controls and a retro tactical-terminal presentation

## Current goal

Protect the convoy while confirming and eliminating hostile contacts. Avoid friendly fire.

## Controls

- **Tap / drag battlefield:** move the targeting reticle
- **SCAN:** identify the nearest contact under the reticle
- **LIGHT / MEDIUM / HEAVY:** select ordnance
- **FIRE:** engage the selected point

## Status

Early prototype / proof of concept.
